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

export type ToolInputFieldValue = string | number | boolean | object | unknown[] | Record<string, unknown>;

export interface ToolMetadata<TInput = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputFields?: ToolInputField[];
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

export interface Tool<TInput = Record<string, unknown>, TOutput = unknown> extends ToolMetadata<TInput> {
  initialize(context: ToolInitContext): Promise<void>;
  execute(inputs: TInput): Promise<TOutput>;
  cacheConfig?: {
    enabled: boolean;
    ttl?: number; // Optional expiration in milliseconds
    persistent?: boolean; // Survive app restart
    keyGenerator?: (inputs: TInput) => string; // Custom cache key generation
  };
}

// Base interface for compatibility with existing tools
export interface ToolBase extends Tool<Record<string, unknown>, unknown> {}

export interface ToolRegistry {
  // This will be augmented by individual tools
  [key: string]: {
    input: Record<string, unknown>;
    output: unknown;
  };
}

export type ToolId = keyof ToolRegistry;

export type ToolInput<T extends ToolId> = ToolRegistry[T] extends { input: infer I } ? I : Record<string, unknown>;

export type ToolOutput<T extends ToolId> = ToolRegistry[T] extends { output: infer O } ? O : unknown;