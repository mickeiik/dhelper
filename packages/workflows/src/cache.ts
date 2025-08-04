// packages/workflows/src/cache.ts
import { createHash } from 'node:crypto';
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

interface CacheEntry {
    value: any;
    timestamp: number;
    ttl?: number;
    key: string;
}

interface WorkflowCache {
    workflowId: string;
    entries: Map<string, CacheEntry>;
    lastAccessed: number;
}

export class WorkflowCacheManager {
    private caches = new Map<string, WorkflowCache>();
    private cacheDir: string;
    private initialized = false;

    constructor() {
        this.cacheDir = join(app.getPath('userData'), 'workflow-cache');
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await mkdir(this.cacheDir, { recursive: true });
            this.initialized = true;
            console.log('🗄️ Cache manager initialized');
        } catch (error) {
            console.error('Failed to initialize cache manager:', error);
        }
    }

    generateCacheKey(stepId: string, toolId: string, inputs: any, customKey?: string): string {
        if (customKey) {
            return `${stepId}_${customKey}`;
        }

        // Create deterministic hash of inputs
        const inputHash = this.hashObject(inputs);
        return `${stepId}_${toolId}_${inputHash}`;
    }

    private hashObject(obj: any): string {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return createHash('sha256').update(str).digest('hex').substring(0, 16);
    }

    async get(workflowId: string, cacheKey: string): Promise<any | null> {
        await this.initialize();

        // Try memory first
        const workflowCache = this.caches.get(workflowId);
        if (workflowCache) {
            const entry = workflowCache.entries.get(cacheKey);
            if (entry && this.isValidEntry(entry)) {
                console.log(`📦 Cache hit (memory): ${cacheKey}`);
                return entry.value;
            }
        }

        // Try disk cache
        const diskEntry = await this.loadFromDisk(workflowId, cacheKey);
        if (diskEntry && this.isValidEntry(diskEntry)) {
            // Load back into memory
            this.setInMemory(workflowId, cacheKey, diskEntry);
            console.log(`📦 Cache hit (disk): ${cacheKey}`);
            return diskEntry.value;
        }

        console.log(`📦 Cache miss: ${cacheKey}`);
        return null;
    }

    async set(workflowId: string, cacheKey: string, value: any, options?: { ttl?: number; persistent?: boolean }): Promise<void> {
        await this.initialize();

        const entry: CacheEntry = {
            value,
            timestamp: Date.now(),
            ttl: options?.ttl,
            key: cacheKey
        };

        // Store in memory
        this.setInMemory(workflowId, cacheKey, entry);

        // Store on disk if persistent
        if (options?.persistent !== false) {
            await this.saveToDisk(workflowId, cacheKey, entry);
        }

        console.log(`💾 Cached: ${cacheKey} (persistent: ${options?.persistent !== false})`);
    }

    async clearWorkflowCache(workflowId: string): Promise<void> {
        await this.initialize();

        // Clear memory
        this.caches.delete(workflowId);

        // Clear disk
        try {
            const workflowCacheDir = join(this.cacheDir, workflowId);
            if (existsSync(workflowCacheDir)) {
                await rm(workflowCacheDir, { recursive: true });
            }
            console.log(`🗑️ Cleared cache for workflow: ${workflowId}`);
        } catch (error) {
            console.warn(`Failed to clear disk cache for ${workflowId}:`, error);
        }
    }

    async clearAllCache(): Promise<void> {
        await this.initialize();

        // Clear memory
        this.caches.clear();

        // Clear disk
        try {
            if (existsSync(this.cacheDir)) {
                await rm(this.cacheDir, { recursive: true });
                await mkdir(this.cacheDir, { recursive: true });
            }
            console.log('🗑️ Cleared all workflow caches');
        } catch (error) {
            console.warn('Failed to clear all disk caches:', error);
        }
    }

    private setInMemory(workflowId: string, cacheKey: string, entry: CacheEntry): void {
        if (!this.caches.has(workflowId)) {
            this.caches.set(workflowId, {
                workflowId,
                entries: new Map(),
                lastAccessed: Date.now()
            });
        }

        const workflowCache = this.caches.get(workflowId)!;
        workflowCache.entries.set(cacheKey, entry);
        workflowCache.lastAccessed = Date.now();
    }

    private async loadFromDisk(workflowId: string, cacheKey: string): Promise<CacheEntry | null> {
        try {
            const filePath = join(this.cacheDir, workflowId, `${cacheKey}.json`);
            if (!existsSync(filePath)) {
                return null;
            }

            const data = await readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.warn(`Failed to load cache entry ${cacheKey}:`, error);
            return null;
        }
    }

    private async saveToDisk(workflowId: string, cacheKey: string, entry: CacheEntry): Promise<void> {
        try {
            const workflowCacheDir = join(this.cacheDir, workflowId);
            await mkdir(workflowCacheDir, { recursive: true });

            const filePath = join(workflowCacheDir, `${cacheKey}.json`);
            await writeFile(filePath, JSON.stringify(entry, null, 2));
        } catch (error) {
            console.warn(`Failed to save cache entry ${cacheKey}:`, error);
        }
    }

    private isValidEntry(entry: CacheEntry): boolean {
        if (!entry.ttl) return true;

        const now = Date.now();
        const age = now - entry.timestamp;
        return age < entry.ttl;
    }

    // Get cache statistics
    getCacheStats(workflowId: string): { entries: number; memoryEntries: number; lastAccessed?: number } {
        const workflowCache = this.caches.get(workflowId);
        return {
            entries: workflowCache?.entries.size || 0,
            memoryEntries: workflowCache?.entries.size || 0,
            lastAccessed: workflowCache?.lastAccessed
        };
    }
}