import { z } from 'zod';

// Storage list item schema - for listing workflows
export const StorageListItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    tags: z.array(z.string()).default([]),
});

// Export inferred types
export type StorageListItem = z.infer<typeof StorageListItemSchema>;