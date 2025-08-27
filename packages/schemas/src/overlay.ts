import { z } from 'zod';
import { PointSchema, RectangleSchema } from './common.js';

// Overlay style schema with validation
export const OverlayStyleSchema = z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    fillColor: z.string().regex(/^(#[0-9A-Fa-f]{6}|rgba?\([^)]+\))$/).optional(),
    lineWidth: z.number().min(0).max(100).optional(),
    lineDash: z.array(z.number().min(0)).optional(),
    opacity: z.number().min(0).max(1).optional(),
    fontSize: z.number().min(8).max(72).optional(),
    fontFamily: z.string().optional()
});

// Overlay shape schema
export const OverlayShapeSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['rectangle', 'circle', 'crosshair', 'point']),
    bounds: RectangleSchema,
    style: OverlayStyleSchema.optional(),
    label: z.string().max(100).optional(),
    labelPosition: z.enum(['top', 'bottom', 'left', 'right', 'center']).optional()
});

// Overlay text schema
export const OverlayTextSchema = z.object({
    id: z.string().optional(),
    text: z.string().max(500),
    position: PointSchema,
    style: OverlayStyleSchema.optional(),
    backgroundColor: z.string().regex(/^(#[0-9A-Fa-f]{6}|rgba?\([^)]+\))$/).optional(),
    padding: z.number().min(0).max(50).optional(),
    borderRadius: z.number().min(0).max(50).optional()
});

// Overlay options schema with defaults
export const OverlayOptionsSchema = z.object({
    bounds: RectangleSchema.optional(),
    transparent: z.boolean().optional().default(true),
    alwaysOnTop: z.boolean().optional().default(true),
    timeout: z.number().min(0).max(300000).optional(), // Max 5 minutes
    clickThrough: z.boolean().default(false),
    showInstructions: z.boolean().default(false),
    instructionText: z.string().max(200).optional()
});

// IPC event schemas
export const OverlayMouseEventSchema = z.object({
    overlayId: z.string().uuid(),
    point: PointSchema
});

export const OverlayKeyEventSchema = z.object({
    overlayId: z.string().uuid(),
    key: z.string().max(50)
});

// Result schemas for overlay operations
export const CreateOverlayResultSchema = z.object({
    success: z.literal(true),
    data: z.object({
        id: z.string().uuid(),
        bounds: RectangleSchema
    })
}).or(z.object({
    success: z.literal(false),
    error: z.object({
        code: z.enum(['INVALID_OPTIONS', 'DISPLAY_ERROR', 'WINDOW_CREATION_FAILED']),
        message: z.string()
    })
}));