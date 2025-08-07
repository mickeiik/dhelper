# Front-End Developer API Documentation

## Overview

This documentation covers all APIs, hooks, types, and components available for building the renderer interface of the DHelper workflow automation application. The application is built with Electron, React, and TypeScript.

## Architecture

- **Main Process**: Handles system interactions, tool execution, and storage
- **Renderer Process**: React-based UI for building and managing workflows
- **Preload Scripts**: Secure IPC bridge between main and renderer processes
- **Storage**: File-based persistent storage for workflows and templates

---

## Core APIs

### Preload API (`@app/preload`)

All main process interactions are handled through secure preload APIs. These are available in the renderer as imports from `@app/preload`.

#### Workflow APIs

**Source**: `packages/preload/src/workflow.ts`

```typescript
// Workflow Execution
export async function runWorkflow(id: string): Promise<WorkflowResult>
export async function runCustomWorkflow(workflow: Workflow): Promise<WorkflowResult>
export function onWorkflowProgress(callback: (progress: WorkflowProgress) => void): void

// Workflow Storage
export async function saveWorkflow(workflow: Workflow, options?: SaveWorkflowOptions): Promise<void>
export async function loadWorkflow(workflowId: string): Promise<Workflow | null>
export async function deleteWorkflow(workflowId: string): Promise<boolean>
export async function listWorkflows(): Promise<WorkflowListItem[]>
export async function workflowExists(workflowId: string): Promise<boolean>
export async function getStorageStats(): Promise<StorageStats>

// Workflow Management
export async function clearAllWorkflows(): Promise<void>
export async function exportWorkflow(workflowId: string): Promise<string | null>
export async function importWorkflow(data: string): Promise<string>
export async function duplicateWorkflow(sourceId: string, newId: string, newName?: string): Promise<void>
export async function searchWorkflows(query: string): Promise<WorkflowListItem[]>

// Cache Management
export async function clearWorkflowCache(workflowId: string): Promise<void>
export async function clearAllCaches(): Promise<void>
export async function getCacheStats(workflowId: string): Promise<any>
```

#### Template APIs

**Source**: `packages/preload/src/templates.ts`

```typescript
// Template CRUD Operations
export async function listTemplates(): Promise<TemplateMetadata[]>
export async function getTemplate(templateId: string): Promise<Template | null>
export async function createTemplate(input: CreateTemplateInput): Promise<Template>
export async function updateTemplate(input: UpdateTemplateInput): Promise<Template | null>
export async function deleteTemplate(templateId: string): Promise<boolean>

// Template Discovery and Search
export async function searchTemplates(query: string): Promise<TemplateMetadata[]>
export async function getTemplatesByCategory(category: string): Promise<TemplateMetadata[]>
export async function getTemplatesByTags(tags: string[]): Promise<TemplateMetadata[]>
export async function getTemplateCategories(): Promise<string[]>
export async function getAllTemplateTags(): Promise<string[]>

// Template Matching
export async function matchTemplates(
  screenImage: Buffer | string, 
  options?: TemplateMatchOptions
): Promise<TemplateMatchResult[]>

// Template Statistics
export async function getTemplateStats(): Promise<TemplateStorageStats>
```

---

## React Hooks

### useWorkflowExecution

**Source**: `packages/renderer/src/hooks/useWorkflowExecution.ts`

```typescript
export function useWorkflowExecution(): {
  isRunning: boolean;
  lastResult: WorkflowResult | null;
  error: string | null;
  executeExample: () => Promise<void>;
  executeCustomWorkflow: (workflow: Workflow) => Promise<void>;
  clearError: () => void;
}
```

**Usage**:
```typescript
const { isRunning, lastResult, error, executeCustomWorkflow } = useWorkflowExecution();

// Execute a custom workflow
await executeCustomWorkflow({
  id: 'my-workflow',
  name: 'My Workflow',
  steps: [...workflowSteps]
});
```

### useWorkflowBuilder

**Source**: `packages/renderer/src/hooks/useWorkflowBuilder.ts`

```typescript
export interface StepBuilderData {
  id: string;
  toolId: string;
  inputs: WorkflowInputs<unknown>;
  cache?: {
    enabled: boolean;
    key?: string;
    persistent?: boolean;
    ttl?: number;
  };
}

export function useWorkflowBuilder(): {
  workflow: Workflow;
  error: string | null;
  addStepFromBuilder: (stepData: StepBuilderData) => boolean;
  removeStep: (stepId: string) => void;
  clearWorkflow: () => void;
  updateWorkflowInfo: (updates: Partial<Pick<Workflow, 'name' | 'description'>>) => void;
  clearError: () => void;
}
```

