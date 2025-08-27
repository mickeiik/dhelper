import { z } from 'zod';
import { PointSchema, RectangleSchema } from './common.js';

// Base tool field schemas
export const ToolInputFieldSchema = z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'select', 'object', 'array']),
    description: z.string(),
    required: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
    options: z.array(z.object({
        value: z.unknown(),
        label: z.string()
    })).optional(),
    example: z.unknown().optional(),
    placeholder: z.string().optional()
});

export const ToolOutputFieldSchema = z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    description: z.string(),
    example: z.unknown().optional()
});

// Tool metadata schema
export const ToolMetadataSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    category: z.string().optional(),
    inputSchema: z.instanceof(z.ZodType),
    outputSchema: z.instanceof(z.ZodType),
    resultSchema: z.instanceof(z.ZodType),
    inputFields: z.array(ToolInputFieldSchema).optional(),
    outputFields: z.array(ToolOutputFieldSchema).optional(),
    examples: z.array(z.object({
        name: z.string(),
        description: z.string(),
        inputs: z.unknown()
    })).optional()
});

export const ToolConfigSchema = z.object({
    showVisualIndicator: z.boolean().optional().default(false),
    indicatorTimeout: z.number().min(0).optional().default(1000)
})

// Individual tool input schemas
export const HelloWorldInputSchema = z.object({
    message: z.string().optional().default('Hello World!'),
    data: z.unknown().optional()
});

export const HelloWorldOutputSchema = z.object({
    message: z.string(),
    data: z.unknown(),
    timestamp: z.number()
});

export const ScreenshotInputSchema = z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive(),
    display: z.number().optional()
});

export const ScreenshotOutputSchema = z.object({
    image: z.string().startsWith('data:image/'), // Base64 data URL
    metadata: z.object({
        width: z.number().positive(),
        height: z.number().positive(),
        region: RectangleSchema,
        timestamp: z.number()
    }).optional()
});

export const ScreenRegionSelectorInputSchema = z.object({
    mode: z.enum(['point', 'rectangle', 'region']).default('rectangle'),
    timeout: z.number().min(1000).max(300000).optional().default(30000) // 1s to 5min, default 30s
});

// Conditional output schema based on input mode
export const ScreenRegionSelectorOutputSchema = <T extends z.infer<typeof ScreenRegionSelectorInputSchema>>(
    input: T
) => {
    const normalizedMode = input.mode === 'region' ? 'rectangle' : input.mode;
    return normalizedMode === 'point' ? PointSchema : RectangleSchema;
};

// Union type for general use when mode is unknown
export const ScreenRegionSelectorOutputUnionSchema = z.union([PointSchema, RectangleSchema]);

export const OcrInputSchema = z.union([
    z.string(), // Base64
    z.instanceof(Buffer)
]);

export const OcrOutputSchema = z.object({
    text: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    metadata: z.object({
        processingTime: z.number(),
        timestamp: z.number()
    }).optional()
});


export const TemplateMatcherInputSchema = z.object({
    image: z.union([
        z.string().startsWith('data:image/'),
        z.instanceof(Buffer)
    ]),
    threshold: z.number().min(0).max(1).optional().default(0.8),
    showVisualIndicators: z.boolean().optional().default(false),
    overlayTimeout: z.number().min(100).max(30000).optional().default(5000)
});

export const TemplateMatcherOutputSchema = z.object({
    confidence: z.number().min(0).max(1),
    location: RectangleSchema,
});

export const ClickInputSchemaBase = z.union([
    PointSchema,
    RectangleSchema,
]);

export const ClickInputOptions = z.object({
    button: z.enum(['left', 'right', 'middle']).optional().default('left'),
    clicks: z.number().min(1).max(10).optional().default(1),
    delay: z.number().min(10).optional().default(100),
});

export const ClickInputSchemaWithOptions = z.intersection(ClickInputSchemaBase, ClickInputOptions);

export const ClickInputSchema = z.intersection(ClickInputSchemaWithOptions, ToolConfigSchema)


export const ClickOutputSchema = PointSchema;

// Tool registry schema
export const ToolRegistrySchema = z.record(
    z.string(),
    z.object({
        input: z.any(),
        output: z.any()
    })
);