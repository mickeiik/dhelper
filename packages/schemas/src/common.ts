import { z } from 'zod';

// Geometric types
export const PointSchema = z.object({
    x: z.number(),
    y: z.number()
});

export const RectangleSchema = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive()
});