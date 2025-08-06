// packages/types/src/template.ts
export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // Visual properties
  width: number;
  height: number;
  colorProfile?: 'light' | 'dark' | 'auto';
  
  // Matching properties
  matchThreshold: number; // Default confidence threshold (0-1)
  scaleTolerance?: number; // Allow scale variations (0-1)
  rotationTolerance?: number; // Allow rotation in degrees
  
  // Usage statistics
  usageCount: number;
  lastUsed?: Date;
  successRate?: number; // Match success rate (0-1)
  
  // File references
  imagePath: string; // Relative path to template image
  thumbnailPath?: string; // Optional thumbnail for quick preview
}

export interface Template extends TemplateMetadata {
  // Runtime properties
  imageData?: Uint8Array; // Loaded image data (browser-compatible)
  thumbnailData?: Uint8Array; // Loaded thumbnail data (browser-compatible)
}

export interface TemplateMatchResult {
  templateId: string;
  confidence: number;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  template: Template;
}

export interface TemplateMatchOptions {
  templateIds?: string[]; // Specific templates to match against
  categories?: string[]; // Match only templates in these categories
  tags?: string[]; // Match only templates with these tags
  minConfidence?: number; // Minimum confidence threshold
  maxResults?: number; // Maximum number of results to return
  searchRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  imageData: Uint8Array; // PNG/JPEG image data (browser-compatible)
  matchThreshold?: number;
  scaleTolerance?: number;
  rotationTolerance?: number;
  colorProfile?: 'light' | 'dark' | 'auto';
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  matchThreshold?: number;
  scaleTolerance?: number;
  rotationTolerance?: number;
  colorProfile?: 'light' | 'dark' | 'auto';
}

// Template categories
export const TEMPLATE_CATEGORIES = {
  UI_ELEMENTS: 'UI Elements',
  TEXT_PATTERNS: 'Text Patterns', 
  BUTTONS: 'Buttons',
  ICONS: 'Icons',
  DIALOGS: 'Dialogs',
  MENUS: 'Menus',
  FORMS: 'Forms',
  CUSTOM: 'Custom'
} as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[keyof typeof TEMPLATE_CATEGORIES];

// Template storage stats (needed by renderer)
export interface TemplateStorageStats {
  totalTemplates: number;
  totalSize: number;
  imageSize: number;
  oldestTemplate?: Date;
  newestTemplate?: Date;
  categoryCounts: Record<string, number>;
}