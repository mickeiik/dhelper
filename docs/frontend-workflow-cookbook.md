# Front-End Workflow Cookbook

## Real-World Workflow Examples

This cookbook provides ready-to-use workflow patterns for common automation tasks. Each example includes complete code that can be copied and modified for your specific needs.

---

## 📋 Table of Contents

1. [Form Filling Automation](#form-filling-automation)
2. [Data Extraction Workflows](#data-extraction-workflows)
3. [UI Testing Patterns](#ui-testing-patterns)
4. [Document Processing](#document-processing)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Batch Operations](#batch-operations)
7. [Advanced Patterns](#advanced-patterns)

---

## Form Filling Automation

### Auto-Fill Login Form

```typescript
import { workflow, ref } from '@app/workflows';

const loginWorkflow = workflow('auto-login', 'Automated Login')
  // Find username field
  .step('find-username', 'template-matcher', {
    templateNames: ['username-field', 'email-field'],
    minConfidence: 0.8,
    showVisualIndicators: true
  })
  // Click username field
  .step('click-username', 'click', {
    region: ref('find-username', '[0].location'),
    clicks: 1
  })
  // Type username (would need keyboard tool)
  .step('find-password', 'template-matcher', {
    templateNames: ['password-field'],
    minConfidence: 0.8
  })
  // Click password field
  .step('click-password', 'click', {
    region: ref('find-password', '[0].location'),
    clicks: 1
  })
  // Find and click submit button
  .step('find-submit', 'template-matcher', {
    categories: ['Buttons'],
    tags: ['submit', 'login'],
    minConfidence: 0.7
  })
  .step('submit-form', 'click', {
    region: ref('find-submit', '[0].location'),
    clicks: 1,
    showVisualIndicator: true
  })
  .build();
```

### Multi-Field Form with Validation

```typescript
const formFillingWorkflow = workflow('fill-form', 'Fill Complex Form')
  // Cache the form region for repeated use
  .cachedStep('form-region', 'screen-region-selector', {
    mode: 'rectangle'
  }, {
    persistent: true,
    ttl: 3600000 // 1 hour
  })
  // Find all form fields in the region
  .step('find-fields', 'template-matcher', {
    categories: ['Forms'],
    searchRegion: ref('form-region'),
    minConfidence: 0.7,
    maxResults: 10
  })
  // Process each field
  .step('process-fields', 'hello-world', {
    message: 'Found form fields',
    data: ref('find-fields')
  })
  // Validate form before submission
  .step('validate', 'screenshot', ref('form-region'))
  .step('check-validation', 'tesseract-ocr', ref('validate'))
  .step('validation-result', 'hello-world', {
    message: 'Validation check',
    data: ref('check-validation')
  })
  .build();
```

---

## Data Extraction Workflows

### Extract Table Data

```typescript
const tableExtractionWorkflow = workflow('extract-table', 'Extract Table Data')
  // Select table region
  .step('select-table', 'screen-region-selector', {
    mode: 'rectangle'
  })
  // Capture table screenshot
  .step('capture-table', 'screenshot', {
    top: ref('select-table', 'top'),
    left: ref('select-table', 'left'),
    width: ref('select-table', 'width'),
    height: ref('select-table', 'height')
  })
  // Extract text with OCR
  .cachedStep('extract-text', 'tesseract-ocr', 
    ref('capture-table'),
    { persistent: true }
  )
  // Process extracted data
  .step('process-data', 'hello-world', {
    message: 'Table data extracted',
    data: ref('extract-text')
  })
  .build();
```

### Monitor Price Changes

```typescript
const priceMonitorWorkflow = workflow('price-monitor', 'Monitor Price Changes')
  // Find price element using template
  .step('find-price', 'template-matcher', {
    templateNames: ['price-tag', 'dollar-sign'],
    minConfidence: 0.8
  })
  // Capture price region
  .step('capture-price', 'screenshot', {
    top: ref('find-price', '[0].location.y'),
    left: ref('find-price', '[0].location.x'),
    width: ref('find-price', '[0].location.width'),
    height: ref('find-price', '[0].location.height')
  })
  // Extract price text
  .step('extract-price', 'tesseract-ocr', ref('capture-price'))
  // Store and compare
  .cachedStep('store-price', 'hello-world', {
    message: 'Current price',
    data: {
      price: ref('extract-price'),
      timestamp: new Date().toISOString()
    }
  }, {
    persistent: true,
    key: 'price-history'
  })
  .build();
```

### Scrape Multiple Data Points

```typescript
const multiDataWorkflow = workflow('multi-scrape', 'Scrape Multiple Data Points')
  // Define regions of interest
  .step('title-region', 'template-matcher', {
    templateNames: ['title-area'],
    maxResults: 1
  })
  .step('price-region', 'template-matcher', {
    templateNames: ['price-area'],
    maxResults: 1
  })
  .step('description-region', 'template-matcher', {
    templateNames: ['description-area'],
    maxResults: 1
  })
  // Capture all regions
  .step('capture-title', 'screenshot', {
    top: ref('title-region', '[0].location.y'),
    left: ref('title-region', '[0].location.x'),
    width: ref('title-region', '[0].location.width'),
    height: ref('title-region', '[0].location.height')
  })
  .step('capture-price', 'screenshot', {
    top: ref('price-region', '[0].location.y'),
    left: ref('price-region', '[0].location.x'),
    width: ref('price-region', '[0].location.width'),
    height: ref('price-region', '[0].location.height')
  })
  // Extract all text
  .step('extract-title', 'tesseract-ocr', ref('capture-title'))
  .step('extract-price', 'tesseract-ocr', ref('capture-price'))
  // Combine results
  .step('combine-data', 'hello-world', {
    message: 'Scraped data',
    data: {
      title: ref('extract-title'),
      price: ref('extract-price'),
      timestamp: new Date().toISOString()
    }
  })
  .build();
```

---

## UI Testing Patterns

### Button Click Verification

```typescript
const buttonTestWorkflow = workflow('test-button', 'Test Button Click')
  // Find button
  .step('find-button', 'template-matcher', {
    templateNames: ['test-button'],
    minConfidence: 0.9,
    showVisualIndicators: true
  })
  // Capture before state
  .step('before-state', 'screenshot', {
    top: 0,
    left: 0,
    width: 1920,
    height: 1080
  })
  // Click button
  .step('click-button', 'click', {
    region: ref('find-button', '[0].location'),
    clicks: 1,
    showVisualIndicator: true
  })
  // Wait and capture after state
  .step('after-state', 'screenshot', {
    top: 0,
    left: 0,
    width: 1920,
    height: 1080
  })
  // Verify changes
  .step('verify', 'hello-world', {
    message: 'Test completed',
    data: {
      buttonFound: ref('find-button'),
      clicked: ref('click-button')
    }
  })
  .build();
```

### Navigation Flow Test

```typescript
const navigationTestWorkflow = workflow('test-nav', 'Test Navigation Flow')
  // Click first menu item
  .step('menu-1', 'template-matcher', {
    categories: ['Menus'],
    tags: ['home'],
    minConfidence: 0.8
  })
  .step('click-1', 'click', {
    region: ref('menu-1', '[0].location')
  })
  // Verify page loaded
  .step('verify-1', 'template-matcher', {
    templateNames: ['home-page-indicator'],
    minConfidence: 0.8
  })
  // Click second menu item
  .step('menu-2', 'template-matcher', {
    categories: ['Menus'],
    tags: ['products'],
    minConfidence: 0.8
  })
  .step('click-2', 'click', {
    region: ref('menu-2', '[0].location')
  })
  // Verify navigation
  .step('verify-2', 'template-matcher', {
    templateNames: ['products-page-indicator'],
    minConfidence: 0.8
  })
  .step('test-result', 'hello-world', {
    message: 'Navigation test complete',
    data: {
      homeLoaded: ref('verify-1'),
      productsLoaded: ref('verify-2')
    }
  })
  .build();
```

---

## Document Processing

### PDF Text Extraction

```typescript
const pdfExtractionWorkflow = workflow('pdf-extract', 'Extract PDF Text')
  // Select PDF viewer area
  .cachedStep('pdf-area', 'screen-region-selector', {
    mode: 'rectangle'
  }, {
    persistent: true,
    ttl: 3600000
  })
  // Process each page
  .step('page-1', 'screenshot', ref('pdf-area'))
  .step('extract-1', 'tesseract-ocr', ref('page-1'))
  // Click next page
  .step('next-button', 'template-matcher', {
    templateNames: ['next-page-button'],
    minConfidence: 0.8
  })
  .step('click-next', 'click', {
    region: ref('next-button', '[0].location')
  })
  // Process page 2
  .step('page-2', 'screenshot', ref('pdf-area'))
  .step('extract-2', 'tesseract-ocr', ref('page-2'))
  // Combine results
  .step('combine-text', 'hello-world', {
    message: 'PDF text extracted',
    data: {
      page1: ref('extract-1'),
      page2: ref('extract-2')
    }
  })
  .build();
```

### Invoice Data Extraction

```typescript
const invoiceWorkflow = workflow('invoice-extract', 'Extract Invoice Data')
  // Find invoice number
  .step('find-invoice-num', 'template-matcher', {
    templateNames: ['invoice-number-label'],
    minConfidence: 0.8
  })
  .step('capture-invoice-num', 'screenshot', {
    top: ref('find-invoice-num', '[0].location.y'),
    left: ref('find-invoice-num', '[0].location.x') + 150,
    width: 200,
    height: ref('find-invoice-num', '[0].location.height')
  })
  .step('extract-invoice-num', 'tesseract-ocr', ref('capture-invoice-num'))
  
  // Find total amount
  .step('find-total', 'template-matcher', {
    templateNames: ['total-label'],
    minConfidence: 0.8
  })
  .step('capture-total', 'screenshot', {
    top: ref('find-total', '[0].location.y'),
    left: ref('find-total', '[0].location.x') + 100,
    width: 150,
    height: ref('find-total', '[0].location.height')
  })
  .step('extract-total', 'tesseract-ocr', ref('capture-total'))
  
  // Combine invoice data
  .step('invoice-data', 'hello-world', {
    message: 'Invoice processed',
    data: {
      invoiceNumber: ref('extract-invoice-num'),
      totalAmount: ref('extract-total'),
      processedAt: new Date().toISOString()
    }
  })
  .build();
```

---

## Monitoring & Alerts

### Website Availability Monitor

```typescript
const monitorWorkflow = workflow('site-monitor', 'Monitor Website Availability')
  // Look for expected elements
  .step('check-header', 'template-matcher', {
    templateNames: ['site-header'],
    minConfidence: 0.9,
    maxResults: 1
  })
  .step('check-content', 'template-matcher', {
    templateNames: ['main-content'],
    minConfidence: 0.9,
    maxResults: 1
  })
  // Check for error indicators
  .step('check-errors', 'template-matcher', {
    templateNames: ['error-404', 'error-500', 'error-message'],
    minConfidence: 0.8,
    maxResults: 5
  })
  // Generate status report
  .step('status', 'hello-world', {
    message: 'Site status',
    data: {
      headerFound: ref('check-header', 'length'),
      contentFound: ref('check-content', 'length'),
      errorsFound: ref('check-errors', 'length'),
      status: ref('check-errors', 'length') > 0 ? 'ERROR' : 'OK',
      timestamp: new Date().toISOString()
    }
  })
  .build();
```

### Change Detection

```typescript
const changeDetectionWorkflow = workflow('detect-changes', 'Detect UI Changes')
  // Capture current state
  .step('capture-current', 'screenshot', {
    top: 0,
    left: 0,
    width: 1920,
    height: 1080
  })
  // Load previous state from cache
  .cachedStep('previous-state', 'hello-world', {
    message: 'Loading previous state',
    data: null
  }, {
    persistent: true,
    key: 'ui-state'
  })
  // Store current as new previous
  .cachedStep('store-current', 'hello-world', {
    message: 'Storing current state',
    data: ref('capture-current')
  }, {
    persistent: true,
    key: 'ui-state'
  })
  // Compare states (would need comparison tool)
  .step('compare', 'hello-world', {
    message: 'Change detection complete',
    data: {
      current: ref('capture-current'),
      previous: ref('previous-state'),
      timestamp: new Date().toISOString()
    }
  })
  .build();
```

---

## Batch Operations

### Process Multiple Items

```typescript
const batchProcessWorkflow = workflow('batch-process', 'Process Multiple Items')
  // Find all items on page
  .step('find-items', 'template-matcher', {
    categories: ['Items'],
    minConfidence: 0.7,
    maxResults: 20,
    showVisualIndicators: true
  })
  // Process first item
  .step('item-1', 'screenshot', {
    top: ref('find-items', '[0].location.y'),
    left: ref('find-items', '[0].location.x'),
    width: ref('find-items', '[0].location.width'),
    height: ref('find-items', '[0].location.height')
  })
  .step('extract-1', 'tesseract-ocr', ref('item-1'))
  // Process second item
  .step('item-2', 'screenshot', {
    top: ref('find-items', '[1].location.y'),
    left: ref('find-items', '[1].location.x'),
    width: ref('find-items', '[1].location.width'),
    height: ref('find-items', '[1].location.height')
  })
  .step('extract-2', 'tesseract-ocr', ref('item-2'))
  // Combine results
  .step('batch-results', 'hello-world', {
    message: 'Batch processing complete',
    data: {
      totalItems: ref('find-items', 'length'),
      item1: ref('extract-1'),
      item2: ref('extract-2')
    }
  })
  .build();
```

### Sequential Click Operations

```typescript
const sequentialClickWorkflow = workflow('sequential-clicks', 'Click Multiple Targets')
  // Find all clickable targets
  .step('find-targets', 'template-matcher', {
    categories: ['Buttons'],
    tags: ['clickable'],
    minConfidence: 0.8,
    maxResults: 10
  })
  // Click first target
  .step('click-1', 'click', {
    region: ref('find-targets', '[0].location'),
    showVisualIndicator: true
  })
  // Small delay
  .step('wait-1', 'hello-world', {
    message: 'Waiting...',
    data: { delay: 500 }
  })
  // Click second target
  .step('click-2', 'click', {
    region: ref('find-targets', '[1].location'),
    showVisualIndicator: true
  })
  // Click third target
  .step('click-3', 'click', {
    region: ref('find-targets', '[2].location'),
    showVisualIndicator: true
  })
  .step('complete', 'hello-world', {
    message: 'Sequential clicks complete',
    data: {
      targetsFound: ref('find-targets', 'length'),
      clicked: 3
    }
  })
  .build();
```

---

## Advanced Patterns

### Conditional Workflow (Simulated)

```typescript
// Note: True conditional logic would require additional tool support
const conditionalWorkflow = workflow('conditional', 'Conditional Execution')
  // Check condition
  .step('check-condition', 'template-matcher', {
    templateNames: ['success-indicator'],
    minConfidence: 0.9,
    maxResults: 1
  })
  // Path A: Success found
  .step('success-path', 'screenshot', {
    top: ref('check-condition', '[0].location.y'),
    left: ref('check-condition', '[0].location.x'),
    width: ref('check-condition', '[0].location.width'),
    height: ref('check-condition', '[0].location.height'),
    onError: 'continue' // Continue if this fails
  })
  // Path B: Alternative action
  .step('alternative-path', 'template-matcher', {
    templateNames: ['error-indicator'],
    minConfidence: 0.8,
    onError: 'continue'
  })
  // Final action
  .step('final', 'hello-world', {
    message: 'Conditional workflow complete',
    data: {
      successPath: ref('success-path'),
      alternativePath: ref('alternative-path')
    }
  })
  .build();
```

### Retry Pattern

```typescript
const retryWorkflow = workflow('retry-pattern', 'Retry on Failure')
  // Attempt operation with retry
  .step('attempt-1', 'template-matcher', {
    templateNames: ['target-element'],
    minConfidence: 0.9,
    onError: 'retry',
    retryCount: 3
  })
  // If found, click it
  .step('click-target', 'click', {
    region: ref('attempt-1', '[0].location'),
    onError: 'retry',
    retryCount: 2
  })
  // Verify success
  .step('verify', 'template-matcher', {
    templateNames: ['success-message'],
    minConfidence: 0.8,
    onError: 'continue'
  })
  .step('result', 'hello-world', {
    message: 'Operation result',
    data: {
      targetFound: ref('attempt-1'),
      clicked: ref('click-target'),
      verified: ref('verify')
    }
  })
  .build();
```

### Parallel-Like Processing

```typescript
// Simulate parallel processing by capturing all data first
const parallelWorkflow = workflow('parallel', 'Parallel-like Processing')
  // Capture all regions at once
  .step('region-1', 'screenshot', {
    top: 0, left: 0, width: 960, height: 540
  })
  .step('region-2', 'screenshot', {
    top: 0, left: 960, width: 960, height: 540
  })
  .step('region-3', 'screenshot', {
    top: 540, left: 0, width: 960, height: 540
  })
  .step('region-4', 'screenshot', {
    top: 540, left: 960, width: 960, height: 540
  })
  // Process all regions
  .cachedStep('process-1', 'tesseract-ocr', ref('region-1'), {
    persistent: true
  })
  .cachedStep('process-2', 'tesseract-ocr', ref('region-2'), {
    persistent: true
  })
  .cachedStep('process-3', 'tesseract-ocr', ref('region-3'), {
    persistent: true
  })
  .cachedStep('process-4', 'tesseract-ocr', ref('region-4'), {
    persistent: true
  })
  // Combine results
  .step('combine', 'hello-world', {
    message: 'Parallel processing complete',
    data: {
      region1: ref('process-1'),
      region2: ref('process-2'),
      region3: ref('process-3'),
      region4: ref('process-4')
    }
  })
  .build();
```

---

## React Integration Examples

### Workflow Execution Hook

```typescript
// useWorkflowExecution.ts
import { useState, useCallback } from 'react';
import { runCustomWorkflow } from '@app/preload';
import type { Workflow, WorkflowResult } from '@app/types';

export function useWorkflowExecution() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (workflow: Workflow) => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await runCustomWorkflow(workflow);
      setResult(res);
      return res;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setRunning(false);
    }
  }, []);

  return { execute, running, result, error };
}
```

### Workflow Builder Component

```typescript
// WorkflowBuilder.tsx
import React, { useState } from 'react';
import { workflow } from '@app/workflows';
import { useWorkflowExecution } from './useWorkflowExecution';

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<any[]>([]);
  const { execute, running, result } = useWorkflowExecution();

  const addScreenshotStep = () => {
    setSteps([...steps, {
      type: 'screenshot',
      config: { top: 0, left: 0, width: 1920, height: 1080 }
    }]);
  };

  const runWorkflow = async () => {
    const wf = workflow('custom', 'Custom Workflow');
    
    steps.forEach((step, index) => {
      if (step.type === 'screenshot') {
        wf.step(`step-${index}`, 'screenshot', step.config);
      }
      // Add other step types...
    });

    await execute(wf.build());
  };

  return (
    <div>
      <button onClick={addScreenshotStep}>Add Screenshot</button>
      <button onClick={runWorkflow} disabled={running}>
        Run Workflow
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

---

## Tips & Best Practices

1. **Always cache expensive operations** - OCR and template matching are computationally expensive
2. **Use semantic references** - They're more maintainable than hardcoded step IDs
3. **Add visual indicators during development** - Helps debug template matching
4. **Handle errors gracefully** - Use `onError: 'continue'` for non-critical steps
5. **Test with different screen resolutions** - Templates may need different confidence levels
6. **Document your templates** - Use meaningful names and descriptions
7. **Version your workflows** - Save different versions for testing
8. **Monitor performance** - Check execution times and optimize slow steps
9. **Use persistent cache wisely** - For UI elements that rarely change
10. **Validate inputs** - Check that references resolve correctly before execution