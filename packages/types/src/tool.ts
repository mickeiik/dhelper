export interface ToolMetadata {
  id: string;
  name: string;
}

export interface Tool extends ToolMetadata {
  initialize(inputs: any): Promise<any>;
  execute(inputs: any): Promise<any>;
}

export type ToolRegistry = Record<string, any>;

export type ToolId = keyof ToolRegistry;

export type ToolInput<T extends ToolId> = ToolRegistry[T] extends { input: infer I } ? I : any;

export type ToolOutput<T extends ToolId> = ToolRegistry[T] extends { output: infer O } ? O : any;