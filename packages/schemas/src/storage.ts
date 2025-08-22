import { z } from 'zod';
import { WorkflowSchema } from './workflow.js';

// Storage metadata schema
export const StorageMetadataSchema = z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
});

// Cached data schema
export const CachedDataSchema = z.object({
    value: z.unknown(),
    timestamp: z.number(),
    ttl: z.number().optional()
});

// Stored workflow schema
export const StoredWorkflowSchema = z.object({
    workflow: WorkflowSchema,
    metadata: StorageMetadataSchema,
    cache: CachedDataSchema.optional()
});

// Save options schema
export const SaveWorkflowOptionsSchema = z.object({
    includeCache: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional()
});

// Storage stats schema
export const StorageStatsSchema = z.object({
    totalWorkflows: z.number(),
    totalSize: z.number(),
    cacheSize: z.number(),
    oldestWorkflow: z.date().optional(),
    newestWorkflow: z.date().optional()
});