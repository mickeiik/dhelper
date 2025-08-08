// packages/renderer/src/hooks/useErrorHandler.ts
import { useCallback, useState } from 'react';

export interface UseErrorHandlerReturn {
  error: string | null;
  clearError: () => void;
  handleAsync: <T>(operation: () => Promise<T>, fallback?: T) => Promise<T | undefined>;
}

/**
 * Shared error handling hook that eliminates repetitive try/catch patterns
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      setError(null);
      return await operation();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return fallback;
    }
  }, []);

  return {
    error,
    clearError,
    handleAsync
  };
}