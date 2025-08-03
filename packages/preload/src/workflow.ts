import { ipcRenderer } from 'electron';

export async function runWorkflow(id: string) {
    return await ipcRenderer.invoke('run-workflow', id)
}

export async function runCustomWorkflow(workflow: any) {
    return await ipcRenderer.invoke('run-custom-workflow', workflow)
}

export function onWorkflowProgress(callback: (progress: any) => void) {
    ipcRenderer.on('workflow-progress', (event, progress) => callback(progress))
}