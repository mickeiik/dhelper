# Front-End Types Reference

## Complete Type Definitions

This document provides a comprehensive reference of all TypeScript types, interfaces, and enums available for front-end development.

---

## Core Workflow Types

```typescript
// Main workflow structure
interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  clearCache?: boolean;
}

// Individual workflow step
interface WorkflowStep<T extends ToolId = ToolId> {
  id: string;
  toolId: T;
  inputs: WorkflowInputs<ToolInput<T>>;
  onError?: 'stop' | 'continue' | 'retry';
  retryCount?: number;
  cache?: {
    enabled: boolean;
    key?: string;
    persistent?: boolean;
    ttl?: number; // Time to live in milliseconds
  };
}

// Workflow inputs can be direct values or references
type WorkflowInputs<T> = T | WorkflowReference | WorkflowMerge;

interface WorkflowReference {
  $ref: string; // Reference to another step's output
}

interface WorkflowMerge {
  $merge: WorkflowInputs<any>[]; // Merge multiple inputs
}

// Workflow execution result
interface WorkflowResult {
  success: boolean;
  results: Record<string, any>; // Map of stepId to result
  error?: string;
  executionTime: number; // Total time in milliseconds
  stepsExecuted: number;
  stepResults: StepResult[];
}

// Individual step result
interface StepResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: string;
  cached: boolean;
  executionTime: number;
}

// Real-time workflow progress
interface WorkflowProgress {
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  stepId: string;
  status: 'running' | 'completed' | 'failed' | 'cached';
  result?: any;
  error?: string;
  startTime: number;
  endTime?: number;
  fromCache?: boolean;
}
```

---

## Tool System Types

```typescript
// Available tool identifiers
type ToolId = 
  | 'screenshot'
  | 'screen-region-selector'
  | 'ocr'
  | 'tesseract-ocr'
  | 'template-matcher'
  | 'click'
  | 'hello-world';

// Tool metadata for UI display
interface ToolMetadata {
  id: ToolId;
  name: string;
  description?: string;
  category?: string;
  inputFields: ToolInputField[];
  examples?: ToolExample[];
}

// Tool input field definition
interface ToolInputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  example?: any;
  min?: number; // For number types
  max?: number; // For number types
  enum?: string[]; // For enum values
}

// Tool example for UI
interface ToolExample {
  name: string;
  description: string;
  inputs: any;
}

// Tool-specific input types
interface ScreenshotToolInput {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ScreenRegionSelectorInput {
  mode: 'point' | 'rectangle' | 'region';
  timeout?: number; // milliseconds
}

interface TesseractOcrToolInput {
  imageSource: string | Buffer; // Base64 or buffer
  language?: string; // Default: 'eng'
  oem?: number; // OCR Engine Mode
  psm?: number; // Page Segmentation Mode
}

interface TemplateMatcherInput {
  screenImage?: string | Buffer;
  templateIds?: string[];
  templateNames?: string[];
  categories?: string[];
  tags?: string[];
  minConfidence?: number; // 0-1
  maxResults?: number;
  searchRegion?: Rectangle;
  showVisualIndicators?: boolean;
  overlayTimeout?: number;
}

interface ClickToolInput {
  // Position (use either x,y OR region)
  x?: number;
  y?: number;
  region?: Rectangle;
  
  // Click options
  clickMethod?: 'default' | 'fast' | 'safe' | 'all';
  button?: 'left' | 'right' | 'middle';
  clicks?: number; // 1=single, 2=double, 3=triple
  delay?: number; // ms between clicks
  
  // Visual feedback
  showVisualIndicator?: boolean;
  indicatorTimeout?: number;
}

interface HelloWorldToolInput {
  message?: string;
  data?: any;
}

// Tool output types
type ScreenshotToolOutput = string; // Base64 image

type ScreenRegionSelectorOutput = 
  | PointSelection 
  | RectangleSelection;

interface PointSelection {
  x: number;
  y: number;
}

interface RectangleSelection {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TesseractOcrToolOutput {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: BoundingBox;
  }>;
}

type TemplateMatcherOutput = TemplateMatchResult[];

interface ClickToolOutput {
  success: boolean;
  clickedAt: Point;
  method: string;
  error?: string;
}

interface HelloWorldToolOutput {
  success: boolean;
  data: any;
}

// Type helpers
type ToolInput<T extends ToolId> = 
  T extends 'screenshot' ? ScreenshotToolInput :
  T extends 'screen-region-selector' ? ScreenRegionSelectorInput :
  T extends 'tesseract-ocr' ? TesseractOcrToolInput :
  T extends 'ocr' ? TesseractOcrToolInput :
  T extends 'template-matcher' ? TemplateMatcherInput :
  T extends 'click' ? ClickToolInput :
  T extends 'hello-world' ? HelloWorldToolInput :
  never;

type ToolOutput<T extends ToolId> = 
  T extends 'screenshot' ? ScreenshotToolOutput :
  T extends 'screen-region-selector' ? ScreenRegionSelectorOutput :
  T extends 'tesseract-ocr' ? TesseractOcrToolOutput :
  T extends 'ocr' ? TesseractOcrToolOutput :
  T extends 'template-matcher' ? TemplateMatcherOutput :
  T extends 'click' ? ClickToolOutput :
  T extends 'hello-world' ? HelloWorldToolOutput :
  never;
```

