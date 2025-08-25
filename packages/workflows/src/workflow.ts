import { z } from 'zod';
import { get } from 'lodash';
import { ToolManager } from '@app/tools';
import { WorkflowSchema, StepResultSchema, WorkflowStep, WorkflowResultSchema, WorkflowStepInputSchema, WorkflowExecutionData } from '@app/schemas';

type StepResult = z.infer<typeof StepResultSchema>;
type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
type WorkflowStepInput = z.infer<typeof WorkflowStepInputSchema>;

export class Workflow {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  private readonly steps: WorkflowStep[];

  private stepResults: Record<string, StepResult> = {};

  constructor(data: z.infer<typeof WorkflowSchema>) {
    const validated = WorkflowSchema.parse(data);

    this.id = validated.id;
    this.name = validated.name;
    this.description = validated.description;
    this.steps = validated.steps;
  }

  static fromRaw(data: unknown): Workflow {
    return new Workflow(WorkflowSchema.parse(data));
  }

  async execute(toolManager: ToolManager): Promise<WorkflowResult> {
    try {
      const startTime = new Date();
      this.stepResults = {};

      for (const step of this.steps) {
        if (step.replayLastSuccess && step.lastSuccessResult) {
          this.stepResults[step.id] = step.lastSuccessResult;
        } else {
          const stepResult = await this.executeStep(step, toolManager);
          this.stepResults[step.id] = stepResult;

          if (!stepResult.success && step.onError === 'stop') {
            break;
          }
          step.lastSuccessResult = stepResult;
        }
      }

      const result = {
        workflowId: this.id,
        startTime,
        endTime: new Date(),
        stepResults: this.stepResults
      };

      return WorkflowResultSchema.parse({
        success: true,
        data: result
      });
    } catch (error) {
      return WorkflowResultSchema.parse({
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'WORKFLOW_ERROR' as const,
          details: { workflowId: this.id, stepResults: this.stepResults }
        }
      });
    }
  }

  private async executeStep(step: WorkflowStep, toolManager: ToolManager): Promise<StepResult> {
    const startTime = new Date();

    try {
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
      // Resolve inputs and execute  
      const resolvedInputs = this.resolveInputs(step.inputs);
      const result = await toolManager.runTool(step.toolId, resolvedInputs);

      return StepResultSchema.parse({
        stepId: step.id,
        toolId: step.toolId,
        success: true,
        data: result,
        startTime,
        endTime: new Date(),
        retryCount: 0
      });
    } catch (error) {
      return StepResultSchema.parse({
        stepId: step.id,
        toolId: step.toolId,
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'WORKFLOW_STEP_ERROR' as const,
          details: { workflowId: this.id, stepResults: this.stepResults }
        },
        startTime,
        endTime: new Date(),
        retryCount: 0
      });
    }
  }

  private resolveInputs(inputs: WorkflowStepInput): any {
    if (inputs === null || inputs === undefined) {
      return inputs;
    }

    if (typeof inputs === 'object' && inputs !== null) {
      // Handle $ref - reference to previous step output
      if ('$ref' in inputs && typeof inputs.$ref === 'string') {
        return this.resolveReference(inputs.$ref);
      }

      // Handle arrays
      if (Array.isArray(inputs)) {
        return inputs.map(item => this.resolveInputs(item));
      }

      // Handle objects
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(inputs)) {
        resolved[key] = this.resolveInputs(value);
      }
      return resolved;
    }

    return inputs;
  }

  private resolveReference(ref: string): any {
    const parts = ref.split('.');
    const stepId = parts[0];
    const stepResult = this.stepResults[stepId];

    if (!stepResult?.success) {
      throw new Error(`Step "${stepId}" not found or failed`);
    }

    // If only step ID, return the entire result
    if (parts.length === 1) {
      return stepResult.data;
    }

    // Use lodash.get for safe nested property access
    const propertyPath = parts.slice(1).join('.');
    return get(stepResult.data, propertyPath);
  }

  // Simple getters
  get stepCount(): number {
    return this.steps.length;
  }

  getStepResult(stepId: string): StepResult | undefined {
    return this.stepResults[stepId];
  }
}