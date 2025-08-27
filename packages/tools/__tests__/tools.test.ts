import { describe, test, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { Tool, ToolId, ToolManager } from '../src/index.js';
import { ResultSchema, ToolMetadataSchema } from '../../schemas/src';
import { afterEach } from 'node:test';

const MockInputSchema = z.object({
    message: z.string(),
    value: z.number().optional()
});

const MockOutputSchema = z.object({
    result: z.string(),
    processed: z.boolean()
});

class MockTool extends Tool<typeof MockInputSchema, typeof MockOutputSchema> {
    id = 'mock-tool' as const;
    name = 'Mock Tool';
    description = 'A mock tool for testing';
    category = 'Test';

    inputSchema = MockInputSchema;
    outputSchema = MockOutputSchema;

    async executeValidated(input: z.infer<typeof MockInputSchema>) {
        return {
            success: true as const,
            data: {
                result: `Processed: ${input.message}`,
                processed: true
            }
        };
    }
}

const initializeMock = vi.fn()

class MockToolWithInit extends Tool<typeof MockInputSchema, typeof MockOutputSchema> {
    id = 'mock-tool-init' as const;
    name = 'Mock Tool with Init';
    description = 'dfsf';
    inputSchema = MockInputSchema;
    outputSchema = MockOutputSchema;

    async initialize(context: any): Promise<void> {
        initializeMock()
    }

    async executeValidated(input: z.infer<typeof MockInputSchema>) {
        return {
            success: true as const,
            data: {
                result: `Processed: ${input.message}`,
                processed: true
            }
        };
    }
}

class MockFailingTool extends Tool<typeof MockInputSchema, typeof MockOutputSchema> {
    id = 'mock-failing-tool' as const;
    name = 'Mock Failing Tool';
    description = 'A tool that always fails';
    category = 'Test';

    inputSchema = MockInputSchema;
    outputSchema = MockOutputSchema;

    async executeValidated(): Promise<z.infer<typeof this.resultSchema>> {
        throw new Error('Tool execution failed');
    }
}

describe('Tool Base Class', () => {
    let tool: MockTool;

    beforeEach(() => {
        tool = new MockTool();
    });

    describe('Tool Properties', () => {
        test('should have required properties', () => {
            expect(tool.id).toBe('mock-tool');
            expect(tool.name).toBe('Mock Tool');
            expect(tool.description).toBe('A mock tool for testing');
            expect(tool.category).toBe('Test');
            expect(tool.inputSchema).toBe(MockInputSchema);
            expect(tool.outputSchema).toBe(MockOutputSchema);
        });

        test('should generate correct result schema', () => {
            const resultSchema = tool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    result: 'result string',
                    processed: true
                }
            };

            const parseResult = () => tool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

    describe('Tool Execution', () => {
        test('should execute with valid input', async () => {
            const input = { message: 'test message' };
            const result = await tool.execute(input);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.result).toBe('Processed: test message');
                expect(result.data.processed).toBe(true);
            }
        });

        test('should validate input schema', async () => {
            const invalidInput = { wrongField: 'test' };
            const result = await tool.execute(invalidInput);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('message');
                expect(result.error.code).toBe('TOOL_EXECUTION_ERROR');
            }
            expect(result).toMatchSnapshot();
        });

        test('should handle optional input fields', async () => {
            const input = { message: 'test', value: 42 };
            const result = await tool.execute(input);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.result).toBe(`Processed: ${input.message}`);
            }
        });
    });
});

