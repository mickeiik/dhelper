// packages/main/src/modules/TemplateModule.ts
import { ipcMain } from 'electron';
import { TemplateManager } from '@app/templates';
import type { CreateTemplateInput, UpdateTemplateInput } from '@app/types';
import { getToolManager } from './ToolModule.js';

const templateManager = new TemplateManager(undefined, getToolManager());

export function initializeTemplates() {

    // Template CRUD operations
    ipcMain.handle('templates:list', async () => {
      return await templateManager.listTemplates();
    });

    ipcMain.handle('templates:get', async (_, templateId: string) => {
      const template = await templateManager.getTemplate(templateId);
      if (!template) return null;
      
      // Convert Buffer to Uint8Array for browser compatibility
      return {
        ...template,
        imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
        thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
      };
    });

    ipcMain.handle('templates:create', async (_, input: CreateTemplateInput) => {
      // Convert Uint8Array from renderer to Buffer for Node.js
      const nodeInput = {
        ...input,
        imageData: Buffer.from(input.imageData)
      };
      const template = await templateManager.createTemplate(nodeInput);
      
      // Convert Buffer back to Uint8Array for browser compatibility
      return {
        ...template,
        imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
        thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
      };
    });

    ipcMain.handle('templates:update', async (_, input: UpdateTemplateInput) => {
      const template = await templateManager.updateTemplate(input);
      if (!template) return null;
      
      // Convert Buffer back to Uint8Array for browser compatibility
      return {
        ...template,
        imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
        thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
      };
    });

    ipcMain.handle('templates:delete', async (_, templateId: string) => {
      return await templateManager.deleteTemplate(templateId);
    });

    // Template discovery and search
    ipcMain.handle('templates:search', async (_, query: string) => {
      return await templateManager.searchTemplates(query);
    });

    ipcMain.handle('templates:get-by-category', async (_, category: string) => {
      return await templateManager.getTemplatesByCategory(category);
    });

    ipcMain.handle('templates:get-by-tags', async (_, tags: string[]) => {
      return await templateManager.getTemplatesByTags(tags);
    });

    ipcMain.handle('templates:get-categories', async () => {
      return await templateManager.getCategories();
    });

    ipcMain.handle('templates:get-all-tags', async () => {
      return await templateManager.getAllTags();
    });

    // Template matching and usage
    ipcMain.handle('templates:match', async (_, screenImage: Buffer, options: any) => {
      return await templateManager.matchTemplates(screenImage, options);
    });

    ipcMain.handle('templates:record-usage', async (_, templateId: string, success: boolean) => {
      return await templateManager.recordTemplateUsage(templateId, success);
    });

    // Template reference resolution
    ipcMain.handle('templates:resolve-reference', async (_, reference: string) => {
      return await templateManager.resolveTemplateReference(reference);
    });

    // Template statistics and management
    ipcMain.handle('templates:get-stats', async () => {
      return await templateManager.getStats();
    });

    // Template import/export
    ipcMain.handle('templates:export', async (_, templateId: string) => {
      return await templateManager.exportTemplate(templateId);
    });

    ipcMain.handle('templates:import', async (_, data: string) => {
      return await templateManager.importTemplate(data);
    });
}

export const getTemplateManager = () => templateManager;