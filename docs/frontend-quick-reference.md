# Front-End Quick Reference Guide

## Quick Start

### Essential Imports
```typescript
// Workflow APIs
import { 
  runWorkflow, 
  runCustomWorkflow,
  saveWorkflow,
  loadWorkflow 
} from '@app/preload';

// Workflow Builder
import { workflow, ref } from '@app/workflows';

// Types
import type { 
  Workflow, 
  WorkflowStep, 
  WorkflowResult,
  ToolId 
} from '@app/types';
```

---

## Common Patterns

### 1. Screen Capture + OCR
```typescript
const textExtractionWorkflow = workflow('extract-text', 'Extract Text')
  .step('select', 'screen-region-selector', {
    mode: 'rectangle'
  })
  .step('capture', 'screenshot', {
    top: ref('select', 'top'),
    left: ref('select', 'left'),
    width: ref('select', 'width'),
    height: ref('select', 'height')
  })
  .step('extract', 'tesseract-ocr', ref('capture'))
  .build();

const result = await runCustomWorkflow(textExtractionWorkflow);
const extractedText = result.results['extract'];
```

### 2. Template-Based Automation
```typescript
const clickButtonWorkflow = workflow('click-button', 'Click Button')
  .step('find', 'template-matcher', {
    categories: ['Buttons'],
    minConfidence: 0.8,
    showVisualIndicators: true
  })
  .step('click', 'click', {
    region: ref('find', '[0].location'),
    button: 'left'
  })
  .build();
```

### 3. Cached Operations
```typescript
// Cache region selection for 24 hours
.cachedStep('region', 'screen-region-selector', 
  { mode: 'rectangle' },
  { persistent: true, ttl: 86400000 }
)
```

---

## Tool Input/Output Reference

### Screenshot
```typescript
// Input
{
  top: number,
  left: number,
  width: number,
  height: number
}
// Output: string (base64 image)
```

### Screen Region Selector
```typescript
// Input
{
  mode: 'rectangle' | 'point',
  timeout?: number
}
// Output (rectangle)
{
  top: number,
  left: number,
  width: number,
  height: number
}
// Output (point)
{
  x: number,
  y: number
}
```

### OCR (Tesseract)
```typescript
// Input: string | Buffer (image data)
// Output: string (extracted text)
```

### Template Matcher
```typescript
// Input
{
  screenImage?: string | Buffer,
  templateIds?: string[],
  categories?: string[],
  minConfidence?: number,
  maxResults?: number,
  showVisualIndicators?: boolean
}
// Output: TemplateMatchResult[]
{
  templateId: string,
  confidence: number,
  location: { x, y, width, height },
  template: Template
}
```

### Click
```typescript
// Input
{
  x?: number,
  y?: number,
  region?: { x, y, width, height },
  button?: 'left' | 'right' | 'middle',
  clicks?: number,
  showVisualIndicator?: boolean
}
// Output
{
  success: boolean,
  clickedAt: { x, y }
}
```

---

## React Component Examples

### Workflow Runner Component
```typescript
import React, { useState } from 'react';
import { runCustomWorkflow } from '@app/preload';
import { workflow, ref } from '@app/workflows';

export function WorkflowRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    
    const wf = workflow('demo', 'Demo Workflow')
      .step('hello', 'hello-world', { 
        message: 'Starting workflow...' 
      })
      .build();
    
    try {
      const res = await runCustomWorkflow(wf);
      setResult(res);
    } catch (error) {
      console.error(error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <button onClick={handleRun} disabled={running}>
        {running ? 'Running...' : 'Run Workflow'}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

### Workflow Builder Component
```typescript
import React, { useState } from 'react';
import { saveWorkflow } from '@app/preload';
import type { WorkflowStep } from '@app/types';

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [name, setName] = useState('');

  const addStep = (step: WorkflowStep) => {
    setSteps([...steps, step]);
  };

  const handleSave = async () => {
    const workflow = {
      id: `workflow-${Date.now()}`,
      name,
      steps
    };
    
    await saveWorkflow(workflow, {
      description: 'Created from builder',
      tags: ['custom']
    });
  };

  return (
    <div>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workflow name"
      />
      
      <div>
        {steps.map((step, i) => (
          <div key={i}>
            Step {i + 1}: {step.toolId} - {step.id}
          </div>
        ))}
      </div>
      
      <button onClick={handleSave}>Save Workflow</button>
    </div>
  );
}
```

### Template Manager Component
```typescript
import React, { useState, useEffect } from 'react';
import { listTemplates, createTemplate } from '@app/preload';
import type { TemplateMetadata } from '@app/types';

export function TemplateManager() {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const list = await listTemplates();
    setTemplates(list);
  };

  const handleCreate = async (imageData: Uint8Array) => {
    await createTemplate({
      name: 'New Template',
      category: 'Custom',
      imageData,
      matchThreshold: 0.8
    });
    loadTemplates();
  };

  return (
    <div>
      <h2>Templates ({templates.length})</h2>
      {templates.map(t => (
        <div key={t.id}>
          {t.name} - {t.category}
        </div>
      ))}
    </div>
  );
}
```

---

## Reference Syntax

### Basic References
```typescript
// Reference entire step output
{ $ref: 'step-id' }

// Reference specific property
{ $ref: 'step-id.property' }
{ $ref: 'step-id.nested.property' }

