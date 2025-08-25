// packages/preload/src/workflow.ts
import { ipcRenderer } from 'electron';
import { WorkflowStorageListItemSchema, WorkflowSchema } from '@app/schemas';
import { z } from 'zod';

type Workflow = z.infer<typeof WorkflowSchema>;
type WorkflowStorageListItem = z.infer<typeof WorkflowStorageListItemSchema>;

export async function runWorkflow(id: string) {
    return await ipcRenderer.invoke('run-workflow', id)
}

export async function runExampleWorkflow() {
    return await ipcRenderer.invoke('run-example-workflow')
}

export async function runCustomWorkflow(workflow: Workflow) {
    return await ipcRenderer.invoke('run-custom-workflow', workflow)
}

// Workflow storage
export async function saveWorkflow(workflow: Workflow) {
    return await ipcRenderer.invoke('save-workflow', workflow)
}

export async function loadWorkflow(workflowId: string): Promise<Workflow | null> {
    return await ipcRenderer.invoke('load-workflow', workflowId)
}

export async function deleteWorkflow(workflowId: string): Promise<boolean> {
    return await ipcRenderer.invoke('delete-workflow', workflowId)
}

export async function listWorkflows(): Promise<WorkflowStorageListItem[]> {
    return await ipcRenderer.invoke('list-workflows')
}

export async function workflowExists(workflowId: string): Promise<boolean> {
    return await ipcRenderer.invoke('workflow-exists', workflowId)
}

export async function clearAllWorkflows() {
    return await ipcRenderer.invoke('clear-all-workflows')
}

export async function searchWorkflows(query: string): Promise<WorkflowStorageListItem[]> {
    return await ipcRenderer.invoke('search-workflows', query)
}