---

## Template System Types

```typescript
// Template metadata (list view)
interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  width: number;
  height: number;
  colorProfile?: 'light' | 'dark' | 'auto';
  matchThreshold: number;
  scaleTolerance?: number;
  rotationTolerance?: number;
  usageCount: number;
  lastUsed?: Date;
  successRate?: number;
  imagePath: string;
  thumbnailPath?: string;
}

// Full template with image data
interface Template extends TemplateMetadata {
  imageData?: Uint8Array;
  thumbnailData?: Uint8Array;
}

// Template matching result
interface TemplateMatchResult {
  templateId: string;
  confidence: number; // 0-1
  location: Rectangle;
  template: Template;
}

// Template matching options
interface TemplateMatchOptions {
  minConfidence?: number;
  maxResults?: number;
  searchRegion?: Rectangle;
  scaleRange?: [number, number]; // e.g., [0.8, 1.2]
  rotationRange?: [number, number]; // degrees
  colorTolerance?: number;
}

// Template creation
interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  imageData: Uint8Array;
  matchThreshold?: number;
  scaleTolerance?: number;
  rotationTolerance?: number;
  colorProfile?: 'light' | 'dark' | 'auto';
}

// Template update
interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  matchThreshold?: number;
  scaleTolerance?: number;
  rotationTolerance?: number;
  colorProfile?: 'light' | 'dark' | 'auto';
}

// Template categories enum
const TEMPLATE_CATEGORIES = {
  UI_ELEMENTS: 'UI Elements',
  TEXT_PATTERNS: 'Text Patterns',
  BUTTONS: 'Buttons',
  ICONS: 'Icons',
  DIALOGS: 'Dialogs',
  MENUS: 'Menus',
  FORMS: 'Forms',
  CUSTOM: 'Custom'
} as const;

type TemplateCategory = typeof TEMPLATE_CATEGORIES[keyof typeof TEMPLATE_CATEGORIES];

// Template storage statistics
interface TemplateStorageStats {
  totalTemplates: number;
  totalSize: number; // bytes
  imageSize: number; // bytes
  oldestTemplate?: Date;
  newestTemplate?: Date;
  categoryCounts: Record<string, number>;
}
```

---

## Storage Types

```typescript
// Stored workflow with metadata
interface StoredWorkflow {
  workflow: Workflow;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    description?: string;
    tags?: string[];
  };
  cache?: Record<string, {
    value: unknown;
    timestamp: number;
    ttl?: number;
  }>;
}

// Workflow list item (for UI display)
interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  stepCount: number;
  hasCachedData: boolean;
  tags?: string[];
}

// Save workflow options
interface SaveWorkflowOptions {
  includeCache?: boolean;
  tags?: string[];
  description?: string;
}

// Storage statistics
interface StorageStats {
  totalWorkflows: number;
  totalSize: number; // bytes
  cacheSize: number; // bytes
  oldestWorkflow?: Date;
  newestWorkflow?: Date;
}
```

---

## Geometry Types

```typescript
// Basic point
interface Point {
  x: number;
  y: number;
}

// Rectangle/Region
interface Rectangle {
  x: number; // left
  y: number; // top
  width: number;
  height: number;
}

// Bounding box
interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  x2: number;
}

// Screen display info
interface Display {
  id: number;
  bounds: Rectangle;
  workArea: Rectangle;
  scaleFactor: number;
  rotation: 0 | 90 | 180 | 270;
  internal: boolean;
  touchSupport: 'available' | 'unavailable' | 'unknown';
}
```

---

## Error Types

```typescript
// Base error class
class DHelperError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  );
}

// Specific error types
class ToolExecutionError extends DHelperError {
  constructor(
    message: string,
    public toolId: string,
    details?: any
  );
}

class WorkflowError extends DHelperError {
  constructor(
    message: string,
    public workflowId: string,
    details?: any
  );
}

class StorageError extends DHelperError {
  constructor(
    message: string,
    public operation: string,
    details?: any
  );
}

class TemplateError extends DHelperError {
  constructor(
    message: string,
    public templateId?: string,
    details?: any
  );
}

// Result pattern for error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Helper functions
function success<T>(data: T): Result<T>;
function failure<E = Error>(error: E): Result<never, E>;
function isSuccess<T>(result: Result<T>): result is { success: true; data: T };
function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E };
```