// Array access
{ $ref: 'step-id[0]' }
{ $ref: 'step-id[0].property' }
```

### Semantic References
```typescript
// Previous step
{ $ref: '{{previous}}' }
{ $ref: '{{previous.property}}' }

// Most recent tool type
{ $ref: '{{previous:screenshot}}' }
{ $ref: '{{previous:ocr}}' }
{ $ref: '{{previous:region-selector}}' }
{ $ref: '{{previous:template-matcher}}' }

// With property access
{ $ref: '{{previous:region-selector.width}}' }
```

---

## Storage Operations

### Save & Load
```typescript
// Save workflow
await saveWorkflow(workflow, {
  description: 'My automation',
  tags: ['ocr', 'automation']
});

// Load workflow
const workflow = await loadWorkflow('workflow-id');

// List all workflows
const workflows = await listWorkflows();
```

### Import & Export
```typescript
// Export to JSON
const json = await exportWorkflow('workflow-id');

// Import from JSON
const newId = await importWorkflow(json);

// Duplicate
await duplicateWorkflow('source-id', 'new-id', 'Copy of Workflow');
```

### Cache Management
```typescript
// Clear specific workflow cache
await clearWorkflowCache('workflow-id');

// Clear all caches
await clearAllCaches();

// Get cache stats
const stats = await getCacheStats('workflow-id');
```

---

## Error Handling

### Try-Catch Pattern
```typescript
try {
  const result = await runWorkflow('my-workflow');
  // Handle success
} catch (error) {
  if (error instanceof WorkflowError) {
    console.error('Workflow failed:', error.workflowId);
  } else if (error instanceof ToolExecutionError) {
    console.error('Tool failed:', error.toolId);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Result Pattern
```typescript
const result = await loadWorkflow('id');

if (result) {
  // Workflow loaded successfully
  console.log(result.name);
} else {
  // Workflow not found
  console.error('Workflow not found');
}
```

---

## Workflow Step Options

### Error Handling
```typescript
{
  id: 'my-step',
  toolId: 'screenshot',
  inputs: { /* ... */ },
  
  // Error handling
  onError: 'stop',     // Stop workflow on error (default)
  // onError: 'continue', // Continue to next step
  // onError: 'retry',    // Retry the step
  
  retryCount: 3        // Number of retries (if onError: 'retry')
}
```

### Caching
```typescript
{
  id: 'cached-step',
  toolId: 'template-matcher',
  inputs: { /* ... */ },
  
  cache: {
    enabled: true,       // Enable caching
    persistent: true,    // Persist across app restarts
    ttl: 3600000,       // Time to live (1 hour)
    key: 'custom-key'   // Optional custom cache key
  }
}
```

---

## TypeScript Tips

### Type-Safe Tool Inputs
```typescript
import type { ToolInput } from '@app/types';

// Get input type for specific tool
type ScreenshotInput = ToolInput<'screenshot'>;
type OCRInput = ToolInput<'tesseract-ocr'>;
```

### Type-Safe Step Creation
```typescript
import type { WorkflowStep } from '@app/types';

const screenshotStep: WorkflowStep<'screenshot'> = {
  id: 'capture',
  toolId: 'screenshot',
  inputs: {
    // TypeScript knows these fields
    top: 0,
    left: 0,
    width: 1920,
    height: 1080
  }
};
```

### Generic Workflow Function
```typescript
function createStep<T extends ToolId>(
  id: string,
  toolId: T,
  inputs: ToolInput<T>
): WorkflowStep<T> {
  return { id, toolId, inputs };
}

// Usage
const step = createStep('capture', 'screenshot', {
  top: 0, left: 0, width: 100, height: 100
});
```

---

## Performance Tips

1. **Cache expensive operations**
   - Template matching
   - OCR processing
   - Large screenshots

2. **Use persistent cache for stable UI elements**
   ```typescript
   cache: { persistent: true, ttl: 86400000 }
   ```

3. **Batch operations when possible**
   - Process multiple templates at once
   - Combine related steps

4. **Use appropriate timeouts**
   ```typescript
   { mode: 'rectangle', timeout: 15000 } // 15 seconds
   ```

5. **Clean up old caches periodically**
   ```typescript
   await clearAllCaches();
   ```

---

## Debugging

### Debug Tool
```typescript
// Use hello-world tool for debugging
.step('debug', 'hello-world', {
  message: 'Debug point',
  data: ref('previous-step')
})
```

### Progress Monitoring
```typescript
onWorkflowProgress((progress) => {
  console.log('Progress:', progress);
});
```

### Visual Indicators
```typescript
// Enable visual feedback
{
  showVisualIndicator: true,
  overlayTimeout: 5000
}
```

---

## Common Issues & Solutions

### Issue: Template not matching
```typescript
// Solution: Lower confidence threshold
{
  minConfidence: 0.6, // Lower from default 0.8
  scaleTolerance: 0.2  // Allow scaling
}
```

### Issue: OCR not accurate
```typescript
// Solution: Preprocess image or select better region
.step('enhance', 'screenshot', {
  // Capture larger, clearer area
})
```

### Issue: Workflow too slow
```typescript
// Solution: Enable caching
cache: {
  enabled: true,
  persistent: true
}
```

### Issue: References not working
```typescript
// Solution: Validate references
const validation = validateSemanticReferences(workflow.steps);
console.log(validation.errors);
```