// packages/renderer/src/hooks/useTools.ts
import { useState, useEffect } from 'react';
import { getTools } from '@app/preload';
import type { ToolMetadata } from '@app/types';

export function useTools() {
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadTools();
  }, []);

  return {
    tools,
    isLoading,
    error,
    reloadTools: loadTools
  };
}