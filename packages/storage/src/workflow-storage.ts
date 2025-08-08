import type { Workflow, Result } from '@app/types';
import { StorageError, WorkflowError, success, failure, tryAsync } from '@app/types';
import type { StoredWorkflow, WorkflowListItem, SaveWorkflowOptions, StorageStats } from './types.js';
import { writeFile, readFile, mkdir, unlink, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export class WorkflowStorage {
    private storageDir: string;
    private initialized = false;

    constructor(customDir?: string) {
        this.storageDir = customDir || join(app.getPath('userData'), 'workflows');
    }

    private async initialize(): Promise<void> {
        if (this.initialized) return;
        
        try {
            await mkdir(this.storageDir, { recursive: true });
            this.initialized = true;
        } catch (error) {
            throw new StorageError('Failed to initialize workflow storage', 'initialize', { originalError: error });
        }
    }

    private getFilePath(workflowId: string): string {
        return join(this.storageDir, `${workflowId}.json`);
    }

    async saveWorkflow(
        workflow: Workflow,
        options: SaveWorkflowOptions = {}
    ): Promise<void> {
        await this.initialize();
        const now = new Date();

        // Check if workflow already exists to preserve creation date
        const existingResult = await this.loadStoredWorkflow(workflow.id);
        const existing = existingResult.success ? existingResult.data : null;
        const createdAt = existing?.metadata.createdAt || now;

        const storedWorkflow: StoredWorkflow = {
            workflow,
            metadata: {
                createdAt,
                updatedAt: now,
                version: '1.0.0',
                description: options.description || workflow.description,
                tags: options.tags
            }
        };

        // Include cache data if requested
        if (options.includeCache && existing?.cache) {
            storedWorkflow.cache = existing.cache;
        }

        try {
            const filePath = this.getFilePath(workflow.id);
            const data = JSON.stringify(storedWorkflow, null, 2);
            await writeFile(filePath, data, 'utf-8');
        } catch (error) {
            throw new WorkflowError(`Failed to save workflow ${workflow.id}`, workflow.id, { originalError: error });
        }
    }

    async loadWorkflow(id: string): Promise<Result<Workflow, WorkflowError>> {
        const storedResult = await this.loadStoredWorkflow(id);
        if (!storedResult.success) {
            return failure(storedResult.error);
        }
        if (!storedResult.data) {
            return failure(new WorkflowError('Workflow not found', id));
        }
        return success(storedResult.data.workflow);
    }

    async loadStoredWorkflow(id: string): Promise<Result<StoredWorkflow, WorkflowError>> {
        await this.initialize();

        return tryAsync(async () => {
            const filePath = this.getFilePath(id);

            if (!existsSync(filePath)) {
                throw new WorkflowError('Workflow file not found', id);
            }

            const data = await readFile(filePath, 'utf-8');
            const stored: StoredWorkflow = JSON.parse(data);

            // Convert date strings back to Date objects
            stored.metadata.createdAt = new Date(stored.metadata.createdAt);
            stored.metadata.updatedAt = new Date(stored.metadata.updatedAt);

            return stored;
        }, (error) => new WorkflowError(`Failed to load workflow ${id}`, id, { originalError: error }));
    }

    async deleteWorkflow(id: string): Promise<Result<boolean, WorkflowError>> {
        await this.initialize();

        return tryAsync(async () => {
            const filePath = this.getFilePath(id);

            if (!existsSync(filePath)) {
                throw new WorkflowError('Workflow not found', id);
            }

            await unlink(filePath);
            return true;
        }, (error) => new WorkflowError(`Failed to delete workflow ${id}`, id, { originalError: error }));
    }

    async listWorkflows(): Promise<Result<WorkflowListItem[], StorageError>> {
        await this.initialize();

        return tryAsync(async () => {
            if (!existsSync(this.storageDir)) {
                return [];
            }

            const files = await readdir(this.storageDir);
            const workflowFiles = files.filter(file => file.endsWith('.json'));

            const workflows: WorkflowListItem[] = [];

            for (const file of workflowFiles) {
                try {
                    const workflowId = file.replace('.json', '');
                    const storedResult = await this.loadStoredWorkflow(workflowId);

                    if (storedResult.success && storedResult.data) {
                        const stored = storedResult.data;
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
                    // Skip files that can't be loaded rather than failing entire operation
                } catch (error) {
                    // Skip individual file errors but log them
                    console.warn(`Failed to load workflow info from ${file}:`, error);
                }
            }

            // Sort by updatedAt (newest first)
            workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            return workflows;
        }, (error) => new StorageError('Failed to list workflows', 'list', { originalError: error }));
    }

    async workflowExists(id: string): Promise<boolean> {
        await this.initialize();
        const filePath = this.getFilePath(id);
        return existsSync(filePath);
    }

    async getStorageStats(): Promise<StorageStats> {
        await this.initialize();

        const workflowsResult = await this.listWorkflows();
        if (!workflowsResult.success) {
            throw workflowsResult.error;
        }
        const workflows = workflowsResult.data;
        let totalSize = 0;
        let cacheSize = 0;

        for (const workflow of workflows) {
            try {
                const filePath = this.getFilePath(workflow.id);
                const stats = await stat(filePath);
                totalSize += stats.size;

                // Estimate cache size
                const storedResult = await this.loadStoredWorkflow(workflow.id);
                if (storedResult.success && storedResult.data?.cache) {
                    cacheSize += JSON.stringify(storedResult.data.cache).length;
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

    async clearAllWorkflows(): Promise<void> {
        await this.initialize();

        try {
            const workflowsResult = await this.listWorkflows();
            if (!workflowsResult.success) {
                throw workflowsResult.error;
            }
            const workflows = workflowsResult.data;

            for (const workflow of workflows) {
                const deleteResult = await this.deleteWorkflow(workflow.id);
                if (!deleteResult.success) {
                    console.warn(`Failed to delete workflow ${workflow.id}:`, deleteResult.error);
                }
            }
        } catch (error) {
            throw new StorageError('Failed to clear all workflows', 'clearAll', { originalError: error });
        }
    }

    // Cache-related methods
    async clearWorkflowCache(workflowId: string): Promise<void> {
        const storedResult = await this.loadStoredWorkflow(workflowId);
        if (!storedResult.success || !storedResult.data) return;

        const stored = storedResult.data;
        if (stored.cache) {
            stored.cache = {};
            await this.saveWorkflow(stored.workflow, { includeCache: true });
        }
    }

    // Import/Export functionality
    async exportWorkflow(workflowId: string): Promise<string | null> {
        const stored = await this.loadStoredWorkflow(workflowId);
        return stored ? JSON.stringify(stored, null, 2) : null;
    }

    async importWorkflow(data: string): Promise<string> {
        const stored: StoredWorkflow = JSON.parse(data);
        const workflowId = stored.workflow.id;
        await this.saveWorkflow(stored.workflow, { includeCache: true });
        return workflowId;
    }

    // Utility methods
    async duplicateWorkflow(sourceId: string, newId: string, newName?: string): Promise<void> {
        const storedResult = await this.loadStoredWorkflow(sourceId);
        if (!storedResult.success || !storedResult.data) {
            throw new WorkflowError(`Source workflow ${sourceId} not found`, sourceId);
        }
        const stored = storedResult.data;

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

        await this.saveWorkflow(duplicated.workflow);
    }

    // Search functionality
    async searchWorkflows(query: string): Promise<WorkflowListItem[]> {
        const allResult = await this.listWorkflows();
        if (!allResult.success) {
            return [];
        }
        const all = allResult.data;
        const lowerQuery = query.toLowerCase();

        return all.filter(workflow =>
            workflow.name.toLowerCase().includes(lowerQuery) ||
            workflow.description?.toLowerCase().includes(lowerQuery) ||
            workflow.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

}