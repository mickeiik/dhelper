// packages/main/src/modules/ToolModule.ts
import { ipcMain } from 'electron'
import { ToolManager } from '@app/tools'
import type { OverlayService } from '@app/types';
import { ToolExecutionError, ErrorLogger } from '@app/types';
import { z } from 'zod';

const logger = new ErrorLogger('ToolModule');

const toolManager = new ToolManager()

export async function initializeTools(overlayService?: OverlayService) {
    await toolManager.autoDiscoverTools();

    // Set overlay service for tools to access
    if (overlayService) {
        toolManager.setOverlayService(overlayService);
    }

    ipcMain.handle('get-tools', async () => {
        try {
            return await toolManager.getToolsMetadata();
        } catch (error) {
            const toolError = error instanceof ToolExecutionError ? error : new ToolExecutionError('Failed to get tools metadata', 'get-tools', { originalError: error });
            logger.logError(toolError);
            throw toolError;
        }
    });
    
    ipcMain.handle('run-tool', async (_, toolId: string, inputs: Record<string, unknown>) => {
        try {
            // Validate tool inputs
            const validatedToolId = z.string().min(1).parse(toolId);
            const validatedInputs = z.record(z.unknown()).parse(inputs);
            return await toolManager.runTool(validatedToolId, validatedInputs);
        } catch (error) {
            const toolError = error instanceof ToolExecutionError ? error : new ToolExecutionError('Failed to run tool', toolId, { originalError: error, inputs });
            logger.logError(toolError);
            throw toolError;
        }
    });
}

export const getToolManager = () => toolManager;