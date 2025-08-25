// packages/tools/src/index.ts
export * from './base.js';

import type { OverlayService } from '@app/types';
import { ToolExecutionError, ErrorLogger } from '@app/types';
import { ToolMetadataSchema, ToolResult } from '@app/schemas';
import { z } from 'zod';
import { Tool } from './base.js';

/**
 * Tool imports - Add new tools here
 * 
 * To add a new tool:
 * 1. Import your tool class here
 * 2. Add it to the AVAILABLE_TOOLS array below
 */
import { HelloWorldTool } from '@tools/hello-world';
import { TesseractOcrTool } from '@tools/ocr';
import { ScreenRegionSelectorTool } from '@tools/screen-region-selector';
import { ScreenshotTool } from '@tools/screenshot';
import { TemplateMatcherTool } from '@tools/template-matcher';
import { ClickTool } from '@tools/click';

interface ToolRegistration {
    tool?: Tool<z.ZodType, z.ZodType>;
    loader?: () => Promise<Tool<z.ZodType, z.ZodType>>;
    initialized: boolean;
    loading: boolean;
}

/**
 * Registry of all available tools
 * 
 * Add your imported tool class to this array to make it available in the system.
 * Tools are automatically instantiated and registered when the ToolManager initializes.
 */
const AVAILABLE_TOOLS = [
    HelloWorldTool,
    TesseractOcrTool,
    ScreenRegionSelectorTool,
    ScreenshotTool,
    TemplateMatcherTool,
    ClickTool
] as const;

// Auto-generated types from AVAILABLE_TOOLS
type ToolInstances = InstanceType<typeof AVAILABLE_TOOLS[number]>;

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
    private templateManager?: import('@app/types').TemplateManager;
    private logger = new ErrorLogger('ToolManager');
    private loadingPromises = new Map<string, Promise<Tool<z.ZodType, z.ZodType>>>();

    async autoDiscoverTools() {
        // Register all available tools
        for (const ToolClass of AVAILABLE_TOOLS) {
            try {
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
                    ? `Tool ${ToolClass.name} failed validation: ${error.message}`
                    : `Failed to instantiate tool ${ToolClass.name}`;
                    
                this.logger.logError(new ToolExecutionError(
                    errorMessage,
                    ToolClass.name,
                    { originalError: error }
                ));
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
            throw new ToolExecutionError(`Tool with id "${id}" not found`, id);
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
                        
                    const toolError = new ToolExecutionError(errorMessage, id, { originalError: error });
                    this.logger.logError(toolError);
                    throw toolError;
                }
            })();
            
            this.loadingPromises.set(id, loadingPromise);
            return loadingPromise;
        }

        throw new ToolExecutionError(`Tool "${id}" has no instance or loader`, id);
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
            const toolError = error instanceof ToolExecutionError ? error : new ToolExecutionError(`Tool "${id}" execution failed`, id, { originalError: error, inputs });
            this.logger.logError(toolError);
            throw toolError;
        }
    }

    setOverlayService(overlayService: OverlayService) {
        this.overlayService = overlayService;
    }

    setTemplateManager(templateManager: import('@app/types').TemplateManager) {
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
            const toolError = new ToolExecutionError(`Failed to initialize tool "${id}"`, id, { originalError: error });
            this.logger.logError(toolError);
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
                this.logger.logError(new ToolExecutionError(
                    `Failed to load tool ${id}`,
                    id,
                    { originalError: error }
                ));
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
                this.logger.logError(new ToolExecutionError(
                    `Failed to load metadata for tool ${id}`,
                    id,
                    { originalError: error }
                ));
            }
        }
        
        return metadata;
    }
}

// Re-export shared types for convenience
export type { ToolMetadata } from '@app/types';