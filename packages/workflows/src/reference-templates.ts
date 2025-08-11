// packages/workflows/src/reference-templates.ts
import type { WorkflowStep, StepResult } from '@app/types';
import { templateManager } from '@app/templates';

/**
 * Simple reference resolver for {{previous}} style template references
 * Replaces the overly complex multi-class architecture with straightforward string matching
 */
export function resolveSemanticReferences(
  inputs: unknown,
  context: { currentStepIndex: number; workflowSteps: WorkflowStep[]; previousResults: Record<string, StepResult> }
): unknown {
  if (!inputs) return inputs;

  // Handle objects recursively
  if (typeof inputs === 'object' && inputs !== null && !Array.isArray(inputs)) {
    // Handle $ref objects
    if ('$ref' in inputs && typeof (inputs as any).$ref === 'string') {
      const inputs_with_ref = inputs as { $ref: string };
      const ref = inputs_with_ref.$ref;
      
      // {{previous}} - get previous step result
      if (ref === '{{previous}}') {
        if (context.currentStepIndex === 0) {
          throw new Error('No previous step available - this is the first step');
        }
        const previousStep = context.workflowSteps[context.currentStepIndex - 1];
        return { $ref: previousStep.id };
      }

      // {{previous.property}} - get property from previous step
      const prevMatch = ref.match(/^\{\{previous\.(.+)\}\}$/);
      if (prevMatch) {
        if (context.currentStepIndex === 0) {
          throw new Error('No previous step available - this is the first step');
        }
        const previousStep = context.workflowSteps[context.currentStepIndex - 1];
        return { $ref: `${previousStep.id}.${prevMatch[1]}` };
      }

      // {{previous:toolType}} - get result from previous step of specific tool type
      const prevToolMatch = ref.match(/^\{\{previous:([^.}]+)\}\}$/);
      if (prevToolMatch) {
        const toolType = prevToolMatch[1];
        const foundStep = findPreviousStepByToolType(toolType, context);
        return { $ref: foundStep.id };
      }

      // {{previous:toolType.property}} - get property from previous step of specific tool type
      const prevToolPropMatch = ref.match(/^\{\{previous:([^.}]+)\.(.+)\}\}$/);
      if (prevToolPropMatch) {
        const toolType = prevToolPropMatch[1];
        const property = prevToolPropMatch[2];
        const foundStep = findPreviousStepByToolType(toolType, context);
        return { $ref: `${foundStep.id}.${property}` };
      }

      // {{template:reference}} - resolve template reference
      const templateMatch = ref.match(/^\{\{template:(.+)\}\}$/);
      if (templateMatch) {
        const templateRef = templateMatch[1];
        return templateManager.resolveTemplateReference(ref);
      }

      // Return unchanged if no pattern matches
      return inputs;
    }

    // Recursively process object properties
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      resolved[key] = resolveSemanticReferences(value, context);
    }
    return resolved;
  }

  // Handle arrays
  if (Array.isArray(inputs)) {
    return inputs.map(item => resolveSemanticReferences(item, context));
  }

  // Return primitives unchanged
  return inputs;
}

/**
 * Find the most recent step of a specific tool type
 */
function findPreviousStepByToolType(
  toolType: string, 
  context: { currentStepIndex: number; workflowSteps: WorkflowStep[] }
): WorkflowStep {
  for (let i = context.currentStepIndex - 1; i >= 0; i--) {
    const step = context.workflowSteps[i];
    if (matchesToolType(String(step.toolId), toolType)) {
      return step;
    }
  }
  throw new Error(`No previous step of type "${toolType}" found in workflow`);
}

/**
 * Simple tool type matching
 */
function matchesToolType(toolId: string, toolType: string): boolean {
  return toolId === toolType || 
         toolId.includes(toolType) || 
         toolId.startsWith(`${toolType}-`) || 
         toolId.endsWith(`-${toolType}`);
}

/**
 * Simple validation function for UI - checks basic syntax without complex logic
 */
export function validateSemanticReferences(
  inputs: unknown,
  availableSteps: WorkflowStep[],
  currentStepIndex: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  function validate(value: unknown, path: string = ''): void {
    if (!value || typeof value !== 'object') return;

    if ('$ref' in value && typeof (value as any).$ref === 'string') {
      const value_with_ref = value as { $ref: string };
      const ref = value_with_ref.$ref;
      
      // Check {{previous}} references
      if (ref === '{{previous}}' && currentStepIndex === 0) {
        errors.push(`${path}: No previous step available - this is the first step`);
      }
      
      // Check {{previous:toolType}} references
      const toolTypeMatch = ref.match(/^\{\{previous:([^.}]+)/);
      if (toolTypeMatch) {
        const toolType = toolTypeMatch[1];
        let found = false;
        for (let i = currentStepIndex - 1; i >= 0; i--) {
          if (matchesToolType(String(availableSteps[i].toolId), toolType)) {
            found = true;
            break;
          }
        }
        if (!found) {
          errors.push(`${path}: No previous step of type "${toolType}" found`);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => validate(item, `${path}[${i}]`));
    } else {
      Object.entries(value).forEach(([key, val]) => 
        validate(val, path ? `${path}.${key}` : key)
      );
    }
  }

  validate(inputs);
  return { isValid: errors.length === 0, errors };
}