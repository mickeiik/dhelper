import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { ToolId, ToolInput, ToolManager } from '@app/tools'
import type { OverlayService } from './OverlayModule.js';
import z from 'zod';
import { Tool } from '@app/tools';

/**
 * Registry of all available tools with dynamic imports
 * 
 * To add a new tool:
 * 1. Add its dynamic import to this array
 */
const AVAILABLE_TOOLS: (() => Promise<new() => Tool<z.ZodType, z.ZodType>>)[] = [
    () => import('@tools/hello-world').then(m => m.HelloWorldTool),
    () => import('@tools/ocr').then(m => m.TesseractOcrTool),
    () => import('@tools/screen-region-selector').then(m => m.ScreenRegionSelectorTool),
    () => import('@tools/screenshot').then(m => m.ScreenshotTool),
    () => import('@tools/template-matcher').then(m => m.TemplateMatcherTool),
    () => import('@tools/click').then(m => m.ClickTool),
] as const;

const toolManager = new ToolManager()

export async function initializeTools(overlayService?: OverlayService) {
    await toolManager.autoDiscoverTools(AVAILABLE_TOOLS);

    // Set overlay service for tools to access
    if (overlayService) {
        toolManager.setOverlayService(overlayService);
    }

    ipcMain.handle('get-tools', async () => {
        return await toolManager.getToolsMetadata();
    });
    
    ipcMain.handle('run-tool', async <T extends ToolId>(_: IpcMainInvokeEvent, toolId: T, inputs: ToolInput<T>) => {
        return await toolManager.runTool(toolId, inputs);
    });
}

export const getToolManager = () => toolManager;