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
            const tools = toolManager.getTools();
            console.log('Returning tools to renderer:', tools.map(t => ({
                id: t.id,
                name: t.name,
                hasInputFields: !!t.inputFields?.length,
                inputFieldCount: t.inputFields?.length || 0
            }))); // Debug log
            return tools;
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