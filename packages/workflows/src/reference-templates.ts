// packages/workflows/src/reference-templates.ts
import type { WorkflowStep, ReferenceResolutionContext } from '@app/types';
import { templateManager } from '@app/templates';

export interface SemanticReference {
  type: 'previous' | 'previous:toolType' | 'step' | 'template';
  toolType?: string;
  stepId?: string;
  templateRef?: string; // For template references like "template-id" or "category/name"
  property?: string;
}


export class ReferenceTemplateParser {
  private static readonly TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

  /**
   * Parse a reference string and extract semantic reference information
   */
  static parseReference(ref: string): SemanticReference | null {
    const match = ref.match(/^\{\{(.+)\}\}$/);
    if (!match) return null;

    const content = match[1].trim();
    const [refPart, ...propertyParts] = content.split('.');
    const property = propertyParts.length > 0 ? propertyParts.join('.') : undefined;

    if (refPart === 'previous') {
      return { type: 'previous', property };
    }

    if (refPart.startsWith('previous:')) {
      const toolType = refPart.substring('previous:'.length);
      return { type: 'previous:toolType', toolType, property };
    }

    if (refPart.startsWith('step:')) {
      const stepId = refPart.substring('step:'.length);
      return { type: 'step', stepId, property };
    }

    if (refPart.startsWith('template:')) {
      const templateRef = refPart.substring('template:'.length);
      return { type: 'template', templateRef, property };
    }

    return null;
  }

  /**
   * Check if a string contains semantic reference templates
   */
  static hasTemplates(str: string): boolean {
    return this.TEMPLATE_REGEX.test(str);
  }

  /**
   * Extract all semantic references from a string
   */
  static extractTemplates(str: string): string[] {
    const matches = Array.from(str.matchAll(this.TEMPLATE_REGEX));
    return matches.map(match => match[0]);
  }

  /**
   * Resolve a semantic reference to an actual step ID
   */
  static async resolveReference(
    semanticRef: SemanticReference,
    context: ReferenceResolutionContext
  ): Promise<string | any> {
    switch (semanticRef.type) {
      case 'previous':
        return this.resolvePrevious(context, semanticRef.property);
      
      case 'previous:toolType':
        if (!semanticRef.toolType) {
          throw new Error('Tool type is required for previous:toolType references');
        }
        return this.resolvePreviousToolType(semanticRef.toolType, context, semanticRef.property);
      
      case 'step':
        if (!semanticRef.stepId) {
          throw new Error('Step ID is required for step references');
        }
        return this.resolveStepReference(semanticRef.stepId, semanticRef.property);
      
      case 'template':
        if (!semanticRef.templateRef) {
          throw new Error('Template reference is required for template references');
        }
        return await this.resolveTemplateReference(semanticRef.templateRef, semanticRef.property);
      
      default:
        throw new Error(`Unknown semantic reference type: ${(semanticRef as any).type}`);
    }
  }

  private static resolvePrevious(
    context: ReferenceResolutionContext,
    property?: string
  ): string {
    if (context.currentStepIndex === 0) {
      throw new Error('No previous step available - this is the first step in the workflow');
    }

    const previousStep = context.workflowSteps[context.currentStepIndex - 1];
    const stepId = previousStep.id;

    // Check if the previous step was executed successfully
    const stepResult = context.previousResults[stepId];
    if (!stepResult) {
      throw new Error(`Previous step "${stepId}" has not been executed yet`);
    }
    if (!stepResult.success) {
      throw new Error(`Previous step "${stepId}" failed: ${stepResult.error}`);
    }

    return property ? `${stepId}.${property}` : stepId;
  }

  private static resolvePreviousToolType(
    toolType: string,
    context: ReferenceResolutionContext,
    property?: string
  ): string {
    // Find the most recent step of the specified tool type
    let foundStep: WorkflowStep | null = null;
    
    for (let i = context.currentStepIndex - 1; i >= 0; i--) {
      const step = context.workflowSteps[i];
      
      // Check if this step matches the tool type
      // We need to match against the tool ID since that's what we have
      if (this.matchesToolType(step.toolId, toolType)) {
        foundStep = step;
        break;
      }
    }

    if (!foundStep) {
      throw new Error(`No previous step of type "${toolType}" found in workflow`);
    }

    // Check if the step was executed successfully
    const stepResult = context.previousResults[foundStep.id];
    if (!stepResult) {
      throw new Error(`Previous ${toolType} step "${foundStep.id}" has not been executed yet`);
    }
    if (!stepResult.success) {
      throw new Error(`Previous ${toolType} step "${foundStep.id}" failed: ${stepResult.error}`);
    }

    return property ? `${foundStep.id}.${property}` : foundStep.id;
  }

  private static resolveStepReference(stepId: string, property?: string): string {
    // For step: references, we just pass through to the existing resolution system
    // The existing resolver will handle validation and error messages
    return property ? `${stepId}.${property}` : stepId;
  }

  private static async resolveTemplateReference(templateRef: string, property?: string): Promise<any> {
    // Resolve template reference through templateManager
    const template = await templateManager.resolveTemplateReference(`{{template:${templateRef}}}`);
    if (!template) {
      throw new Error(`Template not found: ${templateRef}`);
    }

    if (property) {
      // Extract specific property from template
      const keys = property.split('.');
      let value: any = template;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          throw new Error(`Property ${property} not found in template ${templateRef}`);
        }
      }
      
