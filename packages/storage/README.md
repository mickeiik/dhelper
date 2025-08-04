# Storage Module API Documentation

This module provides a persistent storage solution for workflow data using file-based storage.

## Core Interface: `WorkflowStorageInterface`

```typescript
export interface WorkflowStorageInterface {
    save(workflowId: string, storedWorkflow: StoredWorkflow): Promise<void>;
    load(workflowId: string): Promise<StoredWorkflow | null>;
    delete(workflowId: string): Promise<boolean>;
    list(): Promise<WorkflowListItem[]>;
    exists(workflowId: string): Promise<boolean>;
    getStats(): Promise<StorageStats>;
    clear(): Promise<void>;
    export(workflowId: string): Promise<string | null>;
    import(data: string): Promise<string>;
}
```

## Implementation: `FileWorkflowStorage`

### Storage Directory
By default stores workflows in:  
`app.getPath('userData') + '/workflows'`

### Key Methods
```typescript
// Save workflow to storage
save(workflowId: string, storedWorkflow: StoredWorkflow): Promise<void>

// Load workflow from storage
load(workflowId: string): Promise<StoredWorkflow | null>

// Delete workflow
delete(workflowId: string): Promise<boolean>

// List all workflows
list(): Promise<WorkflowListItem[]>

// Check if workflow exists
exists(workflowId: string): Promise<boolean>

// Get storage statistics
getStats(): Promise<StorageStats>
```

## Wrapper Class: `WorkflowStorage`

```typescript
export class WorkflowStorage {
    // Save workflow with metadata options
    saveWorkflow(
        workflow: Workflow,
        options: SaveWorkflowOptions = {}
    ): Promise<void>

    // Load workflow data
    loadWorkflow(id: string): Promise<Workflow | null>

    // Get stored workflow including metadata
    loadStoredWorkflow(id: string): Promise<StoredWorkflow | null>

    // Delete workflow
    deleteWorkflow(id: string): Promise<boolean>

    // List all workflows with metadata
    listWorkflows(): Promise<WorkflowListItem[]>

    // Check if workflow exists
    workflowExists(id: string): Promise<boolean>

    // Get storage statistics
    getStorageStats(): Promise<StorageStats>
}
```

## Additional Features

### Cache Management
```typescript
saveCacheData(workflowId: string, cacheData: Record<string, any>): Promise<void>
loadCacheData(workflowId: string): Promise<Record<string, any> | null>
clearWorkflowCache(workflowId: string): Promise<void>
```

### Import/Export
```typescript
exportWorkflow(workflowId: string): Promise<string | null>
importWorkflow(data: string): Promise<string>
```

### Utility Methods
```typescript
duplicateWorkflow(sourceId: string, newId: string, newName?: string): Promise<void>
searchWorkflows(query: string): Promise<WorkflowListItem[]>