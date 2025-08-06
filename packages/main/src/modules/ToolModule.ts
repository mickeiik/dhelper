// packages/main/src/modules/ToolModule.ts
import { ipcMain } from 'electron'
import type { AppModule } from '../AppModule.js';
import type { ModuleContext } from '../ModuleContext.js';
import { ToolManager } from '@app/tools'

const toolManager = new ToolManager()

export class ToolModule implements AppModule {
    async enable({ app }: ModuleContext): Promise<void> {
        await app.whenReady();
        await toolManager.autoDiscoverTools();

        ipcMain.handle('get-tools', () => toolManager.getToolsMetadata());
        ipcMain.handle('run-tool', async (_, toolId: string, inputs: any) => 
            toolManager.runTool(toolId, inputs)
        );
    }
}

export const getToolManager = () => toolManager;
export const initializeToolModule = () => new ToolModule()