// packages/renderer/src/hooks/useWorkflowBuilder.ts
import { useState } from 'react';
import type { Workflow, WorkflowStep, WorkflowInputs } from '@app/types';

export interface StepBuilderData {
  id: string;
  toolId: string;
  inputs: WorkflowInputs<unknown>;
  cache?: {
    enabled: boolean;
    key?: string;
    persistent?: boolean;
    ttl?: number;
  };
}

export function useWorkflowBuilder() {
  const [workflow, setWorkflow] = useState<Workflow>({
    id: 'custom-workflow',
    name: 'My Custom Workflow',
    steps: []
  });

  const [error, setError] = useState<string | null>(null);

  const addStepFromBuilder = (stepData: StepBuilderData): boolean => {
    if (!stepData.id || !stepData.toolId) {
      setError('Step ID and Tool are required');
      return false;
    }

    // Check for duplicate step IDs
    if (workflow.steps.some(step => step.id === stepData.id)) {
      setError(`Step ID "${stepData.id}" already exists`);
      return false;
    }

    const step: WorkflowStep = {
      id: stepData.id,
      toolId: stepData.toolId,
      inputs: stepData.inputs
    };

    // Add cache configuration if provided
    if (stepData.cache) {
      step.cache = stepData.cache;
    }

    setWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));

    setError(null);
    return true;
  };

  const removeStep = (stepId: string): void => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const clearWorkflow = (): void => {
    setWorkflow(prev => ({
      ...prev,
      steps: []
    }));
  };

  const updateWorkflowInfo = (updates: Partial<Pick<Workflow, 'name' | 'description'>>): void => {
    setWorkflow(prev => ({ ...prev, ...updates }));
  };

  const clearError = (): void => setError(null);

  return {
    workflow,
    error,
    addStepFromBuilder,
    removeStep,
    clearWorkflow,
    updateWorkflowInfo,
    clearError
  };
}