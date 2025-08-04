import type { WorkflowStorage } from '@app/storage';

interface CacheEntry {
    value: any;
    timestamp: number;
    ttl?: number;
}

interface WorkflowCacheStats {
    entries: number;
    memoryEntries: number;
    lastAccessed?: number;
}

export class WorkflowCacheManager {
    private memoryCache = new Map<string, Map<string, CacheEntry>>();

    constructor(private storage: WorkflowStorage) {}

    async get(workflowId: string, cacheKey: string): Promise<any | null> {
        // Try memory first
        const workflowCache = this.memoryCache.get(workflowId);
        if (workflowCache?.has(cacheKey)) {
            const entry = workflowCache.get(cacheKey)!;
            if (this.isValidEntry(entry)) {
                return entry.value;
            } else {
                // Remove expired entry
                workflowCache.delete(cacheKey);
            }
        }

        // Try storage
        const stored = await this.storage.loadStoredWorkflow(workflowId);
        const cacheEntry = stored?.cache?.[cacheKey];

        if (cacheEntry && this.isValidEntry(cacheEntry)) {
            // Load back into memory
            this.setMemory(workflowId, cacheKey, cacheEntry);
            return cacheEntry.value;
        }

        return null;
    }

    async set(workflowId: string, cacheKey: string, value: any, options?: { ttl?: number }): Promise<void> {
        const entry: CacheEntry = {
            value,
            timestamp: Date.now(),
            ttl: options?.ttl
        };

        // Store in memory
        this.setMemory(workflowId, cacheKey, entry);

        // Store in persistent storage
        const stored = await this.storage.loadStoredWorkflow(workflowId);
        if (stored) {
            if (!stored.cache) stored.cache = {};

            stored.cache[cacheKey] = entry;

            await this.storage.saveWorkflow(stored.workflow, { includeCache: true });
        }
    }

    async clearWorkflowCache(workflowId: string): Promise<void> {
        this.memoryCache.delete(workflowId);
        await this.storage.clearWorkflowCache(workflowId);
    }

    async clearAllCache(): Promise<void> {
        this.memoryCache.clear();
        
        // Clear cache for all workflows
        const workflows = await this.storage.listWorkflows();
        for (const workflow of workflows) {
            await this.storage.clearWorkflowCache(workflow.id);
        }
        
        // Cleared all workflow caches
    }

    private setMemory(workflowId: string, cacheKey: string, entry: CacheEntry): void {
        if (!this.memoryCache.has(workflowId)) {
            this.memoryCache.set(workflowId, new Map());
        }
        this.memoryCache.get(workflowId)!.set(cacheKey, entry);
    }

    private isValidEntry(entry: CacheEntry): boolean {
        if (!entry.ttl) return true;
        return (Date.now() - entry.timestamp) < entry.ttl;
    }

    generateCacheKey(stepId: string, toolId: string, inputs: any, customKey?: string): string {
        if (customKey) return `${stepId}_${customKey}`;

        const inputHash = JSON.stringify(inputs, Object.keys(inputs).sort())
            .split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0).toString(36);
        return `${stepId}_${toolId}_${inputHash}`;
    }

    getCacheStats(workflowId: string): WorkflowCacheStats {
        const workflowCache = this.memoryCache.get(workflowId);
        return {
            entries: workflowCache?.size || 0,
            memoryEntries: workflowCache?.size || 0,
            lastAccessed: Date.now() // Simplified - could track actual access times
        };
    }
}