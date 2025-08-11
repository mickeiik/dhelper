interface CacheEntry {
    value: unknown;
    expiry?: number; // Simplified: direct expiry timestamp
}

export class WorkflowCacheManager {
    private cache = new Map<string, CacheEntry>();

    async get(workflowId: string, cacheKey: string): Promise<any | null> {
        const key = `${workflowId}:${cacheKey}`;
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        // Check if expired
        if (entry.expiry && Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.value;
    }

    async set(workflowId: string, cacheKey: string, value: unknown, options?: { ttl?: number }): Promise<void> {
        const key = `${workflowId}:${cacheKey}`;
        const entry: CacheEntry = {
            value,
            expiry: options?.ttl ? Date.now() + options.ttl : undefined
        };
        
        this.cache.set(key, entry);
    }

    async clearWorkflowCache(workflowId: string): Promise<void> {
        const prefix = `${workflowId}:`;
        for (const [key] of this.cache) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    async clearAllCache(): Promise<void> {
        this.cache.clear();
    }

    generateCacheKey(stepId: string, toolId: string, inputs: Record<string, unknown>, customKey?: string): string {
        if (customKey) return `${stepId}_${customKey}`;
        
        // Simple JSON stringify for key generation
        const inputKey = JSON.stringify(inputs);
        return `${stepId}_${toolId}_${inputKey.length}_${inputKey.slice(0, 20)}`;
    }

    getCacheStats(workflowId: string) {
        const prefix = `${workflowId}:`;
        const count = Array.from(this.cache.keys()).filter(key => key.startsWith(prefix)).length;
        return {
            entries: count,
            memoryEntries: count,
            lastAccessed: Date.now()
        };
    }
}