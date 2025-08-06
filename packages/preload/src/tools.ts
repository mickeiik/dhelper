import type { ToolMetadata } from '@app/types';
import { ipcRenderer } from 'electron';

export async function getTools(): Promise<ToolMetadata[]> {
  return await ipcRenderer.invoke('get-tools')
}
