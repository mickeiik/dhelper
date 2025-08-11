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
  
  // Matching properties
  matchThreshold: number; // Default confidence threshold (0-1)
  
  // Resolution and scaling
  sourceResolution: string; // Resolution when template was created (e.g., "1920x1080")
  scaleCache: Record<string, number>; // Cached scales for different resolutions (e.g., {"2560x1440": 1.33})
  
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
  template: Template & {
    detectedScale?: number; // Runtime property added during matching
  };
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
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  matchThreshold?: number;
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