**Usage**:
```typescript
const { workflow, addStepFromBuilder, removeStep } = useWorkflowBuilder();

// Add a step to the workflow
const success = addStepFromBuilder({
  id: 'screenshot-step',
  toolId: 'screenshot',
  inputs: { top: 0, left: 0, width: 1920, height: 1080 },
  cache: { enabled: true, persistent: false }
});
```

### useTemplates

**Source**: `packages/renderer/src/hooks/useTemplates.ts`

```typescript
export interface UseTemplatesReturn {
  // Data
  templates: TemplateMetadata[];
  categories: string[];
  tags: string[];
  stats: TemplateStorageStats | null;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTemplates: () => Promise<void>;
  searchTemplate: (query: string) => Promise<TemplateMetadata[]>;
  filterByCategory: (category: string) => Promise<TemplateMetadata[]>;
  filterByTags: (tags: string[]) => Promise<TemplateMetadata[]>;
  getTemplateDetail: (templateId: string) => Promise<Template | null>;
  createNewTemplate: (input: CreateTemplateInput) => Promise<Template>;
  updateExistingTemplate: (input: UpdateTemplateInput) => Promise<Template | null>;
  removeTemplate: (templateId: string) => Promise<boolean>;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

export function useTemplates(): UseTemplatesReturn
```

### useWorkflowProgress

**Source**: `packages/renderer/src/hooks/useWorkflowProgress.ts`

```typescript
export function useWorkflowProgress(): {
  progress: WorkflowProgress | null;
}
```

### useTools

**Source**: `packages/renderer/src/hooks/useTools.ts`

```typescript
export function useTools(): {
  tools: ToolMetadata[];
  isLoading: boolean;
  error: string | null;
  reloadTools: () => Promise<void>;
}
```

---

## Type Definitions

### Core Workflow Types

**Source**: `packages/types/src/workflow.ts`

```typescript
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  clearCache?: boolean;
}

export interface WorkflowStep<T extends ToolId = ToolId> {
  id: string;
  toolId: T;
  inputs: WorkflowInputs<ToolInput<T>>;
  onError?: 'stop' | 'continue' | 'retry';
  retryCount?: number;
  cache?: {
    enabled: boolean;
    key?: string;
    persistent?: boolean;
    ttl?: number;
  };
}

export interface WorkflowProgress {
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  stepId: string;
  status: 'running' | 'completed' | 'failed' | 'cached';
  result?: any;
  error?: string;
  startTime: number;
  endTime?: number;
}

export interface WorkflowResult {
  success: boolean;
  results: Record<string, any>;
  error?: string;
  executionTime: number;
  stepsExecuted: number;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    result?: any;
    error?: string;
    cached: boolean;
    executionTime: number;
  }>;
}
```

### Template Types

**Source**: `packages/types/src/template.ts`

```typescript
export interface TemplateMetadata {
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

export interface Template extends TemplateMetadata {
  imageData?: Uint8Array;
  thumbnailData?: Uint8Array;
}

export interface TemplateMatchResult {
  templateId: string;
  confidence: number;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  template: Template;
}

export interface CreateTemplateInput {
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

export interface UpdateTemplateInput {
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

export interface TemplateStorageStats {
  totalTemplates: number;
  totalSize: number;
  imageSize: number;
  oldestTemplate?: Date;
  newestTemplate?: Date;
  categoryCounts: Record<string, number>;
}

export const TEMPLATE_CATEGORIES = {
  UI_ELEMENTS: 'UI Elements',
  TEXT_PATTERNS: 'Text Patterns', 
  BUTTONS: 'Buttons',
  ICONS: 'Icons',
  DIALOGS: 'Dialogs',
  MENUS: 'Menus',
  FORMS: 'Forms',
  CUSTOM: 'Custom'
} as const;
```

### Tool Types

**Source**: `packages/tools/src/registry.ts`

```typescript
export interface ToolRegistry {
  'hello-world': {
    input: HelloWorldToolInput;
    output: HelloWorldToolOutput;
  };
  'ocr': {
    input: TesseractOcrToolInput;
    output: TesseractOcrToolOutput;
  };
  'screenshot': {
    input: ScreenshotToolInput;
    output: ScreenshotToolOutput;
  };
  'screen-region-selector': {
    input: ScreenRegionSelectorInput;
    output: ScreenRegionSelectorOutput;
  };
  'template-matcher': {
    input: TemplateMatcherInput;
    output: TemplateMatcherOutput;
  };
  'click': {
    input: ClickToolInput;
    output: ClickToolOutput;
  };
}

export type ToolId = keyof ToolRegistry;
export type ToolInput<T extends ToolId> = ToolRegistry[T]['input'];
export type ToolOutput<T extends ToolId> = ToolRegistry[T]['output'];
```

