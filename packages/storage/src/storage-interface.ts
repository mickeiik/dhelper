import type { StoredWorkflow, WorkflowListItem, StorageStats } from './types.js';

export abstract class WorkflowStorageInterface {
    abstract save(workflowId: string, storedWorkflow: StoredWorkflow): Promise<void>;
    abstract load(workflowId: string): Promise<StoredWorkflow | null>;
    abstract delete(workflowId: string): Promise<boolean>;
    abstract list(): Promise<WorkflowListItem[]>;
    abstract exists(workflowId: string): Promise<boolean>;
    abstract getStats(): Promise<StorageStats>;
    abstract clear(): Promise<void>;

    // Optional: Export/Import functionality
    async export(workflowId: string): Promise<string | null> {
        const stored = await this.load(workflowId);
        return stored ? JSON.stringify(stored, null, 2) : null;
    }

    async import(data: string): Promise<string> {
        const stored: StoredWorkflow = JSON.parse(data);
        const workflowId = stored.workflow.id;
        await this.save(workflowId, stored);
        return workflowId;
    }
}