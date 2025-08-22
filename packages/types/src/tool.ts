// packages/types/src/tool.ts
export interface ToolInputField<T = unknown> {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'object' | 'array';
  description: string;
  required?: boolean;
  defaultValue?: T;
  options?: { value: T; label: string }[]; // For select type
  example?: T;
  placeholder?: string;
}

export interface ToolOutputField<T = unknown> {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  example?: T;
}

export type ToolInputFieldValue = string | number | boolean | object | unknown[] | Record<string, unknown>;

export interface ToolMetadata<TInput = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputFields?: ToolInputField[];
  outputFields?: ToolOutputField[];
  examples?: Array<{
    name: string;
    description: string;
    inputs: TInput | { $ref: string } | Record<string, unknown>;
  }>;
}

export interface TemplateManager {
  getAllTemplates?: () => Promise<unknown[]>;
  getTemplate?: (id: string) => Promise<unknown>;
  getTemplateByName?: (name: string) => Promise<unknown>;
  listTemplates?: () => Promise<unknown[]>;
  matchTemplates?: (screenImage: Buffer, options?: any) => Promise<unknown[]>;
  recordTemplateUsage?: (templateId: string, success: boolean) => Promise<void>;
  updateScaleCache?: (templateId: string, resolution: string, scale: number) => Promise<void>;
  [key: string]: any;
}

export interface ToolInitContext {
  overlayService?: import('./overlay.js').OverlayService;
  templateManager?: TemplateManager;
}

// Note: Tool class is now implemented in @app/tools/base.ts
// Old Tool interface removed - use the new Zod-based Tool class instead

// Re-export tool registry types from the tools package
export type { ToolId, ToolInput, ToolOutput } from '@app/tools';