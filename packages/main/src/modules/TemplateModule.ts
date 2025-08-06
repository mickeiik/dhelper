// packages/main/src/modules/TemplateModule.ts
import { ipcMain } from 'electron';
import type { AppModule } from '../AppModule.js';
import type { ModuleContext } from '../ModuleContext.js';
import { TemplateManager, type CreateTemplateInput, type UpdateTemplateInput } from '@app/templates';
import { getToolManager } from './ToolModule.js';

let sharedTemplateManager: TemplateManager;

export class TemplateModule implements AppModule {
  private templateManager: TemplateManager;

  constructor() {
    // Create templateManager with shared toolManager instance
    this.templateManager = new TemplateManager(undefined, getToolManager());
    sharedTemplateManager = this.templateManager;
  }

  async enable({ app }: ModuleContext): Promise<void> {
    await app.whenReady();

    // Template CRUD operations
    ipcMain.handle('templates:list', async () => {
      return await this.templateManager.listTemplates();
    });

    ipcMain.handle('templates:get', async (_, templateId: string) => {
      const template = await this.templateManager.getTemplate(templateId);
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
      const template = await this.templateManager.createTemplate(nodeInput);
      
      // Convert Buffer back to Uint8Array for browser compatibility
      return {
        ...template,
        imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
        thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
      };
    });

    ipcMain.handle('templates:update', async (_, input: UpdateTemplateInput) => {
      const template = await this.templateManager.updateTemplate(input);
      if (!template) return null;
      
      // Convert Buffer back to Uint8Array for browser compatibility
      return {
        ...template,
        imageData: template.imageData ? new Uint8Array(template.imageData) : undefined,
        thumbnailData: template.thumbnailData ? new Uint8Array(template.thumbnailData) : undefined
      };
    });

    ipcMain.handle('templates:delete', async (_, templateId: string) => {
      return await this.templateManager.deleteTemplate(templateId);
    });

    // Template discovery and search
    ipcMain.handle('templates:search', async (_, query: string) => {
      return await this.templateManager.searchTemplates(query);
    });

    ipcMain.handle('templates:get-by-category', async (_, category: string) => {
      return await this.templateManager.getTemplatesByCategory(category);
    });

    ipcMain.handle('templates:get-by-tags', async (_, tags: string[]) => {
      return await this.templateManager.getTemplatesByTags(tags);
    });

    ipcMain.handle('templates:get-categories', async () => {
      return await this.templateManager.getCategories();
    });

    ipcMain.handle('templates:get-all-tags', async () => {
      return await this.templateManager.getAllTags();
    });

    // Template matching and usage
    ipcMain.handle('templates:match', async (_, screenImage: Buffer, options: any) => {
      return await this.templateManager.matchTemplates(screenImage, options);
    });

    ipcMain.handle('templates:record-usage', async (_, templateId: string, success: boolean) => {
      return await this.templateManager.recordTemplateUsage(templateId, success);
    });

    // Template reference resolution
    ipcMain.handle('templates:resolve-reference', async (_, reference: string) => {
      return await this.templateManager.resolveTemplateReference(reference);
    });

    // Template statistics and management
    ipcMain.handle('templates:get-stats', async () => {
      return await this.templateManager.getStats();
    });

    // Template import/export
    ipcMain.handle('templates:export', async (_, templateId: string) => {
      return await this.templateManager.exportTemplate(templateId);
    });

    ipcMain.handle('templates:import', async (_, data: string) => {
      return await this.templateManager.importTemplate(data);
    });
  }
}

export const getTemplateManager = () => sharedTemplateManager;
export const initializeTemplateModule = () => new TemplateModule();