### Storage Types

**Source**: `packages/storage/README.md`

```typescript
export interface SaveWorkflowOptions {
  overwrite?: boolean;
  createBackup?: boolean;
  metadata?: {
    tags?: string[];
    description?: string;
    author?: string;
  };
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  stepsCount: number;
  tags?: string[];
  size: number;
}

export interface StorageStats {
  totalWorkflows: number;
  totalSize: number;
  oldestWorkflow?: Date;
  newestWorkflow?: Date;
}
```

---

## Available Tools

### 1. Screenshot Tool (`screenshot`)

**Input**:
```typescript
interface ScreenshotToolInput {
  top: number;
  left: number;
  width: number;
  height: number;
}
```

**Output**: `string` (base64 image data)

**Example**:
```typescript
{
  id: 'capture-step',
  toolId: 'screenshot',
  inputs: {
    top: 0,
    left: 0,
    width: 1920,
    height: 1080
  }
}
```

### 2. Screen Region Selector (`screen-region-selector`)

**Input**:
```typescript
interface ScreenRegionSelectorInput {
  mode: 'point' | 'rectangle' | 'region';
  timeout?: number; // milliseconds, default: 30000
}
```

**Output**:
```typescript
// Point mode
interface PointSelection {
  x: number;
  y: number;
}

// Rectangle mode  
interface RectangleSelection {
  top: number;
  left: number;
  width: number;
  height: number;
}
```

**Example**:
```typescript
{
  id: 'region-step',
  toolId: 'screen-region-selector',
  inputs: {
    mode: 'rectangle',
    timeout: 30000
  },
  cache: {
    enabled: true,
    persistent: true,
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  }
}
```

### 3. OCR Tool (`ocr`)

**Input**:
```typescript
interface TesseractOcrToolInput {
  imageSource: string | Buffer; // base64 or buffer
  language?: string; // default: 'eng'
  oem?: number; // OCR Engine Mode
  psm?: number; // Page Segmentation Mode
}
```

**Output**:
```typescript
interface TesseractOcrToolOutput {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number; };
  }>;
}
```

### 4. Click Tool (`click`)

**Input**:
```typescript
interface ClickToolInput {
  // Position (use either x,y OR region)
  x?: number;
  y?: number;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Click options
  clickMethod?: 'default' | 'fast' | 'safe' | 'all';
  button?: 'left' | 'right' | 'middle';
  clicks?: number; // 1=single, 2=double, 3=triple
  delay?: number; // ms between clicks
  
  // Visual feedback
  showVisualIndicator?: boolean;
  indicatorTimeout?: number;
}
```

**Output**:
```typescript
interface ClickToolOutput {
  success: boolean;
  clickedAt: { x: number; y: number; };
  method: string;
  error?: string;
}
```

### 5. Template Matcher (`template-matcher`)

**Input**:
```typescript
interface TemplateMatcherInput {
  screenImage?: string | Buffer; // Optional, captures current screen if not provided
  templateIds?: string[];
  categories?: string[];
  tags?: string[];
  minConfidence?: number;
  maxResults?: number;
  searchRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  showVisualIndicators?: boolean;
  overlayTimeout?: number;
}
```

**Output**: `TemplateMatchResult[]`

### 6. Hello World (`hello-world`)

**Input**:
```typescript
interface HelloWorldToolInput {
  message: string;
  data?: any;
}
```

**Output**:
```typescript
interface HelloWorldToolOutput {
  message: string;
  timestamp: string;
  data?: any;
}
```

---

## Workflow Builder Utilities

### Creating Workflows Programmatically

**Source**: `packages/workflows/src/builder.ts`

```typescript
import { workflow, ref } from '@app/workflows';

// Using the fluent builder
const myWorkflow = workflow('my-id', 'My Workflow')
  .step('region', 'screen-region-selector', {
    mode: 'rectangle'
  })
  .step('capture', 'screenshot', {
    top: ref('region', 'top'),
    left: ref('region', 'left'),
    width: ref('region', 'width'),
    height: ref('region', 'height')
  })
  .step('ocr', 'ocr', {
    imageSource: ref('capture')
  })
  .build();

// Manual creation
const manualWorkflow: Workflow = {
  id: 'manual-workflow',
  name: 'Manual Workflow',
  steps: [
    {
      id: 'step1',
      toolId: 'hello-world',
      inputs: { message: 'Hello!' }
    }
  ]
};
```

### Semantic References

Use `{ $ref: "step-id" }` or `{ $ref: "step-id.property" }` to reference outputs from previous steps:

