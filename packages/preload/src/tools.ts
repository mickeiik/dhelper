import { Tool } from '@app/tools';
import { ipcRenderer } from 'electron';

export async function getTools(): Promise<Tool[]> {
  return await ipcRenderer.invoke('get-tools')
}