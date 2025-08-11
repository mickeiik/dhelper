import type { StoredWorkflow, WorkflowListItem, StorageStats } from './types.js';
import type { WorkflowStorageInterface } from './storage-interface.js';
import { FileBasedStorage, type StorageMetadata } from './unified-storage.js';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';

export class FileWorkflowStorage implements WorkflowStorageInterface {
    private storage: FileBasedStorage<StoredWorkflow>;

    constructor(customDir?: string) {
        const storageDir = customDir || join(app.getPath('userData'), 'workflows');
        
        class WorkflowFileStorage extends FileBasedStorage<StoredWorkflow> {
            protected extractMetadata(stored: StoredWorkflow | null): Partial<StorageMetadata> {
                if (!stored) return {};
                
                return {
                    name: stored.workflow.name,
                    description: stored.workflow.description || stored.metadata.description,
                    stepCount: stored.workflow.steps.length,
                    hasCachedData: !!(stored.cache && Object.keys(stored.cache).length > 0),
                    tags: stored.metadata.tags
                };
            }
        }
        
        this.storage = new WorkflowFileStorage(storageDir);
    }

    async load(workflowId: string): Promise<StoredWorkflow | null> {
        const stored = await this.storage.load(workflowId);
        if (!stored) return null;

        stored.metadata.createdAt = new Date(stored.metadata.createdAt);
        stored.metadata.updatedAt = new Date(stored.metadata.updatedAt);
        return stored;
    }

    async save(workflowId: string, storedWorkflow: StoredWorkflow): Promise<void> {
        return this.storage.save(workflowId, storedWorkflow);
    }

    async delete(workflowId: string): Promise<boolean> {
        return this.storage.delete(workflowId);
    }

    async exists(workflowId: string): Promise<boolean> {
        return this.storage.exists(workflowId);
    }

    async clear(): Promise<void> {
        return this.storage.clear();
    }

    async list(): Promise<WorkflowListItem[]> {
        const baseList = await this.storage.list();
        
        const workflows: WorkflowListItem[] = [];
        
        for (const item of baseList) {
            const stored = await this.load(item.id);
            if (stored) {
                workflows.push({
                    id: stored.workflow.id,
                    name: stored.workflow.name,
                    description: stored.workflow.description || stored.metadata.description,
                    createdAt: stored.metadata.createdAt,
                    updatedAt: stored.metadata.updatedAt,
                    stepCount: stored.workflow.steps.length,
                    hasCachedData: !!(stored.cache && Object.keys(stored.cache).length > 0),
                    tags: stored.metadata.tags
                });
            }
        }
        
        return workflows;
    }

    private getFilePath(id: string): string {
        return join((this.storage as any).storageDir, `${id}.json`);
    }

    async getStats(): Promise<StorageStats> {
        const workflows = await this.list();
        let totalSize = 0;
        let cacheSize = 0;

        for (const workflow of workflows) {
            try {
                const filePath = this.getFilePath(workflow.id);
                const stats = await stat(filePath);
                totalSize += stats.size;

                const stored = await this.load(workflow.id);
                if (stored?.cache) {
                    cacheSize += JSON.stringify(stored.cache).length;
                }
            } catch (error) {
                console.warn(`Failed to get stats for ${workflow.id}:`, error);
            }
        }

        const dates = workflows.map(w => w.updatedAt).sort((a, b) => a.getTime() - b.getTime());

        return {
            totalWorkflows: workflows.length,
            totalSize,
            cacheSize,
            oldestWorkflow: dates[0],
            newestWorkflow: dates[dates.length - 1]
        };
    }

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