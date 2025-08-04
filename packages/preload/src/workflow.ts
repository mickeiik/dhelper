// packages/preload/src/workflow.ts
import { ipcRenderer } from 'electron';

export async function runWorkflow(id: string) {
    return await ipcRenderer.invoke('run-workflow', id)
}

export async function runCustomWorkflow(workflow: any) {
    return await ipcRenderer.invoke('run-custom-workflow', workflow)
}

export function onWorkflowProgress(callback: (progress: any) => void) {
    ipcRenderer.on('workflow-progress', (_event, progress) => callback(progress))
}

export async function clearWorkflowCache(workflowId: string) {
    return await ipcRenderer.invoke('clear-workflow-cache', workflowId)
}

export async function clearAllCaches() {
    return await ipcRenderer.invoke('clear-all-caches')
}

export async function getCacheStats(workflowId: string) {
    return await ipcRenderer.invoke('get-cache-stats', workflowId)
}