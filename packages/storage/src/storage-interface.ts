import type { StoredWorkflow, WorkflowListItem, StorageStats } from './types.js';

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