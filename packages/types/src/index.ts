// packages/types/src/index.ts
// Tool-related types
export type {
  Tool,
  ToolMetadata,
  ToolInitContext,
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
  Point,
  Rectangle,
  OverlayStyle,
  OverlayShape,
  OverlayText,
  OverlayOptions,
  OverlayService,
  OverlayWindow,
  OverlayEvents
} from './overlay.js';

export {
  OVERLAY_STYLES
} from './overlay.js';

// Common utilities
export type {
  DeepPartial
} from './common.js';