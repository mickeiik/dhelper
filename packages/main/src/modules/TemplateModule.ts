// packages/main/src/modules/TemplateModule.ts
import { ipcMain } from 'electron';
import { TemplateManager } from '@app/templates';
import type { CreateTemplateInput, UpdateTemplateInput } from '@app/types';
import { TemplateError, ErrorLogger } from '@app/types';
import { getToolManager } from './ToolModule.js';

const logger = new ErrorLogger('TemplateModule');

const templateManager = new TemplateManager(undefined, getToolManager());

export function initializeTemplates() {

    // Template CRUD operations
    ipcMain.handle('templates:list', async () => {
      try {
        return await templateManager.listTemplates();
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to list templates', undefined, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
    });

    ipcMain.handle('templates:get', async (_, templateId: string) => {
      try {
        const template = await templateManager.getTemplate(templateId);
        if (!template) return null;
        
        // Convert Buffer to Uint8Array for browser compatibility
        return {
          ...template,
          imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
          thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
        };
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to get template', templateId, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
    });

    ipcMain.handle('templates:get-by-name', async (_, templateName: string) => {
      const template = await templateManager.getTemplateByName(templateName);
      if (!template) return null;
      
      // Convert Buffer to Uint8Array for browser compatibility
      return {
        ...template,
        imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
        thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
      };
    });

    ipcMain.handle('templates:create', async (_, input: CreateTemplateInput) => {
      try {
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
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to create template', undefined, { originalError: error, input: input.name });
        logger.logError(templateError);
        throw templateError;
      }
    });

    ipcMain.handle('templates:update', async (_, input: UpdateTemplateInput) => {
      try {
        const template = await templateManager.updateTemplate(input);
        if (!template) return null;
        
        // Convert Buffer back to Uint8Array for browser compatibility
        return {
          ...template,
          imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
          thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
        };
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to update template', input.id, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
    });

    ipcMain.handle('templates:delete', async (_, templateId: string) => {
      try {
        return await templateManager.deleteTemplate(templateId);
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to delete template', templateId, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
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
    ipcMain.handle('templates:match', async (_, screenImage: Buffer, options: import('@app/types').TemplateMatchOptions) => {
      try {
        return await templateManager.matchTemplates(screenImage, options);
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to match templates', undefined, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
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
      try {
        return await templateManager.exportTemplate(templateId);
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to export template', templateId, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
    });

    ipcMain.handle('templates:import', async (_, data: string) => {
      try {
        return await templateManager.importTemplate(data);
      } catch (error) {
        const templateError = error instanceof TemplateError ? error : new TemplateError('Failed to import template', undefined, { originalError: error });
        logger.logError(templateError);
        throw templateError;
      }
    });
}

export const getTemplateManager = () => templateManager;