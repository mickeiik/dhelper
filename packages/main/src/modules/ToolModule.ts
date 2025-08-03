// packages/main/src/modules/ToolModule.ts
import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';
import { ToolManager } from '@app/tools'

const toolManager = new ToolManager()

export class ToolModule implements AppModule {
    async enable({ app }: ModuleContext): Promise<void> {
        await app.whenReady();

        // Auto-discover all tools
        await toolManager.autoDiscoverTools();

        // IPC handlers
        ipcMain.handle('get-tools', () => {
            return toolManager.getTools()
        });

        ipcMain.handle('run-tool', async (_, toolId: string, inputs: any) => {
            return await toolManager.runTool(toolId, inputs);
        });
    }
}

export function getToolManager() {
    return toolManager;
}

export function initializeToolModule() {
    return new ToolModule()
}