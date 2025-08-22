import { z } from 'zod';

export const ErrorCodeSchema = z.enum([
    'TOOL_EXECUTION_ERROR',
    'WORKFLOW_ERROR',
    'STORAGE_ERROR',
    'TEMPLATE_ERROR',
    'VALIDATION_ERROR',
    'UNKNOWN_ERROR'
]);

export const DHelperErrorSchema = z.object({
    message: z.string(),
    code: ErrorCodeSchema,
    details: z.unknown().optional()
});

export const ResultSchema = <T extends z.ZodType, E extends z.ZodType = typeof DHelperErrorSchema>(
    dataSchema: T,
    errorSchema?: E
) => z.discriminatedUnion('success', [
    z.object({ success: z.literal(true), data: dataSchema }),
    z.object({ success: z.literal(false), error: errorSchema || DHelperErrorSchema })
]);

// Helper type for tool results
export type ToolResult<T extends z.ZodType> = z.infer<ReturnType<typeof ResultSchema<T>>>;