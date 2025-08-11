// packages/main/src/modules/WorkflowModule.ts
import { WorkflowRunner, ref, workflow, validateSemanticReferences, resolveSemanticReferences } from '@app/workflows'
import { WorkflowStorage } from '@app/storage'
import { ipcMain } from 'electron'
import { WorkflowError, StorageError, ErrorLogger } from '@app/types'
import { getToolManager } from './ToolModule.js';

const logger = new ErrorLogger('WorkflowModule');

const storage = new WorkflowStorage()
const workflowRunner = new WorkflowRunner(getToolManager(), storage)

export function initializeWorkflows() {

    // Workflow execution handlers
    ipcMain.handle('run-workflow', async (_, workflowId) => {
        try {
            const workflowResult = await storage.loadWorkflow(workflowId);

            if (workflowResult.success) {
                return await workflowRunner.run(workflowResult.data);
            } else {
                // Handle workflow not found case
                const error = new WorkflowError(`Workflow not found: ${workflowId}`, workflowId, { originalError: workflowResult.error });
                logger.logError(error);
                throw error;
            }
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to run workflow', workflowId, { originalError: error });
            logger.logError(workflowError);
            throw workflowError;
        }
    });

    ipcMain.handle('run-example-workflow', async () => {
        try {
            // if (workflowResult.success) {
            //     return await workflowRunner.run(workflowResult.data);
            // } else {
            //     // Handle workflow not found case
            //     const error = new WorkflowError(`Workflow not found: ${workflowId}`, workflowId, { originalError: workflowResult.error });
            //     logger.logError(error);
            //     throw error;
            // }

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

            return await workflowRunner.run(exampleWorkflow);
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to run workflow', 'Custom Workflow', { originalError: error });
            logger.logError(workflowError);
            throw workflowError;
        }
    })

    ipcMain.handle('run-custom-workflow', async (_, customWorkflow: import('@app/types').Workflow) => {
        try {
            const workflow = {
                id: customWorkflow.id,
                name: customWorkflow.name,
                description: 'Custom workflow built in UI',
                steps: customWorkflow.steps.map((step) => ({
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
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to run custom workflow', customWorkflow.id, { originalError: error });
            logger.logError(workflowError);
            throw workflowError;
        }
    });

    // Storage handlers
    ipcMain.handle('save-workflow', async (_, workflow, options) => {
        try {
            return await storage.saveWorkflow(workflow, options);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to save workflow', 'save', { originalError: error, workflowId: workflow.id });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('load-workflow', async (_, workflowId) => {
        try {
            return await storage.loadWorkflow(workflowId);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to load workflow', 'load', { originalError: error, workflowId });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('delete-workflow', async (_, workflowId) => {
        try {
            return await storage.deleteWorkflow(workflowId);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to delete workflow', 'delete', { originalError: error, workflowId });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('list-workflows', async () => {
        try {
            return await storage.listWorkflows();
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to list workflows', 'list', { originalError: error });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('workflow-exists', async (_, workflowId) => {
        try {
            return await storage.workflowExists(workflowId);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to check workflow exists', 'exists', { originalError: error, workflowId });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('get-storage-stats', async () => {
        try {
            return await storage.getStorageStats();
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to get storage stats', 'stats', { originalError: error });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('clear-all-workflows', async () => {
        try {
            return await storage.clearAllWorkflows();
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to clear all workflows', 'clearAll', { originalError: error });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('export-workflow', async (_, workflowId) => {
        try {
            return await storage.exportWorkflow(workflowId);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to export workflow', 'export', { originalError: error, workflowId });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('import-workflow', async (_, data) => {
        try {
            return await storage.importWorkflow(data);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to import workflow', 'import', { originalError: error });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('duplicate-workflow', async (_, sourceId, newId, newName) => {
        try {
            return await storage.duplicateWorkflow(sourceId, newId, newName);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to duplicate workflow', 'duplicate', { originalError: error, sourceId, newId });
            logger.logError(storageError);
            throw storageError;
        }
    });
    ipcMain.handle('search-workflows', async (_, query) => {
        try {
            return await storage.searchWorkflows(query);
        } catch (error) {
            const storageError = error instanceof StorageError ? error : new StorageError('Failed to search workflows', 'search', { originalError: error, query });
            logger.logError(storageError);
            throw storageError;
        }
    });

    // Cache handlers
    ipcMain.handle('clear-workflow-cache', async (_, workflowId) => {
        try {
            return await workflowRunner.clearWorkflowCache(workflowId);
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to clear workflow cache', workflowId, { originalError: error });
            logger.logError(workflowError);
            throw workflowError;
        }
    });
    ipcMain.handle('clear-all-caches', async () => {
        try {
            return await workflowRunner.clearAllCaches();
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to clear all caches', undefined, { originalError: error });
            logger.logError(workflowError);
            throw workflowError;
        }
    });
    ipcMain.handle('get-cache-stats', async (_, workflowId) => {
        try {
            return await workflowRunner.getCacheStats(workflowId);
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to get cache stats', workflowId, { originalError: error });
            logger.logError(workflowError);
            throw workflowError;
        }
    });

    // Semantic reference handlers
    ipcMain.handle('validate-semantic-references', async (_, inputs, availableSteps, currentStepIndex) => {
        try {
            return await validateSemanticReferences(inputs, availableSteps, currentStepIndex);
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to validate semantic references', undefined, { originalError: error, inputs, currentStepIndex });
            logger.logError(workflowError);
            throw workflowError;
        }
    });
    ipcMain.handle('resolve-semantic-references', async (_, inputs, context) => {
        try {
            return await resolveSemanticReferences(inputs, context);
        } catch (error) {
            const workflowError = error instanceof WorkflowError ? error : new WorkflowError('Failed to resolve semantic references', undefined, { originalError: error, inputs, context });
            logger.logError(workflowError);
            throw workflowError;
        }
    });
}