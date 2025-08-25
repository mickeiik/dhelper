import { ToolMetadataSchema } from '@app/schemas';
import { ToolId, ToolInput } from '@app/types/src/tool.js';
import { ipcRenderer } from 'electron';
import { z } from 'zod';

type ToolMetadata = z.infer<typeof ToolMetadataSchema>

export async function getTools(): Promise<ToolMetadata[]> {
  return await ipcRenderer.invoke('get-tools')
}

export async function runTool<T extends ToolId>(toolId: T, inputs: ToolInput<T>): Promise<unknown> {
  return await ipcRenderer.invoke('run-tool', toolId, inputs)
}
