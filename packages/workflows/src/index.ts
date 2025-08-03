// packages/workflows/src/index.ts
import { ToolManager } from '@app/tools';
import type { ToolId, ToolInput, ToolOutput } from '@app/tools';

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

// Progress events
export interface WorkflowProgress {
  workflowId: string;
  stepId: string;
  status: 'started' | 'completed' | 'failed' | 'retrying';
  progress?: number; // 0-100
  message?: string;
}

export class WorkflowRunner {
  private listeners = new Map<string, Function[]>();

  constructor(private toolManager: ToolManager) { }

  async run(workflow: Workflow): Promise<WorkflowResult> {
    const startTime = new Date();
    const stepResults: Record<string, StepResult> = {};

    this.emit('workflow-started', {
      workflowId: workflow.id,
      stepId: '',
      status: 'started' as const
    });

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepProgress = Math.round(((i + 1) / workflow.steps.length) * 100);

        const stepResult = await this.executeStep(step, stepResults, workflow.id, stepProgress);
        stepResults[step.id] = stepResult;

        // Check if step failed and handle according to error strategy
        if (!stepResult.success) {
          const errorStrategy = step.onError || 'stop';

          if (errorStrategy === 'stop') {
            console.error(`🛑 Workflow stopped due to failed step: ${step.id}`);
            throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
          } else if (errorStrategy === 'continue') {
            console.warn(`⚠️ Step ${step.id} failed but continuing: ${stepResult.error}`);
          }
        }
      }

      const result: WorkflowResult = {
        workflowId: workflow.id,
        success: true,
        startTime,
        endTime: new Date(),
        stepResults
      };

      this.emit('workflow-completed', {
        workflowId: workflow.id,
        stepId: '',
        status: 'completed' as const
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Workflow "${workflow.id}" failed:`, errorMessage);

      const result: WorkflowResult = {
        workflowId: workflow.id,
        success: false,
        error: errorMessage,
        startTime,
        endTime: new Date(),
        stepResults
      };

      this.emit('workflow-failed', {
        workflowId: workflow.id,
        stepId: '',
        status: 'failed' as const,
        message: result.error
      });

      return result; // Return failed result instead of throwing
    }
  }

  private async executeStep(
    step: WorkflowStep,
    previousResults: Record<string, StepResult>,
    workflowId: string,
    progress: number
  ): Promise<StepResult> {
    const startTime = new Date();
    let retryCount = 0;
    const maxRetries = step.retryCount || 0;

    this.emit('step-started', {
      workflowId,
      stepId: step.id,
      status: 'started' as const,
      progress
    });

    while (retryCount <= maxRetries) {
      try {
        // Resolve inputs by replacing references with actual data
        const resolvedInputs = this.resolveInputs(step.inputs, previousResults);

        // Execute the tool
        const result = await this.toolManager.runTool(step.toolId, resolvedInputs);

        const stepResult: StepResult = {
          stepId: step.id,
          toolId: step.toolId,
          success: true,
          result,
          startTime,
          endTime: new Date(),
          retryCount
        };

        this.emit('step-completed', {
          workflowId,
          stepId: step.id,
          status: 'completed' as const,
          progress
        });

        return stepResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Step "${step.id}" failed: ${errorMessage}`); // Add logging

        retryCount++;

        if (retryCount <= maxRetries) {
          this.emit('step-retrying', {
            workflowId,
            stepId: step.id,
            status: 'retrying' as const,
            message: `Retry ${retryCount}/${maxRetries}: ${errorMessage}`
          });

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        } else {
          const stepResult: StepResult = {
            stepId: step.id,
            toolId: step.toolId,
            success: false,
            error: errorMessage,
            startTime,
            endTime: new Date(),
            retryCount: retryCount - 1
          };

          this.emit('step-failed', {
            workflowId,
            stepId: step.id,
            status: 'failed' as const,
            message: stepResult.error
          });

          return stepResult; // Return failed result instead of throwing
        }
      }
    }

    throw new Error('This should never be reached');
  }

  private resolveInputs(inputs: WorkflowInputs<any>, previousResults: Record<string, StepResult>): any {
    if (inputs === null || inputs === undefined) {
      return inputs;
    }

    // Handle reference objects
    if (typeof inputs === 'object' && inputs !== null) {
      // Handle $ref - reference to previous step output
      if ('$ref' in inputs && typeof inputs.$ref === 'string') {
        return this.resolveReference(inputs.$ref, previousResults);
      }

      // Handle $merge - merge multiple inputs
      if ('$merge' in inputs && Array.isArray(inputs.$merge)) {
        const resolved = inputs.$merge.map((input: any) => this.resolveInputs(input, previousResults));
        return Object.assign({}, ...resolved);
      }

      // Handle regular objects - recursively resolve properties
      if (Array.isArray(inputs)) {
        return inputs.map(item => this.resolveInputs(item, previousResults));
      } else {
        const resolved: any = {};
        for (const [key, value] of Object.entries(inputs)) {
          resolved[key] = this.resolveInputs(value, previousResults);
        }
        return resolved;
      }
    }

    // Return primitive values as-is
    return inputs;
  }

  private resolveReference(ref: string, previousResults: Record<string, StepResult>): any {
    const parts = ref.split('.');
    const stepId = parts[0];

    const stepResult = previousResults[stepId];
    if (!stepResult) {
      throw new Error(`Referenced step "${stepId}" not found or not yet executed`);
    }

    if (!stepResult.success) {
      throw new Error(`Referenced step "${stepId}" failed: ${stepResult.error}`);
    }

    // If no path specified, return the entire result
    if (parts.length === 1) {
      return stepResult.result;
    }

    // Navigate the path to get nested data
    let current = stepResult.result;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) {
        throw new Error(`Cannot access property "${parts[i]}" on null/undefined value from step "${stepId}"`);
      }

      if (typeof current !== 'object') {
        throw new Error(`Cannot access property "${parts[i]}" on non-object value from step "${stepId}"`);
      }

      current = current[parts[i]];
    }

    return current;
  }

  // Event system for progress tracking
  on(event: string, callback: (progress: WorkflowProgress) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: WorkflowProgress) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in workflow event callback:', error);
        }
      });
    }
  }
}

// Enhanced creation functions with strict typing
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
  }
): WorkflowStep<T> {
  return {
    id,
    toolId,
    inputs,
    ...options
  };
}

// WorkflowBuilder with perfect autocomplete
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
    options?: { onError?: 'stop' | 'continue' | 'retry'; retryCount?: number }
  ): this {
    this.steps.push(createStep(id, toolId, inputs, options));
    return this;
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

// Reference and merge helpers
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