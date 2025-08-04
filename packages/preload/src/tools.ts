import type { Tool } from '@app/types';
import { ipcRenderer } from 'electron';

export async function getTools(): Promise<Tool[]> {
  return await ipcRenderer.invoke('get-tools')
}