# Front-End Developer API Documentation

## Overview

This documentation covers all APIs, types, and services available for building the front-end interface of the DHelper workflow automation application. The application is built with Electron, React, and TypeScript.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core APIs](#core-apis)
- [Type System](#type-system)
- [Available Tools](#available-tools)
- [Workflow System](#workflow-system)
- [Template System](#template-system)
- [Storage Services](#storage-services)
- [Error Handling](#error-handling)
- [Examples & Patterns](#examples--patterns)

---

## Architecture Overview

The application follows a multi-package monorepo structure with clear separation of concerns:

```
Main Process (Backend)
    ├── Tools System (Execute automation tools)
    ├── Workflow Engine (Run workflow sequences)
    ├── Template Manager (Image template matching)
    └── Storage Services (Persistent data)
           ↓
    IPC Bridge (Secure communication)
           ↓
Renderer Process (Your Front-End)
    └── React Application
```

### Key Packages You'll Interface With

- **@app/types** - All TypeScript type definitions
- **@app/preload** - Secure IPC APIs for main process communication
- **@app/workflows** - Workflow building utilities
- **@app/storage** - Storage type definitions

---

## Core APIs

All main process interactions are exposed through the preload API. Import these functions in your React components:

### Workflow Execution

```typescript
import { 
  runWorkflow, 
  runCustomWorkflow,
  runExampleWorkflow,
  onWorkflowProgress 
} from '@app/preload';

// Run a saved workflow by ID
const result = await runWorkflow('my-workflow-id');

// Run a custom workflow object
const customResult = await runCustomWorkflow({
  id: 'custom-1',
  name: 'My Custom Workflow',
  steps: [...]
});

// Run the example workflow (for testing)
const exampleResult = await runExampleWorkflow();

// Subscribe to workflow progress updates
onWorkflowProgress((progress) => {
  console.log(`Step ${progress.currentStep}/${progress.totalSteps}`);
  console.log(`Status: ${progress.status}`);
});
```

### Workflow Storage

```typescript
import {
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow,
  listWorkflows,
  workflowExists,
  getStorageStats,
  clearAllWorkflows
} from '@app/preload';

// Save a workflow
await saveWorkflow(workflow, { 
  description: 'My automation workflow',
  tags: ['ocr', 'screenshot']
});

// Load a workflow
const workflow = await loadWorkflow('workflow-id');

// List all workflows
const workflows = await listWorkflows();

// Check if workflow exists
const exists = await workflowExists('workflow-id');

// Get storage statistics
const stats = await getStorageStats();
```

### Template Management

```typescript
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  matchTemplates,
  getTemplateStats
} from '@app/preload';

// List all templates
const templates = await listTemplates();

// Search templates
const results = await searchTemplates('button');

// Match templates on screen
const matches = await matchTemplates(screenImage, {
  minConfidence: 0.8,
  maxResults: 5
});

// Create a new template
const template = await createTemplate({
  name: 'Login Button',
  category: 'Buttons',
  imageData: imageBuffer,
  matchThreshold: 0.8
});
```

### Tool Management

```typescript
import { getTools, runTool } from '@app/preload';

// Get list of available tools
const tools = await getTools();

// Run a specific tool
const result = await runTool('screenshot', {
  top: 0,
  left: 0,
  width: 1920,
  height: 1080
});
```

### Cache Management

```typescript
import { 
  clearWorkflowCache, 
  clearAllCaches,
  getCacheStats 
} from '@app/preload';

// Clear cache for specific workflow
await clearWorkflowCache('workflow-id');

// Clear all caches
await clearAllCaches();

// Get cache statistics
const cacheStats = await getCacheStats('workflow-id');
```

### Semantic References

```typescript
import {
  validateSemanticReferences,
  resolveSemanticReferences
} from '@app/preload';

// Validate references in workflow steps
const validation = validateSemanticReferences(workflow.steps);
if (!validation.valid) {
  console.error(validation.errors);
}

// Resolve references with actual values
const resolved = resolveSemanticReferences(
  { $ref: '{{previous:screenshot}}' },
  stepResults
);
```

---

## Type System

### Core Workflow Types

```typescript
import type { 
  Workflow, 
  WorkflowStep, 
  WorkflowResult,
  WorkflowProgress 
} from '@app/types';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

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
    ttl?: number;
  };
}

interface WorkflowResult {
  success: boolean;
  results: Record<string, any>;
  error?: string;
  executionTime: number;
  stepsExecuted: number;
  stepResults: StepResult[];
}

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
}
```

### Template Types

```typescript
import type {
  Template,
  TemplateMetadata,
  TemplateMatchResult,
  CreateTemplateInput,
  UpdateTemplateInput
} from '@app/types';

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
  matchThreshold: number;
  usageCount: number;
}

interface TemplateMatchResult {
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
```

### Tool Types

```typescript
import type { ToolId, ToolInput, ToolOutput } from '@app/types';

// Available tool IDs
type ToolId = 
  | 'screenshot'
  | 'screen-region-selector'
  | 'ocr' 
  | 'tesseract-ocr'
  | 'template-matcher'
  | 'click'
  | 'hello-world';

// Type-safe tool inputs
type ScreenshotInput = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Get input type for a specific tool
type MyInput = ToolInput<'screenshot'>; // ScreenshotInput
```

---

## Available Tools

### 1. Screenshot Tool
Captures a screenshot of a specific screen region.

```typescript
const result = await runTool('screenshot', {
  top: 100,
  left: 100,
  width: 800,
  height: 600
});
// Returns: base64 encoded image string
```

### 2. Screen Region Selector
Interactive tool for selecting screen regions.

```typescript
const result = await runTool('screen-region-selector', {
  mode: 'rectangle', // or 'point'
  timeout: 30000    // 30 seconds
});
// Returns: { top, left, width, height } or { x, y }
```

### 3. OCR Tool (Tesseract)
Extracts text from images.

```typescript
const result = await runTool('tesseract-ocr', imageData);
// Returns: extracted text string
```

### 4. Template Matcher
Finds template images on screen using computer vision.

```typescript
const result = await runTool('template-matcher', {
  screenImage: imageData, // optional, captures current screen if not provided
  templateIds: ['button-1', 'button-2'],
  minConfidence: 0.8,
  showVisualIndicators: true
});
// Returns: array of TemplateMatchResult
```

### 5. Click Tool
Performs mouse clicks at specified locations.

```typescript
const result = await runTool('click', {
  x: 500,
  y: 300,
  button: 'left', // or 'right', 'middle'
  clicks: 1,      // 1=single, 2=double
  showVisualIndicator: true
});
// Returns: { success: boolean, clickedAt: { x, y } }
```

### 6. Hello World (Debug Tool)
Simple tool for testing and debugging workflows.

```typescript
const result = await runTool('hello-world', {
  message: 'Debug message',
  data: { any: 'data' }
});
// Returns: { success: boolean, data: input }
```

---

## Workflow System

### Building Workflows Programmatically

```typescript
import { workflow, ref } from '@app/workflows';

// Using the fluent builder
const myWorkflow = workflow('my-id', 'My Workflow', 'Optional description')
  .step('select-region', 'screen-region-selector', {
    mode: 'rectangle'
  })
  .step('capture', 'screenshot', {
    top: ref('select-region', 'top'),
    left: ref('select-region', 'left'),
    width: ref('select-region', 'width'),
    height: ref('select-region', 'height')
  })
  .cachedStep('extract-text', 'tesseract-ocr', 
    ref('capture'),
    { persistent: true, ttl: 3600000 } // Cache for 1 hour
  )
  .step('log-result', 'hello-world', {
    message: 'OCR Result:',
    data: ref('extract-text')
  })
  .build();
```

### Using References

References allow you to pass outputs from one step as inputs to another:

```typescript
// Reference entire step output
{ $ref: 'step-id' }

// Reference specific property
{ $ref: 'step-id.propertyName' }

// Semantic references (recommended)
{ $ref: '{{previous}}' }              // Previous step output
{ $ref: '{{previous:screenshot}}' }   // Most recent screenshot step
{ $ref: '{{previous:ocr}}' }         // Most recent OCR step
```

### Error Handling Strategies

```typescript
const step: WorkflowStep = {
  id: 'my-step',
  toolId: 'screenshot',
  inputs: { /* ... */ },
  onError: 'continue',  // 'stop' | 'continue' | 'retry'
  retryCount: 3        // Number of retry attempts
};
```

### Caching Strategies

```typescript
const step: WorkflowStep = {
  id: 'expensive-operation',
  toolId: 'template-matcher',
  inputs: { /* ... */ },
  cache: {
    enabled: true,
    persistent: true,     // Survives app restart
    ttl: 86400000,       // Time to live in ms (24 hours)
    key: 'custom-key'    // Optional custom cache key
  }
};
```

---

## Template System

### Creating Templates

```typescript
const template = await createTemplate({
  name: 'Login Button',
  description: 'Blue login button for app X',
  category: 'Buttons',
  tags: ['login', 'authentication'],
  imageData: imageBuffer,
  matchThreshold: 0.8,
  scaleTolerance: 0.1,
  rotationTolerance: 5
});
```

### Template Categories

```typescript
import { TEMPLATE_CATEGORIES } from '@app/types';

// Available categories:
TEMPLATE_CATEGORIES.UI_ELEMENTS    // 'UI Elements'
TEMPLATE_CATEGORIES.TEXT_PATTERNS  // 'Text Patterns'
TEMPLATE_CATEGORIES.BUTTONS        // 'Buttons'
TEMPLATE_CATEGORIES.ICONS          // 'Icons'
TEMPLATE_CATEGORIES.DIALOGS        // 'Dialogs'
TEMPLATE_CATEGORIES.MENUS          // 'Menus'
TEMPLATE_CATEGORIES.FORMS          // 'Forms'
TEMPLATE_CATEGORIES.CUSTOM         // 'Custom'
```

### Template Matching Options

```typescript
const matches = await matchTemplates(screenImage, {
  // Filter options
  templateIds: ['id1', 'id2'],
  categories: ['Buttons', 'Icons'],
  tags: ['login'],
  
  // Matching parameters
  minConfidence: 0.7,
  maxResults: 10,
  
  // Search region
  searchRegion: {
    x: 100,
    y: 100,
    width: 800,
    height: 600
  },
  
  // Visual feedback
  showVisualIndicators: true,
  overlayTimeout: 5000
});
```

---

## Storage Services

### Workflow Storage

```typescript
import type { 
  StoredWorkflow,
  WorkflowListItem,
  SaveWorkflowOptions,
  StorageStats 
} from '@app/storage';

interface SaveWorkflowOptions {
  includeCache?: boolean;
  tags?: string[];
  description?: string;
}

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

interface StorageStats {
  totalWorkflows: number;
  totalSize: number;
  cacheSize: number;
  oldestWorkflow?: Date;
  newestWorkflow?: Date;
}
```

### Import/Export Workflows

```typescript
// Export workflow to JSON
const exported = await exportWorkflow('workflow-id');
// Returns: JSON string

// Import workflow from JSON
const newId = await importWorkflow(jsonString);
// Returns: new workflow ID

// Duplicate workflow
await duplicateWorkflow('source-id', 'new-id', 'New Name');
```

---

## Error Handling

### Error Types

```typescript
import { 
  DHelperError,
  ToolExecutionError,
  WorkflowError,
  StorageError,
  TemplateError 
} from '@app/types';

// Check error types
if (error instanceof WorkflowError) {
  console.error(`Workflow ${error.workflowId} failed:`, error.message);
}

if (error instanceof ToolExecutionError) {
  console.error(`Tool ${error.toolId} failed:`, error.message);
}
```

### Result Pattern

```typescript
import { Result, success, failure, isSuccess } from '@app/types';

// Functions return Result<T>
const result: Result<Workflow> = await loadWorkflow('id');

if (isSuccess(result)) {
  // Access data
  const workflow = result.data;
} else {
  // Handle error
  console.error(result.error);
}
```

### Error Utilities

```typescript
import { 
  ErrorLogger,
  formatErrorMessage,
  isNotFoundError,
  isConnectionError,
  isPermissionError 
} from '@app/types';

// Create a logger
const logger = new ErrorLogger('MyComponent');
logger.logError(error);
logger.logWarning('Something might be wrong');

// Format errors for display
const userMessage = formatErrorMessage(error);

// Check error types
if (isNotFoundError(error)) {
  // Handle not found
}
```

---

## Examples & Patterns

### Complete Workflow Example

```typescript
import { workflow, ref } from '@app/workflows';
import { runCustomWorkflow, onWorkflowProgress } from '@app/preload';
import { useState, useEffect } from 'react';

function MyWorkflowComponent() {
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribe = onWorkflowProgress(setProgress);
    return unsubscribe;
  }, []);

  const runAutomation = async () => {
    // Build workflow
    const wf = workflow('automation-1', 'Screen OCR Automation')
      .step('select', 'screen-region-selector', {
        mode: 'rectangle',
        timeout: 30000
      })
      .step('capture', 'screenshot', {
        top: ref('select', 'top'),
        left: ref('select', 'left'),
        width: ref('select', 'width'),
        height: ref('select', 'height')
      })
      .cachedStep('ocr', 'tesseract-ocr', ref('capture'), {
        persistent: true,
        ttl: 3600000
      })
      .step('click-result', 'click', {
        x: ref('select', 'left'),
        y: ref('select', 'top'),
        showVisualIndicator: true
      })
      .build();

    // Execute workflow
    const result = await runCustomWorkflow(wf);
    setResult(result);
  };

  return (
    <div>
      <button onClick={runAutomation}>Run Automation</button>
      
      {progress && (
        <div>
          Step {progress.currentStep}/{progress.totalSteps}: {progress.stepId}
          <br />
          Status: {progress.status}
        </div>
      )}
      
      {result && (
        <div>
          Success: {result.success ? 'Yes' : 'No'}
          <br />
          Execution Time: {result.executionTime}ms
        </div>
      )}
    </div>
  );
}
```

### Template Matching Example

```typescript
import { matchTemplates, runTool } from '@app/preload';

async function findAndClickButton() {
  // Find button on screen
  const matches = await matchTemplates(null, {
    categories: ['Buttons'],
    tags: ['submit', 'confirm'],
    minConfidence: 0.8,
    showVisualIndicators: true
  });

  if (matches.length > 0) {
    const bestMatch = matches[0];
    
    // Click on the found button
    await runTool('click', {
      region: bestMatch.location,
      button: 'left',
      clicks: 1
    });
  }
}
```

### Error Handling Example

```typescript
import { isSuccess, formatErrorMessage } from '@app/types';
import { loadWorkflow } from '@app/preload';

async function safeLoadWorkflow(id: string) {
  try {
    const result = await loadWorkflow(id);
    
    if (!result) {
      throw new Error('Workflow not found');
    }
    
    return result;
  } catch (error) {
    // Log error
    console.error('Failed to load workflow:', error);
    
    // Show user-friendly message
    const message = formatErrorMessage(error);
    alert(message);
    
    return null;
  }
}
```

---

## Best Practices

### 1. Always Handle Errors
```typescript
try {
  const result = await runWorkflow('my-workflow');
  // Handle success
} catch (error) {
  // Always handle errors gracefully
  console.error(formatErrorMessage(error));
}
```

### 2. Use Semantic References
```typescript
// Good - semantic reference
{ $ref: '{{previous:screenshot}}' }

// Less maintainable - hardcoded step ID
{ $ref: 'step-3' }
```

### 3. Cache Expensive Operations
```typescript
.cachedStep('expensive-op', 'template-matcher', inputs, {
  persistent: true,
  ttl: 86400000 // 24 hours
})
```

### 4. Validate Before Execution
```typescript
const validation = validateSemanticReferences(workflow.steps);
if (!validation.valid) {
  // Handle validation errors
  console.error(validation.errors);
}
```

### 5. Use TypeScript Types
```typescript
import type { Workflow, WorkflowStep, ToolId } from '@app/types';

// Type-safe workflow building
const step: WorkflowStep<'screenshot'> = {
  id: 'capture',
  toolId: 'screenshot',
  inputs: { /* autocompleted */ }
};
```

---

## Need Help?

- Check the error messages - they're designed to be helpful
- Use the `hello-world` tool for debugging workflows
- Enable visual indicators when working with screen automation
- Cache results during development to speed up testing
- Use semantic references for maintainable workflows

For additional features or handler augmentation, please request specific functionality and the backend handlers can be extended to support your needs.