```typescript
// Reference entire previous step output
{ $ref: "{{previous:screenshot}}" }

// Reference specific property
{ $ref: "{{previous:region-selector.top}}" }

// Reference by step ID
{ $ref: "{{capture-step}}" }
```

---

## Component Examples

### Basic Workflow Execution

```typescript
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';

function WorkflowRunner() {
  const { isRunning, lastResult, error, executeCustomWorkflow } = useWorkflowExecution();

  const handleRun = async () => {
    const workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      steps: [
        {
          id: 'hello',
          toolId: 'hello-world',
          inputs: { message: 'Hello from workflow!' }
        }
      ]
    };
    
    await executeCustomWorkflow(workflow);
  };

  return (
    <div>
      <button onClick={handleRun} disabled={isRunning}>
        {isRunning ? 'Running...' : 'Run Workflow'}
      </button>
      {error && <div className="error">{error}</div>}
      {lastResult && (
        <pre>{JSON.stringify(lastResult, null, 2)}</pre>
      )}
    </div>
  );
}
```

### Template Management

```typescript
import { useTemplates } from '../hooks/useTemplates';

function TemplateManager() {
  const { 
    templates, 
    categories, 
    isLoading, 
    error, 
    loadTemplates,
    createNewTemplate 
  } = useTemplates();

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async (imageData: Uint8Array) => {
    try {
      await createNewTemplate({
        name: 'New Template',
        category: 'Custom',
        imageData,
        matchThreshold: 0.8
      });
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  };

  if (isLoading) return <div>Loading templates...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Templates ({templates.length})</h2>
      <div>Categories: {categories.join(', ')}</div>
      {templates.map(template => (
        <div key={template.id}>
          {template.name} - {template.category}
        </div>
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors in async operations:

```typescript
const { error, clearError } = useWorkflowExecution();

useEffect(() => {
  if (error) {
    console.error('Workflow error:', error);
    // Show user notification
    setTimeout(clearError, 5000); // Auto-clear after 5s
  }
}, [error, clearError]);
```

### 2. Caching Configuration

Use caching for expensive operations:

```typescript
{
  id: 'region-select',
  toolId: 'screen-region-selector',
  inputs: { mode: 'rectangle' },
  cache: {
    enabled: true,
    persistent: true, // Survives app restart
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  }
}
```

### 3. Progress Tracking

```typescript
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';

function ProgressTracker() {
  const { progress } = useWorkflowProgress();

  if (!progress) return null;

  return (
    <div>
      Step {progress.currentStep}/{progress.totalSteps}: {progress.stepId}
      <div>Status: {progress.status}</div>
      {progress.status === 'failed' && (
        <div>Error: {progress.error}</div>
      )}
    </div>
  );
}
```

### 4. Type Safety

Always use the provided types for type safety:

```typescript
import type { Workflow, WorkflowStep, ToolId } from '@app/types';

const createWorkflowStep = <T extends ToolId>(
  id: string,
  toolId: T,
  inputs: ToolInput<T>
): WorkflowStep<T> => ({
  id,
  toolId,
  inputs
});
```

---

## Utility Functions

### Electron Version Helpers

**Source**: `packages/electron-versions/README.md`

```typescript
import {
  getElectronVersions,
  getChromeVersion,
  getNodeVersion,
  getChromeMajorVersion,
  getNodeMajorVersion
} from '@app/electron-versions';

// Use in Vite configuration
export default {
  build: {
    target: `chrome${getChromeMajorVersion()}`,
  },
};
```

---

## Missing Features Review

Based on the documentation review, here are potential missing features that might be useful:

1. **Real-time Workflow Editing**: Live preview of workflow changes
2. **Workflow Templates**: Pre-built workflow templates for common tasks  
3. **Batch Operations**: Run workflows on multiple inputs
4. **Workflow Scheduling**: Time-based workflow execution
5. **Export/Import UI**: Visual interface for workflow sharing
6. **Workflow Validation**: Real-time validation of workflow steps
7. **Step Debugging**: Step-by-step debugging with breakpoints
8. **Performance Metrics**: Detailed execution timing and resource usage
9. **Workflow Variables**: Global variables accessible across steps
10. **Conditional Steps**: If/else logic in workflows
11. **Loop Constructs**: Repeat steps with different inputs
12. **Error Recovery**: Automatic retry strategies with backoff
13. **Notification System**: Email/webhook notifications on completion
14. **Workflow Versioning**: Version control for workflows
15. **Collaborative Features**: Share and collaborate on workflows

This documentation covers all current features available for front-end development. The architecture is well-structured with clear separation of concerns and comprehensive type safety.