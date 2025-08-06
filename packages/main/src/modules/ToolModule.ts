// packages/main/src/modules/ToolModule.ts
import { ipcMain } from 'electron'
import { ToolManager } from '@app/tools'
import type { OverlayService } from '@app/types';

const toolManager = new ToolManager()

export async function initializeTools(overlayService?: OverlayService) {
    await toolManager.autoDiscoverTools();

    // Set overlay service for tools to access
    if (overlayService) {
        toolManager.setOverlayService(overlayService);
    }

    ipcMain.handle('get-tools', () => toolManager.getToolsMetadata());
    ipcMain.handle('run-tool', async (_, toolId: string, inputs: any) => 
        toolManager.runTool(toolId, inputs)
    );
}

export const getToolManager = () => toolManager;