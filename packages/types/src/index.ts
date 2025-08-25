// packages/types/src/index.ts
// Tool-related types
export type {
  ToolMetadata,
  ToolInitContext,
  ToolId,
  ToolInput,
  ToolOutput,
  ToolInputField,
  ToolOutputField,
  TemplateManager
} from './tool.js';

// Workflow-related types
export type {
  Workflow,
  WorkflowStep,
  WorkflowInputs,
  WorkflowResult,
  StepResult,
  WorkflowProgress,
} from './workflow.js';

// Template-related types
export type {
  Template,
  TemplateMetadata,
  TemplateMatchResult,
  TemplateMatchOptions,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateCategory,
  TemplateStorageStats
} from './template.js';

export {
  TEMPLATE_CATEGORIES
} from './template.js';

// Overlay-related types
export type {
  OverlayService,
  OverlayWindow,
  OverlayEvents
} from './overlay.js';

export {
  OVERLAY_STYLES
} from './overlay.js';

// Common utilities moved to schemas package

// Error handling types
export type {
  Result
} from './errors.js';

export {
  DHelperError,
  ToolExecutionError,
  WorkflowError,
  StorageError,
  TemplateError,
  success,
  failure,
  tryCatch,
  tryAsync,
  isSuccess,
  isFailure
} from './errors.js';

// Error handling utilities removed - use console.error instead