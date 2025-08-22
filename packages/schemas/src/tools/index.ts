import { z } from 'zod';
import { ScreenshotSchema } from './screenshot.js';
import { OCRSchema } from './ocr.js';
import { TemplateMatcherSchema } from './template-matcher.js';
import { ClickSchema } from './click.js';
import { HelloWorldSchema } from './hello-world.js';
import { ScreenRegionSelectorSchema } from './screen-region-selector.js';

// Tool metadata
export const ToolMetadataSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    version: z.string().optional(),
    author: z.string().optional()
});

// Tool registry
export const ToolRegistrySchema = z.object({
    'screenshot': ScreenshotSchema,
    'ocr': OCRSchema,
    'template-matcher': TemplateMatcherSchema,
    'click': ClickSchema,
    'hello-world': HelloWorldSchema,
    'screen-region-selector': ScreenRegionSelectorSchema
});

export type ToolId = keyof z.infer<typeof ToolRegistrySchema>;

// Dynamic tool schema getter
export function getToolSchema(toolId: string) {
    const schema = ToolRegistrySchema.shape[toolId as ToolId];
    if (!schema) {
        throw new Error(`Unknown tool: ${toolId}`);
    }
    return schema;
}