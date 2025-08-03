import { WorkflowRunner } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { ToolManager } from '@app/tools'
import { ipcMain } from 'electron'
import { AppModule } from '../AppModule.js';
import { ModuleContext } from '../ModuleContext.js';
import { getToolManager } from './ToolModule.js';

const workflowRunner = new WorkflowRunner(getToolManager())
const storage = new WorkflowStorage()

export class WorkflowModule implements AppModule {
    enable({ app }: ModuleContext): Promise<void> | void {
        app.whenReady();

        // IPC handlers
        ipcMain.handle('run-workflow', async (_, workflowId) => {
            const workflow = await storage.loadWorkflow(workflowId)

            const testWorkflow = {
                id: 'workflow-1',
                name: 'Test Workflow',
                steps: [
                    {
                        toolId: 'screenshot',
                        inputs: {
                            top: 0,
                            left: 0,
                            width: 500,
                            height: 200,
                        }
                    },
                    {
                        toolId: 'tesseract-ocr',
                        inputs: 'last'
                    }
                ]
            }

            return await workflowRunner.run(testWorkflow)
        })
    }
}

export function initializeWorkflowModule() {
    return new WorkflowModule()
}
