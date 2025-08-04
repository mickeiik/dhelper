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

        // IPC handlers
        ipcMain.handle('run-workflow', async (_, workflowId) => {
            // Example workflow with caching enabled for user interaction step
            const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
                .cachedStep('region', 'screen-region-selector', {
                    mode: 'rectangle'
                }, {
                    persistent: true, // Survives app restart
                    ttl: 24 * 60 * 60 * 1000 // 24 hours
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

                // Convert the custom workflow format to our internal format
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
                        cache: step.cache // Pass through cache configuration
                    })),
                    clearCache: customWorkflow.clearCache
                };

                return await workflowRunner.run(workflow);
            } catch (error) {
                console.error('Custom workflow execution failed:', error);
                throw error;
            }
        });

        // Cache management handlers
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