// packages/types/src/tool.ts
export interface ToolMetadata {
  id: string;
  name: string;
}

export interface Tool extends ToolMetadata {
  initialize(inputs: any): Promise<any>;
  execute(inputs: any): Promise<any>;
  cacheConfig?: {
    enabled: boolean;
    ttl?: number; // Optional expiration in milliseconds
    persistent?: boolean; // Survive app restart
    keyGenerator?: (inputs: any) => string; // Custom cache key generation
  };
}

export type ToolRegistry = Record<string, any>;

export type ToolId = keyof ToolRegistry;

export type ToolInput<T extends ToolId> = ToolRegistry[T] extends { input: infer I } ? I : any;

export type ToolOutput<T extends ToolId> = ToolRegistry[T] extends { output: infer O } ? O : any;