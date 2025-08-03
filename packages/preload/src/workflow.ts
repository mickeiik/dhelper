import { ipcRenderer } from 'electron';

export async function runWorkflow(id: string) {
    return await ipcRenderer.invoke('run-workflow', id)
}

export function onWorkflowProgress(callback: (progress: any) => void) {
    ipcRenderer.on('workflow-progress', (event, progress) => callback(progress))
}