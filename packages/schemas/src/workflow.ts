import { z } from 'zod';
import type { ToolId } from '@app/tools';
import { ResultSchema } from './errors.js';

// Reference schema for workflow inputs
const ReferenceSchema = z.object({
    $ref: z.string()
});

// Workflow input schema that allows references to replace any value recursively
export const WorkflowStepInputSchema: z.ZodType<any> = z.lazy(() =>
    z.union([
        // Primitives
        z.string(),
        z.number(),
        z.boolean(),
        // References can replace any value at any level
        ReferenceSchema,
        // Arrays where each element can be a reference or nested structure
        z.array(WorkflowStepInputSchema),
        // Objects where each property can be a reference or nested structure
        z.record(z.string(), WorkflowStepInputSchema)
    ])
);

// Step execution metadata
const StepExecutionMetadata = z.object({
    stepId: z.string(),
    toolId: z.custom<ToolId>((val) => typeof val === 'string' && val.length > 0),
    startTime: z.date(),
    endTime: z.date(),
    retryCount: z.number().default(0),
});

// Step result using the same pattern as tools
export const StepResultSchema = StepExecutionMetadata.and(
    ResultSchema(z.unknown())
);

// Generic workflow step schema (accepts any valid tool)
export const WorkflowStepSchema = z.object({
    id: z.string().min(1),
    toolId: z.custom<ToolId>((val) => typeof val === 'string' && val.length > 0),
    inputs: WorkflowStepInputSchema,
    onError: z.enum(['stop', 'continue']).default('stop'),
    delay: z.number().min(0).optional(),
    lastSuccessResult: StepResultSchema.optional(),
    replayLastSuccess: z.boolean().default(false).optional()
});

// Generic workflow step (inferred from schema)
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Complete workflow schema
export const WorkflowSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    steps: z.array(WorkflowStepSchema).min(1)
});


// Workflow execution metadata
const WorkflowExecutionMetadata = z.object({
    workflowId: z.string(),
    startTime: z.date(),
    endTime: z.date(),
    stepResults: z.record(z.string(), StepResultSchema),
});

// Workflow execution data
export const WorkflowExecutionData = WorkflowExecutionMetadata;

// Workflow result using the same pattern as tools
export const WorkflowResultSchema = ResultSchema(WorkflowExecutionData);
