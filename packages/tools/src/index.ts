import { z } from 'zod';
import { Tool } from './base.js';
import type { OverlayService } from '@app/overlay';
import { ToolMetadataSchema, ToolResult } from '@app/schemas';
interface ToolRegistration {
    tool?: Tool<z.ZodType, z.ZodType>;
    loader?: () => Promise<Tool<z.ZodType, z.ZodType>>;
    initialized: boolean;
    loading: boolean;
}

// Tools are now registered via dynamic imports passed to autoDiscoverTools()

// Import types for type generation only (these won't create circular dependency at runtime)
import type { HelloWorldTool } from '@tools/hello-world';
import type { TesseractOcrTool } from '@tools/ocr';
import type { ScreenRegionSelectorTool } from '@tools/screen-region-selector';
import type { ScreenshotTool } from '@tools/screenshot';
import type { TemplateMatcherTool } from '@tools/template-matcher';
import type { ClickTool } from '@tools/click';
import { TemplateManager } from '@app/templates';

// Type-only array for generating types (not used at runtime)
type AVAILABLE_TOOLS_TYPES = readonly [
    typeof HelloWorldTool,
    typeof TesseractOcrTool,
    typeof ScreenRegionSelectorTool,
    typeof ScreenshotTool,
    typeof TemplateMatcherTool,
    typeof ClickTool
];

// Auto-generated types from AVAILABLE_TOOLS_TYPES
type ToolInstances = InstanceType<AVAILABLE_TOOLS_TYPES[number]>;

// Auto-generated tool registry types
export type ToolId = ToolInstances['id'];

export type ToolInput<T extends ToolId> = Extract<ToolInstances, { id: T }> extends {
    inputSchema: infer S extends z.ZodType
} ? z.infer<S> : never;

export type ToolOutput<T extends ToolId> = Extract<ToolInstances, { id: T }> extends {
    outputSchema: infer S extends z.ZodType
} ? z.infer<S> : never;

export class ToolManager {
    private tools = new Map<string, ToolRegistration>();
    private overlayService?: OverlayService;
    private templateManager?: TemplateManager;
    private loadingPromises = new Map<string, Promise<Tool<z.ZodType, z.ZodType>>>();

    async autoDiscoverTools(toolLoaders: readonly (() => Promise<new () => Tool<z.ZodType, z.ZodType>>)[]) {
        // Register all available tools using dynamic imports
        for (const toolLoader of toolLoaders) {
            try {
                const ToolClass = await toolLoader();
                const tool = new ToolClass();

                // Validate tool structure at registration time
                const metadata = {
                    id: tool.id,
                    name: tool.name,
                    description: tool.description,
                    category: tool.category,
                    inputSchema: tool.inputSchema,
                    outputSchema: tool.outputSchema,
                    resultSchema: tool.resultSchema,
                    examples: tool.examples
                };

                ToolMetadataSchema.parse(metadata);

                this.tools.set(tool.id, {
                    tool,
                    initialized: false,
                    loading: false
                });
            } catch (error) {
                const errorMessage = error instanceof z.ZodError
                    ? `Tool failed validation: ${error.message}`
                    : `Failed to load or instantiate tool`;

                console.error(`[ToolManager] ${errorMessage}`, error);
            }
        }
    }

    /**
     * Register a tool with async loading
     * Useful for tools with heavy dependencies that should be loaded on-demand
     */
    registerAsyncTool(id: string, loader: () => Promise<Tool<z.ZodType, z.ZodType>>) {
        this.tools.set(id, {
            loader,
            initialized: false,
            loading: false
        });
    }

