// packages/tools/src/index.ts
import type { Tool, ToolMetadata, OverlayService } from '@app/types';
import { ToolExecutionError, ErrorLogger } from '@app/types';

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

interface AnyTool {
    id: string;
    name: string;
    description?: string;
    category?: string;
    initialize(context: any): Promise<void>;
    execute(inputs: any): Promise<any>;
    [key: string]: any;
}

interface ToolRegistration {
    tool: AnyTool;
    initialized: boolean;
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

export class ToolManager {
    private tools = new Map<string, ToolRegistration>();
    private overlayService?: OverlayService;
    private templateManager?: import('@app/types').TemplateManager;
    private logger = new ErrorLogger('ToolManager');

    async autoDiscoverTools() {
        // Register all available tools
        for (const ToolClass of AVAILABLE_TOOLS) {
            try {
                const tool = new ToolClass();
                this.tools.set(tool.id, {
                    tool: tool as AnyTool,
                    initialized: false
                });
            } catch (error) {
                this.logger.logError(new ToolExecutionError(
                    `Failed to instantiate tool ${ToolClass.name}`, 
                    ToolClass.name, 
                    { originalError: error }
                ));
            }
        }
    }

    async runTool(id: string, inputs: Record<string, unknown>) {
        const registration = this.tools.get(id);
        if (!registration) {
            throw new ToolExecutionError(`Tool with id "${id}" not found`, id);
        }

        try {
            // Initialize tool if needed
            if (!registration.initialized) {
                await this.initializeTool(id);
            }

            return await registration.tool.execute(inputs);
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

        try {
            const initContext = {
                overlayService: this.overlayService,
                templateManager: this.templateManager
            };
            await registration.tool.initialize(initContext);
            registration.initialized = true;
        } catch (error) {
            const toolError = new ToolExecutionError(`Failed to initialize tool "${id}"`, id, { originalError: error });
            this.logger.logError(toolError);
            throw toolError;
        }
    }

    getTools(): AnyTool[] {
        return Array.from(this.tools.values()).map(({ tool }) => tool);
    }

    getToolsMetadata(): any[] {
        return Array.from(this.tools.values()).map(({ tool }) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            category: tool.category,
            inputFields: tool.inputFields,
            outputFields: tool.outputFields,
            examples: tool.examples
        }));
    }
}

// Export registry types
export type { ToolRegistry, ToolId, ToolInput, ToolOutput } from './registry.js';

// Re-export shared types for convenience
export type { Tool, ToolMetadata } from '@app/types';