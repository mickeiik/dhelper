// packages/main/src/modules/WorkflowModule.ts
import { WorkflowRunner, ref, workflow, validateSemanticReferences, resolveSemanticReferences } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { ipcMain } from 'electron'
import { getToolManager } from './ToolModule.js';

const storage = new WorkflowStorage()
const workflowRunner = new WorkflowRunner(getToolManager(), storage)

export function initializeWorkflows() {

    // Workflow execution handlers
    ipcMain.handle('run-workflow', async (_, workflowId) => {
        const storedWorkflow = await storage.loadWorkflow(workflowId);
        if (storedWorkflow) {
            return workflowRunner.run(storedWorkflow);
        }

        // Fallback to example workflow for demo purposes
        // const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
        //     .cachedStep('region', 'screen-region-selector', {
        //         mode: 'rectangle'
        //     }, {
        //         persistent: true,
        //         ttl: 24 * 60 * 60 * 1000
        //     })
        //     .step('capture', 'screenshot', ref('region'))
        //     .step('extract', 'tesseract-ocr', ref('capture'))
        //     .step('log', 'hello-world', {
        //         message: 'OCR Result:',
        //         data: ref('extract')
        //     })
        //     .build();

        //Fallback to example workflow for demo purposes
        // const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
        //     .step('allTemplateMatch', 'template-matcher', {
        //         "minConfidence": 0.8,
        //         "maxResults": 5,
        //         "showVisualIndicators": true
        //     })
        //     .build();

        // return workflowRunner.run(exampleWorkflow);
        // const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
        //     .step('region-selector', 'screen-region-selector', {
        //         "mode": "region",
        //         "timeout": 15000
        //     })
        //     .step('click-test', 'click', {
        //         "x": { "$ref": "{{previous:region-selector.x}}"},
        //         "y": { "$ref": "{{previous:region-selector.x}}"}
        //     })
        //     .build();
        // const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
        //     .step('templateMAtcg', 'template-matcher', {
        //         templateNames: ['qqqq'],
        //         showVisualIndicators: true

        //     })
        //     .build();

        const exampleWorkflow = workflow('auto-example', 'Auto-Discovery Example')
            .step('screen-region-selector', 'screen-region-selector', {
                "mode": "rectangle",
                "timeout": 30000
            })
            .step('screenshot-tool', 'screenshot', {
                "top": {
                    "$ref": "screen-region-selector.top"
                },
                "left": {
                    "$ref": "screen-region-selector.left"
                },
                "width": {
                    "$ref": "screen-region-selector.width"
                },
                "height": {
                    "$ref": "screen-region-selector.height"
                }
            })
            .step('tesseract-ocr-tool', 'tesseract-ocr', {
                "$ref": "screenshot-tool"
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

    // Semantic reference handlers
    ipcMain.handle('validate-semantic-references', (_, inputs, availableSteps, currentStepIndex) =>
        validateSemanticReferences(inputs, availableSteps, currentStepIndex)
    );
    ipcMain.handle('resolve-semantic-references', (_, inputs, context) =>
        resolveSemanticReferences(inputs, context)
    );
}