// packages/main/src/modules/WorkflowModule.ts
import { WorkflowRunner, ref, workflow } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';
import { getToolManager } from './ToolModule.js';

const storage = new WorkflowStorage()
const workflowRunner = new WorkflowRunner(getToolManager(), storage)

export class WorkflowModule implements AppModule {
    enable({ app }: ModuleContext): void {
        app.whenReady();

        // Workflow execution handlers
        ipcMain.handle('run-workflow', async (_, workflowId) => {
            const storedWorkflow = await storage.loadWorkflow(workflowId);
            if (storedWorkflow) {
                return workflowRunner.run(storedWorkflow);
            }

            // Fallback to example workflow for demo purposes
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

            return workflowRunner.run(exampleWorkflow);
        });

        ipcMain.handle('run-custom-workflow', async (_, customWorkflow) => {
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
            return workflowRunner.run(workflow);
        });

        // Storage handlers
        ipcMain.handle('save-workflow', (_, workflow, options) => 
            storage.saveWorkflow(workflow, options)
        );
        ipcMain.handle('load-workflow', (_, workflowId) => 
            storage.loadWorkflow(workflowId)
        );
        ipcMain.handle('delete-workflow', (_, workflowId) => 
            storage.deleteWorkflow(workflowId)
        );
        ipcMain.handle('list-workflows', () => 
            storage.listWorkflows()
        );
        ipcMain.handle('workflow-exists', (_, workflowId) => 
            storage.workflowExists(workflowId)
        );
        ipcMain.handle('get-storage-stats', () => 
            storage.getStorageStats()
        );
        ipcMain.handle('clear-all-workflows', () => 
            storage.clearAllWorkflows()
        );
        ipcMain.handle('export-workflow', (_, workflowId) => 
            storage.exportWorkflow(workflowId)
        );
        ipcMain.handle('import-workflow', (_, data) => 
            storage.importWorkflow(data)
        );
        ipcMain.handle('duplicate-workflow', (_, sourceId, newId, newName) => 
            storage.duplicateWorkflow(sourceId, newId, newName)
        );
        ipcMain.handle('search-workflows', (_, query) => 
            storage.searchWorkflows(query)
        );

        // Cache handlers
        ipcMain.handle('clear-workflow-cache', (_, workflowId) => 
            workflowRunner.clearWorkflowCache(workflowId)
        );
        ipcMain.handle('clear-all-caches', () => 
            workflowRunner.clearAllCaches()
        );
        ipcMain.handle('get-cache-stats', (_, workflowId) => 
            workflowRunner.getCacheStats(workflowId)
        );
    }
}

export const initializeWorkflowModule = () => new WorkflowModule()