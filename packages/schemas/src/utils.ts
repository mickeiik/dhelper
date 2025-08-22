import { z } from 'zod';

// Helper for creating branded types
export const branded = <T, Brand extends string>(
    schema: z.ZodType<T>,
    brand: Brand
) => schema.brand<Brand>();

// Helper for creating nullable schemas
export const nullable = <T extends z.ZodTypeAny>(schema: T) =>
    z.union([schema, z.null()]);

// Helper for creating optional schemas with default
export const optionalWithDefault = <T extends z.ZodTypeAny>(
    schema: T,
    defaultValue: z.infer<T>
) => schema.optional().default(defaultValue);

// Custom error messages helper
export const withMessage = <T extends z.ZodTypeAny>(
    schema: T,
    message: string
) => schema.describe(message);

// Schema validation with detailed errors
export const validateSchema = <T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error.issues };
};