      return value;
    }

    // Return the full template object
    return template;
  }

  /**
   * Check if a tool ID matches a tool type pattern
   * This handles common patterns like:
   * - "screenshot" matches toolId "screenshot"
   * - "screenshot" matches toolId "screenshot-tool" 
   * - "ocr" matches toolId "tesseract-ocr"
   */
  private static matchesToolType(toolId: string, toolType: string): boolean {
    // Exact match
    if (toolId === toolType) return true;
    
    // Common patterns
    const patterns = [
      toolType,                           // exact match
      `${toolType}-tool`,                // screenshot -> screenshot-tool
      `${toolType}-`,                    // screenshot -> screenshot-*
      `-${toolType}`,                    // ocr -> *-ocr (like tesseract-ocr)
      toolType.replace('-', ''),         // handle hyphenated matches
    ];

    return patterns.some(pattern => {
      if (pattern.endsWith('-')) {
        return toolId.startsWith(pattern);
      } else if (pattern.startsWith('-')) {
        return toolId.endsWith(pattern);
      } else {
        return toolId === pattern || toolId.includes(toolType);
      }
    });
  }
}

/**
 * Resolve all semantic references in a workflow input object
 */
export async function resolveSemanticReferences(
  inputs: any,
  context: ReferenceResolutionContext
): Promise<any> {
  if (inputs === null || inputs === undefined) {
    return inputs;
  }

  // Handle reference objects
  if (typeof inputs === 'object' && inputs !== null) {
    // Handle $ref with semantic references
    if ('$ref' in inputs && typeof inputs.$ref === 'string') {
      const semanticRef = ReferenceTemplateParser.parseReference(inputs.$ref);
      if (semanticRef) {
        // Replace semantic reference with resolved value
        const resolvedValue = await ReferenceTemplateParser.resolveReference(semanticRef, context);
        
        // For template references, return the actual template data
        if (semanticRef.type === 'template') {
          return resolvedValue;
        }
        
        // For other references, return as $ref
        return { $ref: resolvedValue };
      }
      // Return as-is if not a semantic reference
      return inputs;
    }

    // Handle arrays
    if (Array.isArray(inputs)) {
      const resolved = [];
      for (const item of inputs) {
        resolved.push(await resolveSemanticReferences(item, context));
      }
      return resolved;
    }

    // Handle regular objects - recursively resolve properties
    const resolved: any = {};
    for (const [key, value] of Object.entries(inputs)) {
      resolved[key] = await resolveSemanticReferences(value, context);
    }
    return resolved;
  }

  // Handle string values that might contain templates
  if (typeof inputs === 'string' && ReferenceTemplateParser.hasTemplates(inputs)) {
    // For now, we don't support string interpolation, only full replacements
    // This could be extended in the future
    const semanticRef = ReferenceTemplateParser.parseReference(inputs);
    if (semanticRef) {
      return await ReferenceTemplateParser.resolveReference(semanticRef, context);
    }
  }

  // Return primitive values as-is
  return inputs;
}

/**
 * Validate semantic references in workflow inputs without resolving them
 * Useful for UI validation before execution
 */
export function validateSemanticReferences(
  inputs: any,
  availableSteps: WorkflowStep[],
  currentStepIndex: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  function validateRecursive(value: any, path: string = ''): void {
    if (value === null || value === undefined) return;

    if (typeof value === 'object' && value !== null) {
      if ('$ref' in value && typeof value.$ref === 'string') {
        const semanticRef = ReferenceTemplateParser.parseReference(value.$ref);
        if (semanticRef) {
          try {
            // Create a mock context for validation
            const context: ReferenceResolutionContext = {
              currentStepIndex,
              workflowSteps: availableSteps,
              previousResults: {} // Empty for validation - we only check structural validity
            };
            
            validateReference(semanticRef, context, `${path}.$ref`);
          } catch (error) {
            errors.push(`${path}.$ref: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => validateRecursive(item, `${path}[${index}]`));
      } else {
        Object.entries(value).forEach(([key, val]) => validateRecursive(val, path ? `${path}.${key}` : key));
      }
    }
  }

  validateRecursive(inputs);
  return { isValid: errors.length === 0, errors };
}

function validateReference(
  semanticRef: SemanticReference,
  context: ReferenceResolutionContext,
  _path: string
): void {
  switch (semanticRef.type) {
    case 'previous':
      if (context.currentStepIndex === 0) {
        throw new Error('No previous step available - this is the first step');
      }
      break;

    case 'previous:toolType':
      if (!semanticRef.toolType) {
        throw new Error('Tool type is required for previous:toolType references');
      }
      
      // Check if any previous step matches the tool type
      let found = false;
      for (let i = context.currentStepIndex - 1; i >= 0; i--) {
        const step = context.workflowSteps[i];
        if (ReferenceTemplateParser['matchesToolType'](step.toolId, semanticRef.toolType)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`No previous step of type "${semanticRef.toolType}" found`);
      }
      break;

    case 'step':
      if (!semanticRef.stepId) {
        throw new Error('Step ID is required for step references');
      }
      
      // Check if the step exists in the workflow
      const stepExists = context.workflowSteps.some(step => step.id === semanticRef.stepId);
      if (!stepExists) {
        throw new Error(`Step "${semanticRef.stepId}" not found in workflow`);
      }
      break;

    case 'template':
      if (!semanticRef.templateRef) {
        throw new Error('Template reference is required for template references');
      }
      
      // Note: We could validate template existence here, but it would require
      // making this function async. For now, we'll do basic syntax validation.
      // Template existence will be validated at runtime during resolution.
      break;

    default:
      throw new Error(`Unknown reference type: ${(semanticRef as any).type}`);
  }
}