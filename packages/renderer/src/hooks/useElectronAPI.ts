import { useState, useEffect } from 'react';
import { getTools, runTool, saveWorkflow, loadWorkflow, listWorkflows, runWorkflow } from '@app/preload';
import type { ToolMetadata } from '@app/types';

export function useTools() {
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        const toolsData = await getTools();
        setTools(toolsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tools');
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  return { tools, loading, error, runTool };
}

export function useWorkflows() {
  return { saveWorkflow, loadWorkflow, listWorkflows, runWorkflow };
}