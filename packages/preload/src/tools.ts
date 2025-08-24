import type { ToolMetadata } from '@app/types';
import { ipcRenderer } from 'electron';
import { z } from 'zod';

export async function getTools(): Promise<ToolMetadata[]> {
  return await ipcRenderer.invoke('get-tools')
}

export async function runTool(toolId: string, inputs: Record<string, unknown>): Promise<unknown> {
  // Validate inputs before sending to main process
  const validatedToolId = z.string().min(1).parse(toolId);
  const validatedInputs = z.record(z.unknown()).parse(inputs);
  return await ipcRenderer.invoke('run-tool', validatedToolId, validatedInputs)
}
