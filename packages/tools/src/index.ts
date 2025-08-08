// packages/tools/src/index.ts
import type { Tool, ToolMetadata, OverlayService } from '@app/types';
import { ToolExecutionError, ErrorLogger } from '@app/types';

// Direct imports - no auto-discovery needed
import { HelloWorldTool } from '@tools/hello-world';
import { TesseractOcrTool } from '@tools/ocr';
import { ScreenRegionSelectorTool } from '@tools/screen-region-selector';
import { ScreenshotTool } from '@tools/screenshot';
import { TemplateMatcherTool } from '@tools/template-matcher';
import { ClickTool } from '@tools/click';

interface ToolRegistration {
    tool: Tool;
    initialized: boolean;
}

export class ToolManager {
    private tools = new Map<string, ToolRegistration>();
    private overlayService?: OverlayService;
    private templateManager?: any;
    private logger = new ErrorLogger('ToolManager');

    async autoDiscoverTools() {
        const toolClasses = [
            HelloWorldTool,
            TesseractOcrTool,
            ScreenRegionSelectorTool,
            ScreenshotTool,
            TemplateMatcherTool,
            ClickTool
        ];

        for (const ToolClass of toolClasses) {
            const tool = new ToolClass();
            this.tools.set(tool.id, {
                tool,
                initialized: false
            });
        }
    }

    async runTool(id: string, inputs: any) {
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

    setTemplateManager(templateManager: any) {
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

    getTools(): Tool[] {
        return Array.from(this.tools.values()).map(({ tool }) => tool);
    }

    getToolsMetadata(): ToolMetadata[] {
        return Array.from(this.tools.values()).map(({ tool }) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            category: tool.category,
            inputFields: tool.inputFields,
            examples: tool.examples
        }));
    }
}

// Export registry types
export type { ToolRegistry, ToolId, ToolInput, ToolOutput } from './registry.js';

// Re-export shared types for convenience
export type { Tool, ToolMetadata } from '@app/types';