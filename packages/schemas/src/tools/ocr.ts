import { z } from 'zod';

export const OCRInputSchema = z.object({
    image: z.union([
        z.string(), // File path
        z.instanceof(Buffer), // Image buffer
        z.object({ $ref: z.string() }) // Reference to previous step
    ]),
    language: z.enum(['eng', 'fra', 'deu', 'spa', 'chi_sim']).default('eng'),
    mode: z.enum(['text', 'blocks', 'lines', 'words']).default('text')
});

export const OCROutputSchema = z.object({
    text: z.string(),
    confidence: z.number().min(0).max(100),
    blocks: z.array(z.object({
        text: z.string(),
        bbox: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number()
        }),
        confidence: z.number()
    })).optional()
});

export const OCRSchema = {
    input: OCRInputSchema,
    output: OCROutputSchema
};