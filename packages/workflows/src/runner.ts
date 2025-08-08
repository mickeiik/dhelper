// packages/workflows/src/runner.ts
import { ToolManager } from '@app/tools';
import type {
  Workflow,
  WorkflowResult,
  WorkflowStep,
  StepResult,
  WorkflowInputs,
} from '@app/types';
import { WorkflowEventEmitter } from './events.js';
import { WorkflowCacheManager } from './cache.js';
import { WorkflowStorage } from '@app/storage';
import { resolveSemanticReferences } from './reference-templates.js';

export class WorkflowRunner extends WorkflowEventEmitter {
  private cacheManager: WorkflowCacheManager;
  private toolManager: ToolManager;
  constructor(toolManager: ToolManager, storage: WorkflowStorage) {
    super();
    this.toolManager = toolManager;
    this.cacheManager = new WorkflowCacheManager();
  }


  async run(workflow: Workflow): Promise<WorkflowResult> {
    const startTime = new Date();
    const stepResults: Record<string, StepResult> = {};
    const cacheStats = {
      cacheHits: 0,
      cacheMisses: 0,
      stepsCached: [] as string[]
    };

    // Clear cache if requested
    if (workflow.clearCache) {
      await this.cacheManager.clearWorkflowCache(workflow.id);
    }

    this.emit('workflow-started', {
      workflowId: workflow.id,
      stepId: '',
      status: 'started' as const
    });

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepProgress = Math.round(((i + 1) / workflow.steps.length) * 100);

        const stepResult = await this.executeStep(step, stepResults, workflow.id, stepProgress, workflow, i);
        stepResults[step.id] = stepResult;

        // Update cache stats
        if (stepResult.fromCache) {
          cacheStats.cacheHits++;
        } else {
          cacheStats.cacheMisses++;
          if (step.cache?.enabled) {
            cacheStats.stepsCached.push(step.id);
          }
        }

        // Check if step failed and handle according to error strategy
        if (!stepResult.success) {
          const errorStrategy = step.onError || 'stop';

          if (errorStrategy === 'stop') {
            throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
          }
        }
      }

      const result: WorkflowResult = {
        workflowId: workflow.id,
        success: true,
        startTime,
        endTime: new Date(),
        stepResults,
        cacheStats
      };

      this.emit('workflow-completed', {
        workflowId: workflow.id,
        stepId: '',
        status: 'completed' as const
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const result: WorkflowResult = {
        workflowId: workflow.id,
        success: false,
        error: errorMessage,
        startTime,
        endTime: new Date(),
        stepResults,
        cacheStats
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
    progress: number,
    workflow?: Workflow,
    stepIndex?: number
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

    // Handle step delay if configured
    if (step.delay && step.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    while (retryCount <= maxRetries) {
      try {
        // Resolve all input references in a single pass
        const resolvedInputs = await this.resolveInputs(step.inputs, previousResults, workflow, stepIndex);

        // Check cache first if enabled
        let result: any = null;
        let fromCache = false;
        let cacheKey: string | undefined;

        if (step.cache?.enabled) {
          // // Get tool for cache configuration
          // const tool = await this.getToolInstance(step.toolId);
          // const toolCacheConfig = tool?.cacheConfig;

          // Generate cache key
          cacheKey = this.cacheManager.generateCacheKey(
            step.id,
            step.toolId,
            resolvedInputs,
            step.cache.key
          );

          // Try to get from cache
          const cachedResult = await this.cacheManager.get(workflowId, cacheKey);
          if (cachedResult !== null) {
            result = cachedResult;
            fromCache = true;

            this.emit('step-completed', {
              workflowId,
              stepId: step.id,
              status: 'completed' as const,
              progress,
              fromCache: true
            });
          }
        }

        // Execute tool if not cached
        if (!fromCache) {
          result = await this.toolManager.runTool(step.toolId, resolvedInputs);

          // Cache the result if caching is enabled
          if (step.cache?.enabled && cacheKey) {
            const tool = await this.getToolInstance(step.toolId);
            const toolCacheConfig = tool?.cacheConfig;

            await this.cacheManager.set(workflowId, cacheKey, result, {
              ttl: step.cache.ttl || toolCacheConfig?.ttl
            });
          }

          this.emit('step-completed', {
            workflowId,
            stepId: step.id,
            status: 'completed' as const,
            progress,
            fromCache: false
          });
        }

        const stepResult: StepResult = {
          stepId: step.id,
          toolId: step.toolId,
          success: true,
          result,
          startTime,
          endTime: new Date(),
          retryCount,
          fromCache,
          cacheKey
        };

        return stepResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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

  private async getToolInstance(toolId: string): Promise<any> {
    // This is a bit of a hack - we need access to the actual tool instance
    // In a real implementation, you might want to expose this through ToolManager
    try {
      return this.toolManager['tools']?.get(toolId)?.tool;
    } catch {
      return null;
    }
  }

  private async resolveInputs(
    inputs: WorkflowInputs<any>,
    previousResults: Record<string, StepResult>,
    workflow?: Workflow,
    stepIndex?: number
  ): Promise<any> {
    if (inputs === null || inputs === undefined) {
      return inputs;
    }

    // Resolve semantic references first if workflow context is available
    if (workflow && stepIndex !== undefined) {
      const context = {
        currentStepIndex: stepIndex,
        workflowSteps: workflow.steps,
        previousResults
      };

      try {
        inputs = resolveSemanticReferences(inputs, context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown semantic reference error';
        throw new Error(`Semantic reference resolution failed: ${errorMessage}`);
      }
    }

    // Handle reference objects
    if (typeof inputs === 'object' && inputs !== null) {
      // Handle $ref - reference to previous step output
      if ('$ref' in inputs && typeof inputs.$ref === 'string') {
        return this.resolveReference(inputs.$ref, previousResults);
      }

      // Handle $merge - merge multiple inputs
      if ('$merge' in inputs && Array.isArray(inputs.$merge)) {
        const resolved = await Promise.all(inputs.$merge.map((input: any) => this.resolveInputs(input, previousResults, workflow, stepIndex)));
        return Object.assign({}, ...resolved);
      }

      // Handle regular objects - recursively resolve properties
      if (Array.isArray(inputs)) {
        const resolved = [];
        for (const item of inputs) {
          resolved.push(await this.resolveInputs(item, previousResults, workflow, stepIndex));
        }
        return resolved;
      } else {
        const resolved: any = {};
        for (const [key, value] of Object.entries(inputs)) {
          resolved[key] = await this.resolveInputs(value, previousResults, workflow, stepIndex);
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

  // Public method to clear workflow cache
  async clearWorkflowCache(workflowId: string): Promise<void> {
    await this.cacheManager.clearWorkflowCache(workflowId);
  }

  // Public method to clear all caches
  async clearAllCaches(): Promise<void> {
    await this.cacheManager.clearAllCache();
  }

  // Get cache statistics
  getCacheStats(workflowId: string) {
    return this.cacheManager.getCacheStats(workflowId);
  }
}