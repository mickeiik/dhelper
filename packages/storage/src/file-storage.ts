import { WorkflowStorageInterface } from './storage-interface.js';
import type { StoredWorkflow, WorkflowListItem, StorageStats } from './types.js';
import { writeFile, readFile, mkdir, unlink, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export class FileWorkflowStorage extends WorkflowStorageInterface {
    private storageDir: string;
    private initialized = false;

    constructor(customDir?: string) {
        super();
        this.storageDir = customDir || join(app.getPath('userData'), 'workflows');
    }

    private async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await mkdir(this.storageDir, { recursive: true });
            this.initialized = true;
            console.log('📁 File workflow storage initialized:', this.storageDir);
        } catch (error) {
            console.error('Failed to initialize file storage:', error);
            throw error;
        }
    }

    private getFilePath(workflowId: string): string {
        return join(this.storageDir, `${workflowId}.json`);
    }

    async save(workflowId: string, storedWorkflow: StoredWorkflow): Promise<void> {
        await this.initialize();

        try {
            const filePath = this.getFilePath(workflowId);
            const data = JSON.stringify(storedWorkflow, null, 2);
            await writeFile(filePath, data, 'utf-8');
            console.log(`💾 Workflow saved: ${workflowId}`);
        } catch (error) {
            console.error(`Failed to save workflow ${workflowId}:`, error);
            throw error;
        }
    }

    async load(workflowId: string): Promise<StoredWorkflow | null> {
        await this.initialize();

        try {
            const filePath = this.getFilePath(workflowId);

            if (!existsSync(filePath)) {
                return null;
            }

            const data = await readFile(filePath, 'utf-8');
            const stored: StoredWorkflow = JSON.parse(data);

            // Convert date strings back to Date objects
            stored.metadata.createdAt = new Date(stored.metadata.createdAt);
            stored.metadata.updatedAt = new Date(stored.metadata.updatedAt);
            if (stored.cache?.lastCacheUpdate) {
                stored.cache.lastCacheUpdate = new Date(stored.cache.lastCacheUpdate);
            }

            console.log(`📖 Workflow loaded: ${workflowId}`);
            return stored;
        } catch (error) {
            console.error(`Failed to load workflow ${workflowId}:`, error);
            return null;
        }
    }

    async delete(workflowId: string): Promise<boolean> {
        await this.initialize();

        try {
            const filePath = this.getFilePath(workflowId);

            if (!existsSync(filePath)) {
                return false;
            }

            await unlink(filePath);
            console.log(`🗑️ Workflow deleted: ${workflowId}`);
            return true;
        } catch (error) {
            console.error(`Failed to delete workflow ${workflowId}:`, error);
            return false;
        }
    }

    async list(): Promise<WorkflowListItem[]> {
        await this.initialize();

        try {
            if (!existsSync(this.storageDir)) {
                return [];
            }

            const files = await readdir(this.storageDir);
            const workflowFiles = files.filter(file => file.endsWith('.json'));

            const workflows: WorkflowListItem[] = [];

            for (const file of workflowFiles) {
                try {
                    const workflowId = file.replace('.json', '');
                    const stored = await this.load(workflowId);

                    if (stored) {
                        workflows.push({
                            id: stored.workflow.id,
                            name: stored.workflow.name,
                            description: stored.workflow.description || stored.metadata.description,
                            createdAt: stored.metadata.createdAt,
                            updatedAt: stored.metadata.updatedAt,
                            stepCount: stored.workflow.steps.length,
                            hasCachedData: !!(stored.cache?.data && Object.keys(stored.cache.data).length > 0),
                            tags: stored.metadata.tags
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load workflow info from ${file}:`, error);
                }
            }

            // Sort by updatedAt (newest first)
            workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            return workflows;
        } catch (error) {
            console.error('Failed to list workflows:', error);
            return [];
        }
    }

    async exists(workflowId: string): Promise<boolean> {
        await this.initialize();
        const filePath = this.getFilePath(workflowId);
        return existsSync(filePath);
    }

    async getStats(): Promise<StorageStats> {
        await this.initialize();

        const workflows = await this.list();
        let totalSize = 0;
        let cacheSize = 0;

        for (const workflow of workflows) {
            try {
                const filePath = this.getFilePath(workflow.id);
                const stats = await stat(filePath);
                totalSize += stats.size;

                // Estimate cache size
                const stored = await this.load(workflow.id);
                if (stored?.cache?.data) {
                    cacheSize += JSON.stringify(stored.cache.data).length;
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

    async clear(): Promise<void> {
        await this.initialize();

        try {
            const workflows = await this.list();

            for (const workflow of workflows) {
                await this.delete(workflow.id);
            }

            console.log(`🗑️ Cleared all workflows (${workflows.length} deleted)`);
        } catch (error) {
            console.error('Failed to clear all workflows:', error);
            throw error;
        }
    }
}