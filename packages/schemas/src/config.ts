import { z } from 'zod';

// Storage configuration
export const StorageConfigSchema = z.object({
    workflowsPath: z.string(),
    templatesPath: z.string(),
    cachePath: z.string().optional()
});

// Tools configuration
export const ToolsConfigSchema = z.object({
    discoveryPaths: z.array(z.string()).optional(),
    timeout: z.number().positive().default(30000),
    autoRegister: z.boolean().default(true),
    retryCount: z.number().min(0).default(3),
    retryDelay: z.number().min(0).default(1000)
});

// UI configuration
export const UIConfigSchema = z.object({
    showInstructions: z.boolean().default(true),
    overlayTimeout: z.number().positive().default(5000),
    animations: z.boolean().default(true),
    developerMode: z.boolean().default(false)
});

// Complete app configuration
export const AppConfigSchema = z.object({
    storage: StorageConfigSchema,
    tools: ToolsConfigSchema,
    ui: UIConfigSchema,
    overlay: z.object({
        transparent: z.boolean().default(true),
        alwaysOnTop: z.boolean().default(true),
        clickThrough: z.boolean().default(false)
    }).optional(),
    templates: z.object({
        defaultThreshold: z.number().min(0).max(1).default(0.85),
        cacheEnabled: z.boolean().default(true),
        thumbnailSize: z.number().positive().default(200)
    }).optional(),
    workflows: z.object({
        maxRetries: z.number().min(0).default(5),
        defaultTimeout: z.number().positive().default(45000),
        cacheEnabled: z.boolean().default(true)
    }).optional()
});

// Environment variable schema
export const EnvConfigSchema = z.object({
    DHELPER_WORKFLOWS_PATH: z.string().optional(),
    DHELPER_TEMPLATES_PATH: z.string().optional(),
    DHELPER_TOOL_TIMEOUT: z.string().transform(Number).optional(),
    DHELPER_TOOL_DISCOVERY_PATHS: z.string().optional(),
    DHELPER_SHOW_INSTRUCTIONS: z.enum(['true', 'false']).optional(),
    DHELPER_OVERLAY_TIMEOUT: z.string().transform(Number).optional(),
    DHELPER_TEMPLATE_THRESHOLD: z.string().transform(Number).optional()
});