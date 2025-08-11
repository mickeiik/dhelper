import type { ToolMetadata } from '@app/types';
import { ipcRenderer } from 'electron';

export async function getTools(): Promise<ToolMetadata[]> {
  return await ipcRenderer.invoke('get-tools')
}

export async function runTool(toolId: string, inputs: Record<string, unknown>): Promise<unknown> {
  return await ipcRenderer.invoke('run-tool', toolId, inputs)
}
