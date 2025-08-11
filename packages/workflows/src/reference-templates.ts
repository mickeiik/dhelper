// packages/workflows/src/reference-templates.ts
import type { WorkflowStep, StepResult } from '@app/types';
import { templateManager } from '@app/templates';

type ResolverFunction = (params: string | undefined, context: Context) => any;
type Context = { 
  currentStepIndex: number; 
  workflowSteps: WorkflowStep[]; 
  previousResults: Record<string, StepResult> 
};

export class ReferenceResolver {
  private resolvers = new Map<string, ResolverFunction>();
  
  constructor() {
    this.register('previous', this.resolvePrevious.bind(this));
    this.register('template', this.resolveTemplate.bind(this));
    this.register('step', this.resolveStep.bind(this));
  }
  
  private register(type: string, resolver: ResolverFunction): void {
    this.resolvers.set(type, resolver);
  }
  
  resolve(input: string, context: Context): any {
    const match = input.match(/^\{\{(\w+):?(.+)?\}\}$/);
    if (!match) return input;
    
    const [, type, params] = match;
    return this.resolvers.get(type)?.(params, context) ?? input;
  }

  private resolvePrevious(params: string | undefined, context: Context): any {
    if (context.currentStepIndex === 0) {
      throw new Error('No previous step available - this is the first step');
    }

    if (!params) {
      const previousStep = context.workflowSteps[context.currentStepIndex - 1];
      return { $ref: previousStep.id };
    }

    if (params.includes('.')) {
      const [toolType, property] = params.split('.', 2);
      const foundStep = this.findPreviousStepByToolType(toolType, context);
      return { $ref: `${foundStep.id}.${property}` };
    }

    if (params.includes(':')) {
      const [toolType, property] = params.split(':', 2);
      const foundStep = this.findPreviousStepByToolType(toolType, context);
      return property ? { $ref: `${foundStep.id}.${property}` } : { $ref: foundStep.id };
    }

    const previousStep = context.workflowSteps[context.currentStepIndex - 1];
    return { $ref: `${previousStep.id}.${params}` };
  }

  private async resolveTemplate(params: string | undefined, context: Context): Promise<any> {
    if (!params) return null;
    return templateManager.resolveTemplateReference(`{{template:${params}}}`);
  }

  private resolveStep(params: string | undefined, context: Context): any {
    if (!params) return null;
    
    const step = context.workflowSteps.find(s => s.id === params);
    return step ? { $ref: step.id } : null;
  }

  private findPreviousStepByToolType(toolType: string, context: Context): WorkflowStep {
    for (let i = context.currentStepIndex - 1; i >= 0; i--) {
      const step = context.workflowSteps[i];
      if (this.matchesToolType(String(step.toolId), toolType)) {
        return step;
      }
    }
    throw new Error(`No previous step of type "${toolType}" found in workflow`);
  }

  private matchesToolType(toolId: string, toolType: string): boolean {
    return toolId === toolType || 
           toolId.includes(toolType) || 
           toolId.startsWith(`${toolType}-`) || 
           toolId.endsWith(`-${toolType}`);
  }
}

const referenceResolver = new ReferenceResolver();

export function resolveSemanticReferences(
  inputs: unknown,
  context: Context
): unknown {
  if (!inputs) return inputs;

  if (typeof inputs === 'object' && inputs !== null && !Array.isArray(inputs)) {
    if ('$ref' in inputs && typeof (inputs as any).$ref === 'string') {
      const ref = (inputs as { $ref: string }).$ref;
      return referenceResolver.resolve(ref, context);
    }

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      resolved[key] = resolveSemanticReferences(value, context);
    }
    return resolved;
  }

  if (Array.isArray(inputs)) {
    return inputs.map(item => resolveSemanticReferences(item, context));
  }

  return inputs;
}

export function validateSemanticReferences(
  inputs: unknown,
  availableSteps: WorkflowStep[],
  currentStepIndex: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const context: Context = {
    currentStepIndex,
    workflowSteps: availableSteps,
    previousResults: {}
  };

  function validate(value: unknown, path: string = ''): void {
    if (!value || typeof value !== 'object') return;

    if ('$ref' in value && typeof (value as any).$ref === 'string') {
      const ref = (value as { $ref: string }).$ref;
      
      try {
        referenceResolver.resolve(ref, context);
      } catch (error) {
        errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
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