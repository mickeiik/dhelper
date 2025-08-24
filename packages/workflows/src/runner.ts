// packages/workflows/src/runner.ts
import { ToolManager } from '@app/tools';
import type {
  Workflow,
  WorkflowResult,
  WorkflowStep,
  StepResult,
  WorkflowInputs,
} from '@app/types';
import { WorkflowError, ToolExecutionError } from '@app/types';
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
            throw new WorkflowError(`Step ${step.id} failed: ${stepResult.error}`, workflow.id, { stepId: step.id, stepResult });
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
        let result: unknown = null;
        let fromCache = false;
        let cacheKey: string | undefined;

        if (step.cache?.enabled) {
          // // Get tool for cache configuration
          // const tool = await this.getToolInstance(step.toolId);
          // const toolCacheConfig = tool?.cacheConfig;

          // Generate cache key
          cacheKey = this.cacheManager.generateCacheKey(
            String(step.id),
            String(step.toolId),
            resolvedInputs as Record<string, unknown>,
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
            try {
              const tool = await this.getToolInstance(String(step.toolId));
              const toolCacheConfig = tool?.cacheConfig;

              await this.cacheManager.set(workflowId, cacheKey, result, {
                ttl: step.cache.ttl || toolCacheConfig?.ttl
              });
            } catch (error) {
              // If tool instance can't be retrieved, use step cache config only
              await this.cacheManager.set(workflowId, cacheKey, result, {
                ttl: step.cache.ttl
              });
            }
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
          stepId: String(step.id),
          toolId: String(step.toolId),
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
            stepId: String(step.id),
            toolId: String(step.toolId),
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

    throw new WorkflowError('Workflow execution reached unreachable code', workflowId, { step });
  }

  private async getToolInstance(toolId: string): Promise<any> {
    // This is a bit of a hack - we need access to the actual tool instance
    // In a real implementation, you might want to expose this through ToolManager
    try {
      return this.toolManager['tools']?.get(toolId)?.tool;
    } catch (error) {
      throw new ToolExecutionError('Failed to get tool instance', toolId, { originalError: error });
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
        throw new WorkflowError('Semantic reference resolution failed', workflow?.id, { 
          stepIndex, 
          originalError: error,
          inputs 
        });
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
        const resolved = await Promise.all(inputs.$merge.map((input: unknown) => this.resolveInputs(input, previousResults, workflow, stepIndex)));
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
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(inputs)) {
          resolved[key] = await this.resolveInputs(value, previousResults, workflow, stepIndex);
        }
        return resolved;
      }
    }

    // Return primitive values as-is
    return inputs;
  }

  /**
   * Parse a reference path that supports both dot notation and array index notation
   * Examples:
   * - "step.property" → ["step", "property"]
   * - "step.array[0]" → ["step", "array", 0]
   * - "step.array[0].property" → ["step", "array", 0, "property"]
   * - "step.object.nested[1].value" → ["step", "object", "nested", 1, "value"]
   */
  private parsePath(ref: string): (string | number)[] {
    const parts: (string | number)[] = [];
    let current = '';
    let i = 0;

    while (i < ref.length) {
      const char = ref[i];

      if (char === '.') {
        // End of current part
        if (current) {
          parts.push(current);
          current = '';
        }
      } else if (char === '[') {
        // Start of array index
        if (current) {
          parts.push(current);
          current = '';
        }

        // Find the closing bracket
        const closeIndex = ref.indexOf(']', i);
        if (closeIndex === -1) {
          throw new WorkflowError(`Invalid reference syntax: missing closing bracket in "${ref}"`, undefined, { ref });
        }

        // Extract and validate the index
        const indexStr = ref.slice(i + 1, closeIndex);
        if (!indexStr) {
          throw new WorkflowError(`Invalid reference syntax: empty array index in "${ref}"`, undefined, { ref });
        }

        // Check if it's a valid number
        const index = parseInt(indexStr, 10);
        if (isNaN(index) || index < 0 || !Number.isInteger(index)) {
          throw new WorkflowError(`Invalid reference syntax: array index must be a non-negative integer, got "${indexStr}" in "${ref}"`, undefined, { ref, invalidIndex: indexStr });
        }

        parts.push(index);
        i = closeIndex; // Skip to after the closing bracket
      } else {
        // Regular character
        current += char;
      }

      i++;
    }

    // Add any remaining current part
    if (current) {
      parts.push(current);
    }

    if (parts.length === 0) {
      throw new WorkflowError(`Invalid reference syntax: empty reference "${ref}"`, undefined, { ref });
    }

    return parts;
  }

  private resolveReference(ref: string, previousResults: Record<string, StepResult>): unknown {
    const parts = this.parsePath(ref);
    const stepId = parts[0] as string;

    const stepResult = previousResults[stepId];
    if (!stepResult) {
      throw new WorkflowError(`Referenced step "${stepId}" not found or not yet executed`, undefined, { stepId, availableSteps: Object.keys(previousResults) });
    }

    if (!stepResult.success) {
      throw new WorkflowError(`Referenced step "${stepId}" failed: ${stepResult.error}`, undefined, { stepId, stepResult });
    }

    // If no path specified, return the entire result
    if (parts.length === 1) {
      return stepResult.result;
    }

    // Navigate the path to get nested data
    let current = stepResult.result;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      
      if (current === null || current === undefined) {
        throw new WorkflowError(`Cannot access ${typeof part === 'number' ? `index [${part}]` : `property "${part}"`} on null/undefined value from step "${stepId}"`, undefined, { stepId, property: part, value: current });
      }

      if (typeof part === 'number') {
        // Array index access
        if (!Array.isArray(current)) {
          throw new WorkflowError(`Cannot access array index [${part}] on non-array value from step "${stepId}"`, undefined, { stepId, index: part, value: current, valueType: typeof current });
        }

        if (part >= current.length) {
          throw new WorkflowError(`Array index [${part}] out of bounds for array of length ${current.length} from step "${stepId}"`, undefined, { stepId, index: part, arrayLength: current.length });
        }

        current = current[part];
      } else {
        // Object property access
        if (typeof current !== 'object') {
          throw new WorkflowError(`Cannot access property "${part}" on non-object value from step "${stepId}"`, undefined, { stepId, property: part, value: current, valueType: typeof current });
        }

        current = (current as Record<string, unknown>)[part];
      }
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