    /**
     * Load a tool if it's not already loaded
     */
    private async ensureToolLoaded(id: string): Promise<Tool<z.ZodType, z.ZodType>> {
        const registration = this.tools.get(id);
        if (!registration) {
            throw new Error(`Tool with id "${id}" not found`);
        }

        // If tool is already loaded, return it
        if (registration.tool) {
            return registration.tool;
        }

        // If tool is currently loading, wait for it
        if (registration.loading && this.loadingPromises.has(id)) {
            return this.loadingPromises.get(id)!;
        }

        // If tool has a loader, load it
        if (registration.loader) {
            registration.loading = true;

            const loadingPromise = (async () => {
                try {
                    const tool = await registration.loader!();

                    // Validate the loaded tool
                    const metadata = {
                        id: tool.id,
                        name: tool.name,
                        description: tool.description,
                        category: tool.category,
                        inputSchema: tool.inputSchema,
                        outputSchema: tool.outputSchema,
                        resultSchema: tool.resultSchema,
                        examples: tool.examples
                    };

                    ToolMetadataSchema.parse(metadata);

                    registration.tool = tool;
                    registration.loading = false;
                    this.loadingPromises.delete(id);

                    return tool;
                } catch (error) {
                    registration.loading = false;
                    this.loadingPromises.delete(id);

                    const errorMessage = error instanceof z.ZodError
                        ? `Tool ${id} failed validation after loading: ${error.message}`
                        : `Failed to load tool ${id}`;

                    const toolError = new Error(errorMessage);
                    console.error(`[ToolManager] ${toolError.message}`, toolError);
                    throw toolError;
                }
            })();

            this.loadingPromises.set(id, loadingPromise);
            return loadingPromise;
        }

        throw new Error(`Tool "${id}" has no instance or loader`);
    }

    async runTool<T extends ToolId>(
        id: T,
        inputs: ToolInput<T>
    ): Promise<ToolResult<z.ZodType>> {
        try {
            // Ensure tool is loaded (handles both sync and async tools)
            const tool = await this.ensureToolLoaded(id);

            // Initialize tool if needed
            const registration = this.tools.get(id)!;
            if (!registration.initialized && tool.initialize) {
                await this.initializeTool(id);
            }

            // Tool.execute already handles Zod validation and error wrapping
            return await tool.execute(inputs);
        } catch (error) {
            const toolError = error instanceof Error ? error : new Error(`Tool "${id}" execution failed`);
            console.error(`[ToolManager] ${toolError.message}`, toolError);
            throw toolError;
        }
    }

    setOverlayService(overlayService: OverlayService) {
        this.overlayService = overlayService;
    }

    setTemplateManager(templateManager: TemplateManager) {
        this.templateManager = templateManager;
    }

    private async initializeTool(id: string) {
        const registration = this.tools.get(id);
        if (!registration || registration.initialized) return;

        // Ensure tool is loaded before initializing
        const tool = await this.ensureToolLoaded(id);
        if (!tool.initialize) return;

        try {
            const initContext = {
                overlayService: this.overlayService,
                templateManager: this.templateManager
            };
            await tool.initialize(initContext);
            registration.initialized = true;
        } catch (error) {
            const toolError = new Error(`Failed to initialize tool "${id}"`);
            console.error(`[ToolManager] ${toolError.message}`, toolError);
            throw toolError;
        }
    }

    async getTools(): Promise<Tool<z.ZodType, z.ZodType>[]> {
        const tools: Tool<z.ZodType, z.ZodType>[] = [];

        for (const [id] of this.tools.entries()) {
            try {
                const tool = await this.ensureToolLoaded(id);
                tools.push(tool);
            } catch (error) {
                console.error(`[ToolManager] Failed to load tool ${id}`, error);
            }
        }

        return tools;
    }

    async getToolsMetadata(): Promise<z.infer<typeof ToolMetadataSchema>[]> {
        const metadata: z.infer<typeof ToolMetadataSchema>[] = [];

        for (const [id] of this.tools.entries()) {
            try {
                const tool = await this.ensureToolLoaded(id);
                metadata.push(ToolMetadataSchema.parse({
                    id: tool.id,
                    name: tool.name,
                    description: tool.description,
                    category: tool.category,
                    inputSchema: tool.inputSchema,
                    outputSchema: tool.outputSchema,
                    resultSchema: tool.resultSchema,
                    examples: tool.examples
                }));
            } catch (error) {
                console.error(`[ToolManager] Failed to load metadata for tool ${id}`, error);
            }
        }

        return metadata;
    }
}


export { Tool };
