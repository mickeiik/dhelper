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
            console.log(`Step ${progress.stepId} completed (${progress.progress}%)`);
        });

        workflowRunner.on('workflow-completed', (progress) => {
            console.log(`Workflow ${progress.workflowId} completed successfully`);
        });

        workflowRunner.on('workflow-failed', (progress) => {
            console.error(`Workflow ${progress.workflowId} failed: ${progress.message}`);
        });

        // IPC handlers
        ipcMain.handle('run-workflow', async (_, workflowId) => {
            // Example workflow: Screenshot + OCR
            const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
                .step('region', 'screen-region-selector', {
                    mode: 'rectangle'
                })
                .step('capture', 'screenshot', {
                    $ref: 'region'
                })
                .step('extract', 'tesseract-ocr', ref('capture'))
                .step('log', 'hello-world', {
                    // TypeScript autocompletes: message, data (from hello-world tool)
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
                        onError: 'stop' as const, // Default error handling
                        retryCount: 0 // No retries by default
                    }))
                };

                return await workflowRunner.run(workflow);
            } catch (error) {
                console.error('Custom workflow execution failed:', error);
                throw error;
            }
        });
    }
}

export function initializeWorkflowModule() {
    return new WorkflowModule()
}