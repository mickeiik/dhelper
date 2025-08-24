import { z } from 'zod';
import { RectangleSchema } from './common.js';

// Template metadata schema
export const TemplateMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(50),
  tags: z.array(z.string().max(50)),
  createdAt: z.date(),
  updatedAt: z.date(),
  
  // Visual properties
  width: z.number().positive(),
  height: z.number().positive(),
  
  // Matching properties
  matchThreshold: z.number().min(0).max(1),
  
  // Resolution and scaling
  sourceResolution: z.string().regex(/^\d+x\d+$/),
  scaleCache: z.record(z.string(), z.number().positive()),
  
  // Usage statistics
  usageCount: z.number().min(0).default(0),
  lastUsed: z.date().optional(),
  successRate: z.number().min(0).max(1).optional(),
  
  // File references
  imagePath: z.string().min(1),
  thumbnailPath: z.string().optional()
});

// Template schema (extends metadata with runtime properties)
export const TemplateSchema = TemplateMetadataSchema.extend({
  imageData: z.instanceof(Uint8Array).optional(),
  thumbnailData: z.instanceof(Uint8Array).optional()
});

// Template match result schema
export const TemplateMatchResultSchema = z.object({
  templateId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  location: RectangleSchema,
  template: TemplateSchema.extend({
    detectedScale: z.number().positive().optional()
  })
});

// Template creation input schema
export const CreateTemplateInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(50),
  tags: z.array(z.string().max(50)).default([]),
  imageData: z.instanceof(Uint8Array),
  matchThreshold: z.number().min(0).max(1).default(0.8),
  sourceResolution: z.string().regex(/^\d+x\d+$/)
});

// Template update input schema
export const UpdateTemplateInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string().max(50)).optional(),
  matchThreshold: z.number().min(0).max(1).optional()
});

// Template match options schema
export const TemplateMatchOptionsSchema = z.object({
  templateIds: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  maxResults: z.number().positive().optional(),
  searchRegion: RectangleSchema.optional()
});