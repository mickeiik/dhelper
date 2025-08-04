import type { Workflow } from '@app/types';

export interface StoredWorkflow {
    workflow: Workflow;
    metadata: {
        createdAt: Date;
        updatedAt: Date;
        version: string;
        description?: string;
        tags?: string[];
    };
    // Cache structure for workflow step results
    cache?: Record<string, {
        value: any;
        timestamp: number;
        ttl?: number;
    }>;
}

export interface WorkflowListItem {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    stepCount: number;
    hasCachedData: boolean;
    tags?: string[];
}

export interface SaveWorkflowOptions {
    includeCache?: boolean;
    tags?: string[];
    description?: string;
}

export interface StorageStats {
    totalWorkflows: number;
    totalSize: number; // in bytes
    cacheSize: number;
    oldestWorkflow?: Date;
    newestWorkflow?: Date;
}