import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';

import { ToolManager } from '@app/tools'
import { HelloWorldTool } from '@tools/hello-world';
import { TesseractOcrTool } from '@tools/ocr';
import { ScreenshotTool } from '@tools/screenshot';

const toolManager = new ToolManager()

export class ToolModule implements AppModule {
    enable({ app }: ModuleContext): Promise<void> | void {
        app.whenReady();

        // Register some built-in tools
        toolManager.registerTool(new HelloWorldTool())
        toolManager.registerTool(new TesseractOcrTool())
        toolManager.registerTool(new ScreenshotTool())
        // toolManager.registerTool(new OCRTool())

        // IPC handlers
        ipcMain.handle('get-tools', () => {
            return toolManager.getTools()
        })
    }
}

export function getToolManager() {
    return toolManager;
}

export function initializeToolModule() {
    return new ToolModule()
}
