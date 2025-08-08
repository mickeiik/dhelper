/**
 * Error handling utilities for consistent logging and recovery
 */

import { DHelperError, Result, isFailure, isSuccess } from './errors.js';

/**
 * Log levels for error reporting
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Centralized error logger with consistent formatting
 */
export class ErrorLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  logError(error: DHelperError, level: LogLevel = LogLevel.ERROR): void {
    const message = `[${this.context}] ${error.code}: ${error.message}`;
    const details = error.details ? ` | Details: ${JSON.stringify(error.details)}` : '';
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(message + details);
        break;
      case LogLevel.WARN:
        console.warn(message + details);
        break;
      case LogLevel.INFO:
        console.info(message + details);
        break;
      case LogLevel.DEBUG:
        console.debug(message + details);
        break;
    }
  }

  logResult<T, E extends DHelperError>(result: Result<T, E>, level: LogLevel = LogLevel.ERROR): void {
    if (isFailure(result)) {
      this.logError(result.error, level);
    }
  }
}

/**
 * Simple helper to format error messages consistently
 */
export function formatErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof DHelperError) {
    return `${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : defaultMessage;
}

/**
 * Type guards for common error patterns
 */
export function isNotFoundError(error: DHelperError): boolean {
  return error.message.toLowerCase().includes('not found') ||
         error.code === 'TEMPLATE_ERROR' ||
         error.code === 'WORKFLOW_ERROR';
}

export function isConnectionError(error: DHelperError): boolean {
  return error.message.toLowerCase().includes('connection') ||
         error.message.toLowerCase().includes('network') ||
         error.code === 'TOOL_EXECUTION_ERROR';
}

export function isPermissionError(error: DHelperError): boolean {
  return error.message.toLowerCase().includes('permission') ||
         error.message.toLowerCase().includes('access denied') ||
         error.code === 'STORAGE_ERROR';
}

/**
 * Simple helper to create an ErrorLogger for consistent logging
 */
export function createLogger(context: string): ErrorLogger {
  return new ErrorLogger(context);
}