describe('ToolManager', () => {
    let toolManager: ToolManager;

    beforeEach(() => {
        toolManager = new ToolManager();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Tool Discovery and Registration', () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        test('should auto-discover tools from loaders', async () => {
            const mockToolLoader = () => Promise.resolve(MockTool);
            await toolManager.autoDiscoverTools([mockToolLoader]);

            const tools = await toolManager.getTools();
            expect(tools).toHaveLength(1);
            expect(tools[0].id).toBe('mock-tool');
        });

        test('should validate tool metadata during discovery', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const { mockParse } = vi.hoisted(() => {
                return {
                    //Mock ToolMetadataSchema.parse but keep original behavior (should not add an invalid tool to the manager)
                    mockParse: vi.fn((input) => ToolMetadataSchema.parse(input))
                }
            });

            vi.mock('@app/schemas', async (importOriginal) => {
                const mod = await importOriginal<typeof import('@app/schemas')>()
                return {
                    ResultSchema: mod.ResultSchema, //Needed to validate tool 'resultSchema'
                    ToolMetadataSchema: {
                        parse: mockParse
                    }
                }
            });

            const emptyObjectSchema = z.object({});
            // Create an invalid tool class
            class InvalidTool extends Tool<typeof emptyObjectSchema, typeof emptyObjectSchema> {
                id = ''; // Invalid empty id
                name = 'Invalid Tool';
                description = 'Invalid tool';
                inputSchema = emptyObjectSchema;
                outputSchema = emptyObjectSchema;

                async executeValidated(): Promise<z.infer<typeof this.resultSchema>> {
                    return { success: true, data: {} };
                }
            }

            const invalidToolLoader = () => Promise.resolve(InvalidTool);
            await toolManager.autoDiscoverTools([invalidToolLoader]);
            const tools = await toolManager.getTools();

            //Should try to parse the invalid tool with zod
            expect(mockParse).toHaveBeenCalledTimes(1)
            expect(JSON.stringify(mockParse.mock.calls[0][0])).toBe(
                JSON.stringify({
                    id: '',
                    name: 'Invalid Tool',
                    description: 'Invalid tool',
                    inputSchema: emptyObjectSchema,
                    outputSchema: emptyObjectSchema,
                    resultSchema: ResultSchema(emptyObjectSchema),
                })
            );

            //Should not add an invalid tool to the manager
            expect(tools).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[ToolManager] Tool failed validation:'),
                expect.any(Error)
            );

            mockParse.mockRestore()
        });

        test('should handle tool loading errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const failingLoader = () => Promise.reject(new Error('Load failed'));
            await toolManager.autoDiscoverTools([failingLoader]);

            const tools = await toolManager.getTools();
            expect(tools).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Async Tool Loading', () => {
        test('should register async tools', async () => {
            const toolManagerToolsMap = toolManager['tools'];
            const asyncLoader = () => Promise.resolve(new MockTool());

            expect(toolManagerToolsMap).toHaveLength(0)

            toolManager.registerAsyncTool('async-tool', asyncLoader);

            // Tool should be registered but not yet loaded
            const registeredAsyncTool = toolManager['tools'].get('async-tool');

            expect(toolManagerToolsMap).toHaveLength(1)
            expect(registeredAsyncTool?.loader).toBe(asyncLoader)
            expect(registeredAsyncTool?.initialized).toBe(false)
            expect(registeredAsyncTool?.loading).toBe(false)
        });

        test('should load async tools on demand', async () => {
            const toolManagerToolsMap = toolManager['tools'];
            const asyncLoader = () => Promise.resolve(new MockTool());

            expect(toolManagerToolsMap).toHaveLength(0);

            toolManager.registerAsyncTool('mock-tool', asyncLoader);

            const registeredAsyncTool = toolManager['tools'].get('mock-tool');
            expect(registeredAsyncTool?.tool).toBeUndefined() //Tool not loaded yet


            const input = { message: 'test async' };
            await toolManager.runTool('mock-tool' as ToolId, input); //Should load the tool

            expect(registeredAsyncTool?.tool).toBeDefined() //Tool loaded
        });

        test('should handle concurrent async tool loading', async () => {
            const asyncLoader = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return new MockTool();
            };

            toolManager.registerAsyncTool('mock-tool', asyncLoader);

            // Start multiple concurrent operations
            const results = await Promise.all([
                toolManager.runTool('mock-tool' as ToolId, { message: 'test1' }),
                toolManager.runTool('mock-tool' as ToolId, { message: 'test2' }),
                toolManager.runTool('mock-tool' as ToolId, { message: 'test3' })
            ]);

            const registeredAsyncTool = toolManager['tools'];

            // Tool should only be loaded once
            expect(registeredAsyncTool).toHaveLength(1);
            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
        });

        test('should throw if an async registered tool does not have a loader', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const asyncLoader = () => Promise.resolve(new MockTool());
            // await toolManager.autoDiscoverTools([mockToolLoader]);
            toolManager.registerAsyncTool('mock-tool', asyncLoader);


            toolManager['tools'].get('mock-tool')!.loader = undefined

            await toolManager.getTools();

            expect(consoleSpy).toHaveBeenCalledTimes(1);
        })

        test('should throw if a async loaded tool hase a wrong ToolMetadataSche', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const emptyObjectSchema = z.object({});
            class InvalidTool extends Tool<typeof emptyObjectSchema, typeof emptyObjectSchema> {
                id = 'mock-tool'; // Invalid empty id
                name = 12 as unknown as string;
                description = 'Invalid tool';
                inputSchema = emptyObjectSchema;
                outputSchema = emptyObjectSchema;

                async executeValidated(): Promise<z.infer<typeof this.resultSchema>> {
                    return { success: true, data: {} };
                }
            }
            const asyncLoader = () => Promise.resolve(new InvalidTool());

            toolManager.registerAsyncTool('mock-tool', asyncLoader);

            await toolManager.getTools();

            expect(consoleSpy).toHaveBeenCalledTimes(2);
            expect(consoleSpy).toMatchSnapshot();
        })
    });

    describe('Tool Initialization', () => {
        test('should initialize tools that require it', async () => {
            const mockToolLoader = () => Promise.resolve(MockToolWithInit);
            await toolManager.autoDiscoverTools([mockToolLoader]);

            const input = { message: 'test init' };
            const result = await toolManager.runTool('mock-tool-init' as ToolId, input);

            expect(initializeMock).toHaveBeenCalledTimes(1)
            expect(result.success).toBe(true);
        });

        test('should handle initialization errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            class FailingInitTool extends MockToolWithInit {
                async initialize() {
                    throw new Error('Initialization failed');
                }
            }

            const mockToolLoader = () => Promise.resolve(FailingInitTool);
            await toolManager.autoDiscoverTools([mockToolLoader]);

            const input = { message: 'test' };
            await expect(toolManager.runTool('mock-tool-init' as ToolId, input))
                .rejects.toThrow('Failed to initialize tool');
            expect(consoleSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Tool Execution via Manager', () => {
        beforeEach(async () => {
            const mockToolLoader = () => Promise.resolve(MockTool);
            await toolManager.autoDiscoverTools([mockToolLoader]);
        });

        test('should run tools successfully', async () => {
            const input = { message: 'manager test' };
            const result = await toolManager.runTool('mock-tool' as ToolId, input);

            expect(result.success).toBe(true);
            if (result.success) {
                const resultData = result.data as z.infer<typeof MockOutputSchema>;
                expect(resultData.result).toBe('Processed: manager test');
            }
        });

        test('should throw error for non-existent tools', async () => {
            const input = { message: 'test' };
            await expect(toolManager.runTool('non-existent' as any, input))
                .rejects.toThrow('Tool with id "non-existent" not found');
        });

        test('should handle tool execution failures', async () => {
            const failingToolLoader = () => Promise.resolve(MockFailingTool);
            await toolManager.autoDiscoverTools([failingToolLoader]);

            const input = { message: 'test' };
            const result = await toolManager.runTool('mock-failing-tool' as ToolId, input);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toBe('Tool execution failed');
            }
        });
    });

    describe('Tool Metadata', () => {
        beforeEach(async () => {
            const mockToolLoader = () => Promise.resolve(MockTool);
            await toolManager.autoDiscoverTools([mockToolLoader]);
        });

        test('should return tools metadata', async () => {
            const metadata = await toolManager.getToolsMetadata();

            expect(metadata).toHaveLength(1);
            expect(metadata[0]).toMatchObject({
                id: 'mock-tool',
                name: 'Mock Tool',
                description: 'A mock tool for testing',
                category: 'Test'
            });

            // Validate against schema
            expect(() => ToolMetadataSchema.parse(metadata[0])).not.toThrow();
        });

        test('should handle metadata loading errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // Register a tool that will fail to load
            const failingLoader = () => Promise.reject(new Error('Load failed'));
            toolManager.registerAsyncTool('failing-tool', failingLoader);

            const metadata = await toolManager.getToolsMetadata();

            // Should return metadata for working tools only
            expect(metadata).toHaveLength(1);
            expect(metadata[0].id).toBe('mock-tool');
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('Service Integration', () => {
        test('should set overlay service', () => {
            const mockOverlayService = {} as any;
            expect(() => toolManager.setOverlayService(mockOverlayService)).not.toThrow();
        });

        test('should set template manager', () => {
            const mockTemplateManager = {} as any;
            expect(() => toolManager.setTemplateManager(mockTemplateManager)).not.toThrow();
        });
    });
});
