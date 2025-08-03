import { ipcRenderer, IpcRendererEvent } from 'electron';

export async function runWorkflow(id: string) {
    return await ipcRenderer.invoke('run-workflow', id)
}

export function onWorkflowProgress(callback: (...args: any[]) => any) {
    ipcRenderer.on('workflow-progress', (event, ...args) => callback(...args))
}