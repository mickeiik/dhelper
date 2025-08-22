import { z } from 'zod';

// Geometric types
export const PointSchema = z.object({
    x: z.number(),
    y: z.number()
});

export const RectangleSchema = z.object({
    top: z.number().min(0),
    left: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive()
});

// Reference schemas
export const ReferenceSchema = z.object({
    $ref: z.string()
});

export const MergeSchema = z.object({
    $merge: z.array(z.unknown())
});

// Semantic reference validation
export const SemanticReferenceSchema = z.union([
    z.object({ $ref: z.string().regex(/^{{previous:[\w-]+}}$/) }),
    z.object({ $ref: z.string().regex(/^{{step-\d+:[\w-]+}}$/) }),
    z.object({ $ref: z.string().regex(/^[\w-]+$/) })
]);

// File path validation
export const FilePathSchema = z.string().refine(
    (path) => !path.includes('..'),
    { message: 'Path traversal not allowed' }
);

// UUID validation
export const UUIDSchema = z.uuid();

// Timestamp
export const TimestampSchema = z.number().int().positive();