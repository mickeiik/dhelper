import z from 'zod';
import { ipcRenderer } from 'electron';
import { CreateTemplateInputSchema, TemplateSchema, UpdateTemplateInputSchema } from '@app/schemas/src/template.js';

type Template = z.infer<typeof TemplateSchema>;
type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;
type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;

// Template CRUD operations
export async function listTemplates(): Promise<Template[]> {
  return ipcRenderer.invoke('templates:list');
}

export async function getTemplate(templateId: string): Promise<Template | null> {
  return ipcRenderer.invoke('templates:get', templateId);
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
export async function searchTemplates(query: string): Promise<Template[]> {
  return ipcRenderer.invoke('templates:search', query);
}

export async function getTemplateCategories(): Promise<string[]> {
  return ipcRenderer.invoke('templates:get-categories');
}