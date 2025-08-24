// packages/preload/src/workflow.ts
import { ipcRenderer } from 'electron';
import type { Workflow, WorkflowProgress, WorkflowStep } from '@app/types';
import type { WorkflowListItem, SaveWorkflowOptions, StorageStats } from '@app/storage';
import { WorkflowSchema } from '@app/schemas';
import { z } from 'zod';

// Existing workflow execution
export async function runWorkflow(id: string) {
    const validatedId = z.string().min(1).parse(id);
    return await ipcRenderer.invoke('run-workflow', validatedId)
}

export async function runExampleWorkflow() {
    return await ipcRenderer.invoke('run-example-workflow')
}

export async function runCustomWorkflow(workflow: Workflow) {
    const validatedWorkflow = WorkflowSchema.parse(workflow);
    return await ipcRenderer.invoke('run-custom-workflow', validatedWorkflow)
}

export function onWorkflowProgress(callback: (progress: WorkflowProgress) => void) {
    ipcRenderer.on('workflow-progress', (_event, progress) => callback(progress))
}

// Cache management
export async function clearWorkflowCache(workflowId: string) {
    return await ipcRenderer.invoke('clear-workflow-cache', workflowId)
}

export async function clearAllCaches() {
    return await ipcRenderer.invoke('clear-all-caches')
}

export async function getCacheStats(workflowId: string) {
    return await ipcRenderer.invoke('get-cache-stats', workflowId)
}

// Workflow storage
export async function saveWorkflow(workflow: Workflow, options?: SaveWorkflowOptions) {
    const validatedWorkflow = WorkflowSchema.parse(workflow);
    return await ipcRenderer.invoke('save-workflow', validatedWorkflow, options)
}

export async function loadWorkflow(workflowId: string): Promise<Workflow | null> {
    return await ipcRenderer.invoke('load-workflow', workflowId)
}

export async function deleteWorkflow(workflowId: string): Promise<boolean> {
    return await ipcRenderer.invoke('delete-workflow', workflowId)
}

export async function listWorkflows(): Promise<WorkflowListItem[]> {
    return await ipcRenderer.invoke('list-workflows')
}

export async function workflowExists(workflowId: string): Promise<boolean> {
    return await ipcRenderer.invoke('workflow-exists', workflowId)
}

export async function getStorageStats(): Promise<StorageStats> {
    return await ipcRenderer.invoke('get-storage-stats')
}

export async function clearAllWorkflows() {
    return await ipcRenderer.invoke('clear-all-workflows')
}

export async function exportWorkflow(workflowId: string): Promise<string | null> {
    return await ipcRenderer.invoke('export-workflow', workflowId)
}

export async function importWorkflow(data: string): Promise<string> {
    return await ipcRenderer.invoke('import-workflow', data)
}

export async function duplicateWorkflow(sourceId: string, newId: string, newName?: string) {
    return await ipcRenderer.invoke('duplicate-workflow', sourceId, newId, newName)
}

export async function searchWorkflows(query: string): Promise<WorkflowListItem[]> {
    return await ipcRenderer.invoke('search-workflows', query)
}

// Semantic reference validation and resolution
export async function validateSemanticReferences(
    inputs: Record<string, unknown>,
    availableSteps: WorkflowStep[],
    currentStepIndex: number
): Promise<{ isValid: boolean; errors: string[] }> {
    return await ipcRenderer.invoke('validate-semantic-references', inputs, availableSteps, currentStepIndex)
}

export async function resolveSemanticReferences(
    inputs: Record<string, unknown>,
    context: { currentStepIndex: number; workflowSteps: WorkflowStep[]; previousResults: Record<string, unknown> }
): Promise<unknown> {
    return await ipcRenderer.invoke('resolve-semantic-references', inputs, context)
}