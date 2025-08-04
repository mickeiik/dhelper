// packages/workflows/src/builder.ts
import type { ToolId, ToolInput, Workflow, WorkflowStep, WorkflowInputs } from '@app/types';

export function createWorkflow(id: string, name: string, steps: WorkflowStep[], description?: string): Workflow {
  return { id, name, description, steps };
}

export function createStep<T extends ToolId>(
  id: string,
  toolId: T,
  inputs: WorkflowInputs<ToolInput<T>>,
  options?: {
    onError?: 'stop' | 'continue' | 'retry';
    retryCount?: number;
    cache?: {
      enabled: boolean;
      key?: string;
      persistent?: boolean;
      ttl?: number;
    };
  }
): WorkflowStep<T> {
  return {
    id,
    toolId,
    inputs,
    ...options
  };
}

export class WorkflowBuilder {
  private steps: WorkflowStep[] = [];

  constructor(
    private id: string,
    private name: string,
    private description?: string
  ) { }

  step<T extends ToolId>(
    id: string,
    toolId: T,
    inputs: WorkflowInputs<ToolInput<T>>,
    options?: {
      onError?: 'stop' | 'continue' | 'retry';
      retryCount?: number;
      cache?: {
        enabled: boolean;
        key?: string;
        persistent?: boolean;
        ttl?: number;
      };
    }
  ): this {
    this.steps.push(createStep(id, toolId, inputs, options));
    return this;
  }

  // Convenience method for cacheable steps
  cachedStep<T extends ToolId>(
    id: string,
    toolId: T,
    inputs: WorkflowInputs<ToolInput<T>>,
    cacheOptions?: {
      key?: string;
      persistent?: boolean;
      ttl?: number;
    },
    stepOptions?: {
      onError?: 'stop' | 'continue' | 'retry';
      retryCount?: number;
    }
  ): this {
    return this.step(id, toolId, inputs, {
      ...stepOptions,
      cache: {
        enabled: true,
        ...cacheOptions
      }
    });
  }

  build(): Workflow {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      steps: this.steps
    };
  }
}

export function workflow(id: string, name: string, description?: string): WorkflowBuilder {
  return new WorkflowBuilder(id, name, description);
}

export function ref<T extends string>(stepId: T): { $ref: T };
export function ref<T extends string, P extends string>(
  stepId: T,
  path: P
): { $ref: `${T}.${P}` };
export function ref(stepId: string, path?: string): { $ref: string } {
  return { $ref: path ? `${stepId}.${path}` : stepId };
}

export function merge<T extends readonly WorkflowInputs<any>[]>(
  ...inputs: T
): { $merge: T } {
  return { $merge: inputs };
}