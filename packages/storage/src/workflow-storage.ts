import { FileWorkflowStorage } from './file-storage.js';
import type { WorkflowStorageInterface } from './storage-interface.js';
import type { Workflow } from '@app/types';
import type { StoredWorkflow, WorkflowListItem, SaveWorkflowOptions, StorageStats } from './types.js';

export class WorkflowStorage {
    private storage: WorkflowStorageInterface;

    constructor(storage?: WorkflowStorageInterface) {
        this.storage = storage || new FileWorkflowStorage();
    }

    async saveWorkflow(
        workflow: Workflow,
        options: SaveWorkflowOptions = {}
    ): Promise<void> {
        const now = new Date();

        // Check if workflow already exists to preserve creation date
        const existing = await this.storage.load(workflow.id);
        const createdAt = existing?.metadata.createdAt || now;

        const storedWorkflow: StoredWorkflow = {
            workflow,
            metadata: {
                createdAt,
                updatedAt: now,
                version: '1.0.0', // Could be made configurable
                description: options.description || workflow.description,
                tags: options.tags
            }
        };

        // Include cache data if requested
        if (options.includeCache && existing?.cache) {
            storedWorkflow.cache = existing.cache;
        }

        await this.storage.save(workflow.id, storedWorkflow);
    }

    async loadWorkflow(id: string): Promise<Workflow | null> {
        const stored = await this.storage.load(id);
        return stored?.workflow || null;
    }

    async loadStoredWorkflow(id: string): Promise<StoredWorkflow | null> {
        return this.storage.load(id);
    }

    async deleteWorkflow(id: string): Promise<boolean> {
        return this.storage.delete(id);
    }

    async listWorkflows(): Promise<WorkflowListItem[]> {
        return this.storage.list();
    }

    async workflowExists(id: string): Promise<boolean> {
        return this.storage.exists(id);
    }

    async getStorageStats(): Promise<StorageStats> {
        return this.storage.getStats();
    }

    async clearAllWorkflows(): Promise<void> {
        return this.storage.clear();
    }

    // Cache-related methods
    async saveCacheData(workflowId: string, cacheData: Record<string, any>): Promise<void> {
        const stored = await this.storage.load(workflowId);
        if (!stored) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        stored.cache = cacheData;

        await this.storage.save(workflowId, stored);
    }

    async loadCacheData(workflowId: string): Promise<Record<string, any> | null> {
        const stored = await this.storage.load(workflowId);
        return stored?.cache?.data || null;
    }

    async clearWorkflowCache(workflowId: string): Promise<void> {
        const stored = await this.storage.load(workflowId);
        if (!stored) return;

        if (stored.cache) {
            stored.cache = {};
            await this.storage.save(workflowId, stored);
        }
    }

    // Import/Export functionality
    async exportWorkflow(workflowId: string): Promise<string | null> {
        return this.storage.export(workflowId);
    }

    async importWorkflow(data: string): Promise<string> {
        return this.storage.import(data);
    }

    // Utility methods
    async duplicateWorkflow(sourceId: string, newId: string, newName?: string): Promise<void> {
        const stored = await this.storage.load(sourceId);
        if (!stored) {
            throw new Error(`Source workflow ${sourceId} not found`);
        }

        const duplicated: StoredWorkflow = {
            ...stored,
            workflow: {
                ...stored.workflow,
                id: newId,
                name: newName || `${stored.workflow.name} (Copy)`
            },
            metadata: {
                ...stored.metadata,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };

        // Don't copy cache data for duplicated workflows
        if (duplicated.cache) {
            duplicated.cache = {};
        }

        await this.storage.save(newId, duplicated);
    }

    // Search functionality
    async searchWorkflows(query: string): Promise<WorkflowListItem[]> {
        const all = await this.listWorkflows();
        const lowerQuery = query.toLowerCase();

        return all.filter(workflow =>
            workflow.name.toLowerCase().includes(lowerQuery) ||
            workflow.description?.toLowerCase().includes(lowerQuery) ||
            workflow.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

}