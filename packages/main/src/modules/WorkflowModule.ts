// packages/main/src/modules/WorkflowModule.ts
import { WorkflowRunner, ref, workflow } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';
import { getToolManager } from './ToolModule.js';

const workflowRunner = new WorkflowRunner(getToolManager())
const storage = new WorkflowStorage()

export class WorkflowModule implements AppModule {
    enable({ app }: ModuleContext): Promise<void> | void {
        app.whenReady();

        // Set up event listeners for progress tracking
        workflowRunner.on('workflow-started', (progress) => {
            console.log(`Workflow ${progress.workflowId} started`);
        });

        workflowRunner.on('step-completed', (progress) => {
            console.log(`Step ${progress.stepId} completed (${progress.progress}%) ${progress.fromCache ? '[CACHED]' : ''}`);
        });

        workflowRunner.on('workflow-completed', (progress) => {
            console.log(`Workflow ${progress.workflowId} completed successfully`);
        });

        workflowRunner.on('workflow-failed', (progress) => {
            console.error(`Workflow ${progress.workflowId} failed: ${progress.message}`);
        });

        // Existing IPC handlers
        ipcMain.handle('run-workflow', async (_, workflowId) => {
            // Try to load from storage first
            const storedWorkflow = await storage.loadWorkflow(workflowId);
            if (storedWorkflow) {
                console.log(`Running stored workflow: ${workflowId}`);
                return await workflowRunner.run(storedWorkflow);
            }

            // Fallback to example workflow
            const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
                .cachedStep('region', 'screen-region-selector', {
                    mode: 'rectangle'
                }, {
                    persistent: true,
                    ttl: 24 * 60 * 60 * 1000
                })
                .step('capture', 'screenshot', ref('region'))
                .step('extract', 'tesseract-ocr', ref('capture'))
                .step('log', 'hello-world', {
                    message: 'OCR Result:',
                    data: ref('extract')
                })
                .build();

            return await workflowRunner.run(exampleWorkflow);
        });

        ipcMain.handle('run-custom-workflow', async (_, customWorkflow) => {
            try {
                console.log('Running custom workflow:', customWorkflow);

                const workflow = {
                    id: customWorkflow.id,
                    name: customWorkflow.name,
                    description: 'Custom workflow built in UI',
                    steps: customWorkflow.steps.map((step: any) => ({
                        id: step.id,
                        toolId: step.toolId,
                        inputs: step.inputs,
                        onError: 'stop' as const,
                        retryCount: 0,
                        cache: step.cache
                    })),
                    clearCache: customWorkflow.clearCache
                };

                return await workflowRunner.run(workflow);
            } catch (error) {
                console.error('Custom workflow execution failed:', error);
                throw error;
            }
        });

        // Storage IPC handlers
        ipcMain.handle('save-workflow', async (_, workflow, options) => {
            await storage.saveWorkflow(workflow, options);
            return { success: true };
        });

        ipcMain.handle('load-workflow', async (_, workflowId) => {
            return await storage.loadWorkflow(workflowId);
        });

        ipcMain.handle('delete-workflow', async (_, workflowId) => {
            return await storage.deleteWorkflow(workflowId);
        });

        ipcMain.handle('list-workflows', async () => {
            return await storage.listWorkflows();
        });

        ipcMain.handle('workflow-exists', async (_, workflowId) => {
            return await storage.workflowExists(workflowId);
        });

        ipcMain.handle('get-storage-stats', async () => {
            return await storage.getStorageStats();
        });

        ipcMain.handle('clear-all-workflows', async () => {
            await storage.clearAllWorkflows();
            return { success: true };
        });

        ipcMain.handle('export-workflow', async (_, workflowId) => {
            return await storage.exportWorkflow(workflowId);
        });

        ipcMain.handle('import-workflow', async (_, data) => {
            return await storage.importWorkflow(data);
        });

        ipcMain.handle('duplicate-workflow', async (_, sourceId, newId, newName) => {
            await storage.duplicateWorkflow(sourceId, newId, newName);
            return { success: true };
        });

        ipcMain.handle('search-workflows', async (_, query) => {
            return await storage.searchWorkflows(query);
        });

        // Cache management handlers (unchanged)
        ipcMain.handle('clear-workflow-cache', async (_, workflowId) => {
            await workflowRunner.clearWorkflowCache(workflowId);
            return { success: true };
        });

        ipcMain.handle('clear-all-caches', async () => {
            await workflowRunner.clearAllCaches();
            return { success: true };
        });

        ipcMain.handle('get-cache-stats', async (_, workflowId) => {
            return workflowRunner.getCacheStats(workflowId);
        });
    }
}

export function initializeWorkflowModule() {
    return new WorkflowModule()
}