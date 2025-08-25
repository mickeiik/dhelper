import { z } from 'zod';
import { 
  TemplateSchema, 
  CreateTemplateInputSchema, 
  UpdateTemplateInputSchema
} from '@app/schemas';
import { TemplateStorage } from './storage.js';

type Template = z.infer<typeof TemplateSchema>;
type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;
type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;

export class TemplateManager {
  private storage: TemplateStorage;

  constructor(customStorageDir?: string) {
    this.storage = new TemplateStorage(customStorageDir);
  }

  // Template CRUD operations
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const validatedInput = CreateTemplateInputSchema.parse(input);
    return this.storage.save(validatedInput);
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    const validatedId = z.string().min(1).parse(templateId);
    return this.storage.load(validatedId);
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<void> {
    const validatedId = z.string().min(1).parse(id);
    const validatedInput = UpdateTemplateInputSchema.parse(input);
    return this.storage.update(validatedId, validatedInput);
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const validatedId = z.string().min(1).parse(templateId);
    return this.storage.delete(validatedId);
  }

  // Template discovery
  async listTemplates(): Promise<Template[]> {
    return this.storage.list();
  }

  async searchTemplates(query: string): Promise<Template[]> {
    const validatedQuery = z.string().min(1).parse(query);
    return this.storage.search(validatedQuery);
  }

  // Template reference resolution (for workflow system)
  async resolveTemplateReference(reference: string): Promise<Template | null> {
    // Handle template references like {{template:template-id}} or {{template:name}}
    const cleanRef = reference.replace(/^{{template:/, '').replace(/}}$/, '');
    
    // First try direct ID lookup
    const directMatch = await this.getTemplate(cleanRef);
    if (directMatch) {
      return directMatch;
    }

    // Try name lookup across all templates
    const allTemplates = await this.listTemplates();
    const namedTemplate = allTemplates.find(t => t.name === cleanRef);
    
    return namedTemplate || null;
  }

  // Utility methods
  async getCategories(): Promise<string[]> {
    const templates = await this.listTemplates();
    const categories = new Set(templates.map(t => t.category));
    return Array.from(categories).sort();
  }

  // Get template URLs for renderer (protocol-based)
  getTemplateImageUrl(templateId: string): string {
    return `template://image/${templateId}`;
  }

  getTemplateThumbnailUrl(templateId: string): string {
    return `template://thumbnail/${templateId}`;
  }

  // Get absolute paths for protocol handler
  getAbsoluteImagePath(templateId: string): string {
    return this.storage.getAbsoluteImagePath(templateId);
  }

  getAbsoluteThumbnailPath(templateId: string): string {
    return this.storage.getAbsoluteThumbnailPath(templateId);
  }
}