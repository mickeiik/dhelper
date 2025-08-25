import { z } from 'zod';
import { ipcMain } from 'electron'
import { WorkflowSchema } from '@app/schemas';
import { Workflow } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { getToolManager } from './ToolModule.js';
import { getConfig } from '../config/index.js';

const config = getConfig();
const storage = new WorkflowStorage(config.storage.workflowsPath);

type WorkflowType = z.infer<typeof WorkflowSchema>;

export function initializeWorkflows() {
    // Workflow execution handlers
    ipcMain.handle('run-workflow', async (_, workflowId: string) => {
        const stored = await storage.load(workflowId);
        
        if (!stored) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        const workflowInstance = new Workflow(stored);
        const result = await workflowInstance.execute(getToolManager());
        return result;
    });

    ipcMain.handle('run-example-workflow', async () => {
        

        // const workflowInstance = new Workflow(exampleWorkflow);
        // return await workflowInstance.execute(getToolManager());
    });

    ipcMain.handle('run-custom-workflow', async (_, customWorkflow: WorkflowType) => {
        const workflowInstance = new Workflow(customWorkflow);
        return await workflowInstance.execute(getToolManager());
    });

    // Storage handlers
    ipcMain.handle('save-workflow', async (_, workflowData: WorkflowType) => {
        await storage.save(workflowData);
        return { success: true };
    });

    ipcMain.handle('load-workflow', async (_, workflowId: string) => {
        return await storage.load(workflowId);
    });

    ipcMain.handle('delete-workflow', async (_, workflowId: string) => {
        return await storage.delete(workflowId);
    });

    ipcMain.handle('list-workflows', async () => {
        return await storage.list();
    });

    ipcMain.handle('workflow-exists', async (_, workflowId: string) => {
        return await storage.exists(workflowId);
    });

    ipcMain.handle('clear-all-workflows', async () => {
        await storage.clear();
        return { success: true };
    });

    ipcMain.handle('search-workflows', async (_, query: string) => {
        return await storage.search(query);
    });
}