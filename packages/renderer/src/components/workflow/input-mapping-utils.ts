import type { ToolOutputField } from '@app/types';

export interface InputOption {
  value: string;
  label: string;
  type: string;
  description?: string;
}

export function generateInputOptionsFromSources(
  connectedSources: Record<string, { toolId: string; outputFields: ToolOutputField[] }>
): InputOption[] {
  const options: InputOption[] = [];

  Object.entries(connectedSources).forEach(([sourceNodeId, sourceInfo]) => {
    sourceInfo.outputFields.forEach(field => {
      options.push({
        value: `${sourceInfo.toolId}:${field.name}`,
        label: `${sourceInfo.toolId}: ${field.name}`,
        type: field.type,
        description: field.description || `Output from ${sourceInfo.toolId}`
      });
    });
  });

  return options;
}