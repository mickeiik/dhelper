// packages/types/src/workflow.ts
import type { ToolId, ToolInput } from './tool.js';

export interface WorkflowStep<T extends ToolId = ToolId> {
  id: string;
  toolId: T;
  inputs: WorkflowInputs<ToolInput<T>>;
  onError?: 'stop' | 'continue' | 'retry';
  retryCount?: number;
  delay?: number; // Delay in milliseconds before executing this step
  cache?: {
    enabled: boolean;
    key?: string; // Optional custom cache key
    persistent?: boolean; // Survive app restart
    ttl?: number; // Time to live in milliseconds
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  clearCache?: boolean; // Flag to clear cache on next run
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
  cacheStats?: {
    cacheHits: number;
    cacheMisses: number;
    stepsCached: string[];
  };
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
  fromCache?: boolean; // Indicates if result came from cache
  cacheKey?: string; // The cache key used
}

export interface WorkflowProgress {
  workflowId: string;
  stepId: string;
  status: 'started' | 'completed' | 'failed' | 'retrying';
  progress?: number; // 0-100
  message?: string;
  fromCache?: boolean; // Indicates if step used cache
}

