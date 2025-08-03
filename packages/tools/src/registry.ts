export interface ToolRegistry {}

export type ToolId = keyof ToolRegistry;

// Input/Output types for registered tools
export type ToolInput<T extends ToolId> = ToolRegistry[T]['input'];
export type ToolOutput<T extends ToolId> = ToolRegistry[T]['output'];