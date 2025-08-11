/**
 * Base error class for all DHelper application errors
 */
export class DHelperError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Errors related to tool execution and management
 */
export class ToolExecutionError extends DHelperError {
  constructor(message: string, public readonly toolId: string, details?: Record<string, unknown>) {
    super(message, 'TOOL_EXECUTION_ERROR', { toolId, ...details });
  }
}

/**
 * Errors related to workflow operations
 */
export class WorkflowError extends DHelperError {
  constructor(message: string, public readonly workflowId?: string, details?: Record<string, unknown>) {
    super(message, 'WORKFLOW_ERROR', { workflowId, ...details });
  }
}

/**
 * Errors related to storage operations (database, file system)
 */
export class StorageError extends DHelperError {
  constructor(message: string, public readonly operation?: string, details?: Record<string, unknown>) {
    super(message, 'STORAGE_ERROR', { operation, ...details });
  }
}

/**
 * Errors related to template operations
 */
export class TemplateError extends DHelperError {
  constructor(message: string, public readonly templateId?: string, details?: Record<string, unknown>) {
    super(message, 'TEMPLATE_ERROR', { templateId, ...details });
  }
}

/**
 * Result type for operations that can fail
 * Provides a consistent way to handle success/failure without throwing
 */
export type Result<T, E = DHelperError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper function to create a successful result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Helper function to create a failed result
 */
export function failure<E = DHelperError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Helper function to wrap potentially throwing operations
 */
export function tryCatch<T>(
  operation: () => T,
  errorHandler?: (error: unknown) => DHelperError
): Result<T, DHelperError> {
  try {
    return success(operation());
  } catch (error) {
    const dhelperError = errorHandler 
      ? errorHandler(error)
      : new DHelperError(
          error instanceof Error ? error.message : String(error),
          'UNKNOWN_ERROR',
          { originalError: error }
        );
    return failure(dhelperError);
  }
}

/**
 * Helper function for async operations that can fail
 */
export async function tryAsync<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => DHelperError
): Promise<Result<T, DHelperError>> {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    const dhelperError = errorHandler
      ? errorHandler(error)
      : new DHelperError(
          error instanceof Error ? error.message : String(error),
          'UNKNOWN_ERROR',
          { originalError: error }
        );
    return failure(dhelperError);
  }
}

/**
 * Type guard to check if a result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if a result is a failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}