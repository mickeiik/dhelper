import { z } from 'zod';
import { RectangleSchema } from '../common.js';

export const ScreenshotInputSchema = RectangleSchema.extend({
    display: z.number().optional(),
    format: z.enum(['png', 'jpg', 'webp']).default('png'),
    quality: z.number().min(0).max(100).optional()
});

export const ScreenshotOutputSchema = z.object({
    path: z.string(),
    width: z.number(),
    height: z.number(),
    format: z.string(),
    size: z.number()
});

export const ScreenshotSchema = {
    input: ScreenshotInputSchema,
    output: ScreenshotOutputSchema
};