---

## Overlay System Types

```typescript
// Overlay styles
const OVERLAY_STYLES = {
  DEFAULT: 'default',
  HIGHLIGHT: 'highlight',
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  SELECTION: 'selection',
  CROSSHAIR: 'crosshair'
} as const;

type OverlayStyle = typeof OVERLAY_STYLES[keyof typeof OVERLAY_STYLES];

// Overlay shape
interface OverlayShape {
  type: 'rectangle' | 'circle' | 'line' | 'polygon';
  points: Point[];
  style?: OverlayStyle;
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
}

// Overlay text
interface OverlayText {
  text: string;
  position: Point;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

// Overlay options
interface OverlayOptions {
  shapes?: OverlayShape[];
  texts?: OverlayText[];
  backgroundColor?: string;
  backgroundOpacity?: number;
  clickThrough?: boolean;
  autoClose?: number; // milliseconds
  zIndex?: number;
}
```

---

## Utility Types

```typescript
// Deep partial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Extract keys of specific type
type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Omit with better type inference
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Make specific keys optional
type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific keys required
type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Extract promise type
type Awaited<T> = T extends PromiseLike<infer U> ? U : T;

// Function types
type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;
type SyncFunction<T = any, R = any> = (...args: T[]) => R;

// Event handler types
type EventHandler<T = Event> = (event: T) => void;
type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;
```

---

## Validation Types

```typescript
// Semantic reference validation
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  stepId: string;
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  stepId: string;
  field: string;
  message: string;
  code: string;
}

// Reference resolution
interface ReferenceContext {
  stepResults: Record<string, any>;
  currentStepIndex: number;
  workflow: Workflow;
}
```

---

## Configuration Types

```typescript
// Application configuration
interface AppConfig {
  storage: {
    workflowsPath: string;
    templatesPath: string;
    cachePath: string;
  };
  tools: {
    timeout: number;
    retryCount: number;
    retryDelay: number;
  };
  ui: {
    animations: boolean;
    developerMode: boolean;
  };
}

// Tool configuration
interface ToolConfig {
  [toolId: string]: {
    enabled: boolean;
    defaultInputs?: any;
    timeout?: number;
    retryCount?: number;
  };
}
```

---

## Event Types

```typescript
// Workflow events
interface WorkflowStartEvent {
  workflowId: string;
  workflow: Workflow;
  timestamp: number;
}

interface WorkflowCompleteEvent {
  workflowId: string;
  result: WorkflowResult;
  timestamp: number;
}

interface WorkflowErrorEvent {
  workflowId: string;
  error: Error;
  stepId?: string;
  timestamp: number;
}

interface StepStartEvent {
  workflowId: string;
  stepId: string;
  stepIndex: number;
  timestamp: number;
}

interface StepCompleteEvent {
  workflowId: string;
  stepId: string;
  result: any;
  cached: boolean;
  timestamp: number;
}

// Event emitter types
interface WorkflowEventEmitter {
  on(event: 'start', handler: (e: WorkflowStartEvent) => void): void;
  on(event: 'complete', handler: (e: WorkflowCompleteEvent) => void): void;
  on(event: 'error', handler: (e: WorkflowErrorEvent) => void): void;
  on(event: 'step:start', handler: (e: StepStartEvent) => void): void;
  on(event: 'step:complete', handler: (e: StepCompleteEvent) => void): void;
  off(event: string, handler: Function): void;
}
```

---

## Type Guards

```typescript
// Check if value is a workflow reference
function isWorkflowReference(value: any): value is WorkflowReference {
  return value && typeof value === 'object' && '$ref' in value;
}

// Check if value is a workflow merge
function isWorkflowMerge(value: any): value is WorkflowMerge {
  return value && typeof value === 'object' && '$merge' in value;
}

// Check if error is a specific type
function isToolExecutionError(error: any): error is ToolExecutionError {
  return error instanceof ToolExecutionError;
}

function isWorkflowError(error: any): error is WorkflowError {
  return error instanceof WorkflowError;
}

function isStorageError(error: any): error is StorageError {
  return error instanceof StorageError;
}

function isTemplateError(error: any): error is TemplateError {
  return error instanceof TemplateError;
}

// Check tool ID
function isValidToolId(id: string): id is ToolId {
  const validIds: ToolId[] = [
    'screenshot',
    'screen-region-selector',
    'ocr',
    'tesseract-ocr',
    'template-matcher',
    'click',
    'hello-world'
  ];
  return validIds.includes(id as ToolId);
}
```