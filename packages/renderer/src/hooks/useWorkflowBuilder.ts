// packages/renderer/src/hooks/useWorkflowBuilder.ts
import { useState } from 'react';
import type { Workflow, WorkflowStep } from '@app/types';

export interface NewStepForm {
  id: string;
  toolId: string;
  inputs: string;
  cacheEnabled: boolean;
  cacheKey: string;
  cachePersistent: boolean;
  cacheTtl: string;
}

export function useWorkflowBuilder() {
  const [workflow, setWorkflow] = useState<Workflow>({
    id: 'custom-workflow',
    name: 'My Custom Workflow',
    steps: []
  });

  const [newStep, setNewStep] = useState<NewStepForm>({
    id: '',
    toolId: '',
    inputs: '{}',
    cacheEnabled: false,
    cacheKey: '',
    cachePersistent: true,
    cacheTtl: ''
  });

  const [error, setError] = useState<string | null>(null);

  const updateNewStep = (updates: Partial<NewStepForm>) => {
    setNewStep(prev => ({ ...prev, ...updates }));
  };

  const addStep = () => {
    if (!newStep.id || !newStep.toolId) {
      setError('Step ID and Tool are required');
      return false;
    }

    try {
      const inputs = JSON.parse(newStep.inputs);

      const step: WorkflowStep = {
        id: newStep.id,
        toolId: newStep.toolId,
        inputs
      };

      // Add cache configuration if enabled
      if (newStep.cacheEnabled) {
        step.cache = {
          enabled: true,
          key: newStep.cacheKey || undefined,
          persistent: newStep.cachePersistent,
          ttl: newStep.cacheTtl ? parseInt(newStep.cacheTtl) : undefined
        };
      }

      setWorkflow(prev => ({
        ...prev,
        steps: [...prev.steps, step]
      }));

      setNewStep({
        id: '',
        toolId: '',
        inputs: '{}',
        cacheEnabled: false,
        cacheKey: '',
        cachePersistent: true,
        cacheTtl: ''
      });

      setError(null);
      return true;
    } catch (err) {
      setError(`Invalid JSON in inputs: ${err}`);
      return false;
    }
  };

  const removeStep = (stepId: string) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const clearWorkflow = () => {
    setWorkflow(prev => ({
      ...prev,
      steps: []
    }));
  };

  const updateWorkflowInfo = (updates: Partial<Pick<Workflow, 'name' | 'description'>>) => {
    setWorkflow(prev => ({ ...prev, ...updates }));
  };

  const clearError = () => setError(null);

  return {
    workflow,
    newStep,
    error,
    updateNewStep,
    addStep,
    removeStep,
    clearWorkflow,
    updateWorkflowInfo,
    clearError
  };
}