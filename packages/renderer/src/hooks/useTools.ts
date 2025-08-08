// packages/renderer/src/hooks/useTools.ts
import { useState, useEffect, useCallback } from 'react';
import { getTools, runTool } from '@app/preload';
import type { ToolMetadata } from '@app/types';

export function useTools() {
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const loadTools = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const toolList = await getTools();
      setTools(toolList);
    } catch (err) {
      console.error('Failed to load tools:', err);
      setError('Failed to load tools');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runToolAsync = useCallback(async (toolId: string, inputs: any) => {
    try {
      setIsRunning(true);
      setError(null);
      
      const result = await runTool(toolId, inputs);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run tool';
      setError(message);
      throw err;
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, []);

  return {
    tools,
    isLoading,
    error,
    isRunning,
    reloadTools: loadTools,
    runToolAsync,
    clearError
  };
}