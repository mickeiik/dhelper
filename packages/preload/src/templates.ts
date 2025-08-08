// packages/preload/src/templates.ts
import { ipcRenderer } from 'electron';
import type { 
  TemplateMetadata, 
  Template, 
  CreateTemplateInput, 
  UpdateTemplateInput,
  TemplateMatchOptions,
  TemplateMatchResult,
  TemplateStorageStats 
} from '@app/types';

// Template CRUD operations
export async function listTemplates(): Promise<TemplateMetadata[]> {
  return ipcRenderer.invoke('templates:list');
}

export async function getTemplate(templateId: string): Promise<Template | null> {
  return ipcRenderer.invoke('templates:get', templateId);
}

export async function getTemplateByName(templateName: string): Promise<Template | null> {
  return ipcRenderer.invoke('templates:get-by-name', templateName);
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  return ipcRenderer.invoke('templates:create', input);
}

export async function updateTemplate(input: UpdateTemplateInput): Promise<Template | null> {
  return ipcRenderer.invoke('templates:update', input);
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  return ipcRenderer.invoke('templates:delete', templateId);
}

// Template discovery and search
export async function searchTemplates(query: string): Promise<TemplateMetadata[]> {
  return ipcRenderer.invoke('templates:search', query);
}

export async function getTemplatesByCategory(category: string): Promise<TemplateMetadata[]> {
  return ipcRenderer.invoke('templates:get-by-category', category);
}

export async function getTemplatesByTags(tags: string[]): Promise<TemplateMetadata[]> {
  return ipcRenderer.invoke('templates:get-by-tags', tags);
}

export async function getTemplateCategories(): Promise<string[]> {
  return ipcRenderer.invoke('templates:get-categories');
}

export async function getAllTemplateTags(): Promise<string[]> {
  return ipcRenderer.invoke('templates:get-all-tags');
}

// Template matching and usage
export async function matchTemplates(
  screenImage: Buffer | string, 
  options?: TemplateMatchOptions
): Promise<TemplateMatchResult[]> {
  return ipcRenderer.invoke('templates:match', screenImage, options);
}

export async function recordTemplateUsage(templateId: string, success: boolean = true): Promise<void> {
  return ipcRenderer.invoke('templates:record-usage', templateId, success);
}

// Template reference resolution
export async function resolveTemplateReference(reference: string): Promise<Template | null> {
  return ipcRenderer.invoke('templates:resolve-reference', reference);
}

// Template statistics and management
export async function getTemplateStats(): Promise<TemplateStorageStats> {
  return ipcRenderer.invoke('templates:get-stats');
}

// Template import/export
export async function exportTemplate(templateId: string): Promise<string | null> {
  return ipcRenderer.invoke('templates:export', templateId);
}

export async function importTemplate(data: string): Promise<Template> {
  return ipcRenderer.invoke('templates:import', data);
}

// Helper functions for UI
export async function createTemplateFromScreenshot(
  name: string,
  description: string,
  category: string,
  tags: string[],
  screenshotDataUrl: string,
  options?: {
    matchThreshold?: number;
    scaleTolerance?: number;
    rotationTolerance?: number;
    colorProfile?: 'light' | 'dark' | 'auto';
  }
): Promise<Template> {
  const imageData = Buffer.from(screenshotDataUrl.split(',')[1], 'base64');
  
  const input: CreateTemplateInput = {
    name,
    description,
    category,
    tags,
    imageData,
    matchThreshold: options?.matchThreshold,
    scaleTolerance: options?.scaleTolerance,
    rotationTolerance: options?.rotationTolerance,
    colorProfile: options?.colorProfile
  };

  return createTemplate(input);
}