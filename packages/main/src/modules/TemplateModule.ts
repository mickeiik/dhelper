import { ipcMain, protocol } from 'electron';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { TemplateManager } from '@app/templates';
import { TemplateSchema, CreateTemplateInputSchema, UpdateTemplateInputSchema } from '@app/schemas';
import { z } from 'zod';
import { getConfig } from '../config/index.js';

type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;
type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;
const config = getConfig();

const templateManager = new TemplateManager(config.storage.templatesPath);

export function initializeTemplates() {
    // Register template:// protocol handler
    protocol.handle('template', async (request) => {
      try {
        const url = new URL(request.url);
        const [type, templateId] = url.pathname.split('/').filter(Boolean);
        
        if (!templateId) {
          return new Response('Invalid URL', { status: 400 });
        }

        let filePath: string;
        
        if (type === 'image') {
          filePath = templateManager.getAbsoluteImagePath(templateId);
        } else if (type === 'thumbnail') {
          filePath = templateManager.getAbsoluteThumbnailPath(templateId);
        } else {
          return new Response('Invalid URL', { status: 400 });
        }

        if (!existsSync(filePath)) {
          return new Response('File not found', { status: 404 });
        }

        const fileData = await readFile(filePath);
        return new Response(new Uint8Array(fileData), {
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': fileData.length.toString()
          }
        });
      } catch (error) {
        console.error('Template protocol handler error:', error);
        return new Response('Internal error', { status: 500 });
      }
    });

    // Template CRUD operations
    ipcMain.handle('templates:list', async () => {
      try {
        return await templateManager.listTemplates();
      } catch (error) {
        console.error('Failed to list templates:', error);
        throw error;
      }
    });

    ipcMain.handle('templates:get', async (_, templateId: string) => {
      return await templateManager.getTemplate(templateId);
    });

    ipcMain.handle('templates:create', async (_, input: CreateTemplateInput) => {
      return await templateManager.createTemplate(input);
    });

    ipcMain.handle('templates:update', async (_, id: string, input: UpdateTemplateInput) => {
      return await templateManager.updateTemplate(id, input);
    });

    ipcMain.handle('templates:delete', async (_, templateId: string) => {
      return await templateManager.deleteTemplate(templateId);
    });

    // Template discovery and search
    ipcMain.handle('templates:search', async (_, query: string) => {
      return await templateManager.searchTemplates(query);
    });

    ipcMain.handle('templates:get-categories', async () => {
      return await templateManager.getCategories();
    });

    // Template reference resolution
    ipcMain.handle('templates:resolve-reference', async (_, reference: string) => {
      return await templateManager.resolveTemplateReference(reference);
    });

}

export const getTemplateManager = () => templateManager;