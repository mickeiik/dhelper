import { z } from 'zod';

// Semantic reference schema
const SemanticReferenceSchema = z.object({
    $ref: z.string().regex(/^\\{\\{[^}]+\\}\\}$/, 'Invalid reference format')
});

// Merge operation schema
const MergeOperationSchema = z.object({
    $merge: z.array(z.lazy(() => WorkflowInputSchema))
});

// Recursive workflow input schema
export const WorkflowInputSchema: z.ZodType<any> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        SemanticReferenceSchema,
        MergeOperationSchema,
        z.array(WorkflowInputSchema),
        WorkflowInputSchema
    ])
);

// Cache configuration schema
export const CacheConfigSchema = z.object({
    enabled: z.boolean(),
    key: z.string().optional(),
    persistent: z.boolean().optional(),
    ttl: z.number().positive().optional()
});

// Workflow step schema
export const WorkflowStepSchema = z.object({
    id: z.string().min(1),
    toolId: z.string().min(1),
    inputs: WorkflowInputSchema,
    onError: z.enum(['stop', 'continue', 'retry']).optional(),
    retryCount: z.number().min(0).max(10).optional(),
    delay: z.number().min(0).optional(),
    cache: CacheConfigSchema.optional()
});

// Complete workflow schema
export const WorkflowSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    steps: z.array(WorkflowStepSchema).min(1),
    clearCache: z.boolean().optional()
});

// Workflow result schemas
export const StepResultSchema = z.object({
    stepId: z.string(),
    toolId: z.string(),
    success: z.boolean(),
    result: z.unknown().optional(),
    error: z.string().optional(),
    startTime: z.date(),
    endTime: z.date(),
    retryCount: z.number(),
    fromCache: z.boolean().optional(),
    cacheKey: z.string().optional()
});

export const WorkflowResultSchema = z.object({
    workflowId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    startTime: z.date(),
    endTime: z.date().optional(),
    stepResults: StepResultSchema,
    cacheStats: z.object({
        cacheHits: z.number(),
        cacheMisses: z.number(),
        stepsCached: z.array(z.string())
    }).optional()
});