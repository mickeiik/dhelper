import { useState } from 'react';
import { runWorkflow, runCustomWorkflow } from '@app/preload';
import type { Workflow, WorkflowResult } from '@app/types';

export function useWorkflowExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeExample = async () => {
    if (isRunning) return;

    try {
      setIsRunning(true);
      setError(null);
      setLastResult(null);

      const result = await runWorkflow('my-workflow-id');
      setLastResult(result);

      if (!result.success) {
        setError(result.error || 'Workflow failed');
      }
    } catch (err) {
      console.error('Workflow failed:', err);
      setError('Workflow execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const executeCustomWorkflow = async (workflow: Workflow) => {
    if (isRunning || workflow.steps.length === 0) return;

    try {
      setIsRunning(true);
      setError(null);
      setLastResult(null);

      const result = await runCustomWorkflow(workflow);
      setLastResult(result);

      if (!result.success) {
        setError(result.error || 'Custom workflow failed');
      }
    } catch (err) {
      console.error('Custom workflow failed:', err);
      setError('Custom workflow execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const clearError = () => setError(null);

  return {
    isRunning,
    lastResult,
    error,
    executeExample,
    executeCustomWorkflow,
    clearError
  };
}