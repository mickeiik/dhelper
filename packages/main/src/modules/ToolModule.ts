// packages/main/src/modules/ToolModule.ts
import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';
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