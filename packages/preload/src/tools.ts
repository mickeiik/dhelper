import type { ToolMetadata, Workflow } from '@app/types';
import type { WorkflowListItem, SaveWorkflowOptions } from '@app/storage';
import { ipcRenderer } from 'electron';

export async function getTools(): Promise<ToolMetadata[]> {
  return await ipcRenderer.invoke('get-tools')
}
