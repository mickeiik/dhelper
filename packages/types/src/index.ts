// packages/types/src/index.ts
// Tool-related types
export type {
  Tool,
  ToolMetadata,
  ToolRegistry,
  ToolId,
  ToolInput,
  ToolOutput,
  ToolInputField
} from './tool.js';

// Workflow-related types
export type {
  Workflow,
  WorkflowStep,
  WorkflowInputs,
  WorkflowResult,
  StepResult,
  WorkflowProgress,
  ReferenceResolutionContext
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

// Common utilities
export type {
  DeepPartial
} from './common.js';