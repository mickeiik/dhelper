import { useState, useEffect } from 'react';
import { onWorkflowProgress } from '@app/preload';
import type { WorkflowProgress } from '@app/types';

export function useWorkflowProgress() {
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);

  useEffect(() => {
    onWorkflowProgress(setProgress);
  }, []);

  const clearProgress = () => setProgress(null);

  return {
    progress,
    clearProgress
  };
}