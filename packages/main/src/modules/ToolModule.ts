import { WorkflowRunner } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { Tool, ToolManager } from '@app/tools'
import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';

import { HelloWorldTool } from '@tools/hello-world';

const toolManager = new ToolManager()

export class ToolModule implements AppModule {
    enable({ app }: ModuleContext): Promise<void> | void {
        app.whenReady();

        // Register some built-in tools
        toolManager.registerTool(new HelloWorldTool())
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
