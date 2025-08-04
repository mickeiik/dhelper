import type { ToolId, ToolInput } from './tool.js';

export interface WorkflowStep<T extends ToolId = ToolId> {
  id: string;
  toolId: T;
  inputs: WorkflowInputs<ToolInput<T>>;
  onError?: 'stop' | 'continue' | 'retry';
  retryCount?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

export type WorkflowInputs<T = any> =
  | T                                    // Static inputs of correct type
  | { $ref: string }                    // Reference to previous step
  | { $merge: WorkflowInputs<any>[] }   // Merge multiple inputs
  | (T extends object ? {               // Object with mixed input types
    [K in keyof T]: T[K] extends (string | number | boolean | null | undefined)
    ? T[K] | { $ref: string }      // For primitives: just the type OR a reference
    : WorkflowInputs<T[K]>;        // For complex types: full WorkflowInputs recursively
  } : never);

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  error?: string;
  startTime: Date;
  endTime?: Date;
  stepResults: Record<string, StepResult>;
}

export interface StepResult {
  stepId: string;
  toolId: string;
  success: boolean;
  result?: any;
  error?: string;
  startTime: Date;
  endTime: Date;
  retryCount: number;
}

export interface WorkflowProgress {
  workflowId: string;
  stepId: string;
  status: 'started' | 'completed' | 'failed' | 'retrying';
  progress?: number; // 0-100
  message?: string;
}