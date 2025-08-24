import type { 
  Template, 
  TemplateMetadata, 
  CreateTemplateInput, 
  UpdateTemplateInput,
  TemplateMatchResult,
  TemplateMatchOptions,
  Result
} from '@app/types';
import { isSuccess } from '@app/types';
import { 
  TemplateSchema, 
  CreateTemplateInputSchema, 
  UpdateTemplateInputSchema,
  TemplateMatchOptionsSchema,
  TemplateMatchResultSchema
} from '@app/schemas';
import { SqliteTemplateStorage } from './storage.js';
import { ToolManager } from '@app/tools';
import { z } from 'zod';

export class TemplateManager {
  private storage: SqliteTemplateStorage;
  private toolManager: ToolManager;

  constructor(customStorageDir?: string, toolManager?: ToolManager) {
    this.storage = new SqliteTemplateStorage(customStorageDir);
    this.toolManager = toolManager || new ToolManager();
  }

  // Template CRUD operations
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    const validatedInput = CreateTemplateInputSchema.parse(input);
    return this.storage.create(validatedInput);
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    const validatedId = z.string().min(1).parse(templateId);
    const result = await this.storage.get(validatedId);
    return isSuccess(result) ? result.data : null;
  }

  async getTemplateByName(templateName: string): Promise<Template | null> {
    const validatedName = z.string().min(1).parse(templateName);
    const result = await this.storage.getByName(validatedName);
    return isSuccess(result) ? result.data : null;
  }

  async updateTemplate(input: UpdateTemplateInput): Promise<Template | null> {
    const validatedInput = UpdateTemplateInputSchema.parse(input);
    const result = await this.storage.update(validatedInput);
    return isSuccess(result) ? result.data : null;
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const validatedId = z.string().min(1).parse(templateId);
    const result = await this.storage.delete(validatedId);
    return isSuccess(result) ? result.data : false;
  }

  // Template discovery
  async listTemplates(): Promise<TemplateMetadata[]> {
    const result = await this.storage.list();
    return isSuccess(result) ? result.data : [];
  }

  async getTemplatesByCategory(category: string): Promise<TemplateMetadata[]> {
    const validatedCategory = z.string().min(1).parse(category);
    const result = await this.storage.listByCategory(validatedCategory);
    return isSuccess(result) ? result.data : [];
  }

  async getTemplatesByTags(tags: string[]): Promise<TemplateMetadata[]> {
    const validatedTags = z.array(z.string().min(1)).parse(tags);
    const result = await this.storage.listByTags(validatedTags);
    return isSuccess(result) ? result.data : [];
  }

  async searchTemplates(query: string): Promise<TemplateMetadata[]> {
    const validatedQuery = z.string().min(1).parse(query);
    const allTemplates = await this.listTemplates();
    const searchTerm = validatedQuery.toLowerCase();

    return allTemplates.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.description?.toLowerCase().includes(searchTerm) ||
      template.category.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Template matching using OpenCV template matcher tool
  async matchTemplates(
    screenImage: Buffer, 
    options: TemplateMatchOptions = {}
  ): Promise<TemplateMatchResult[]> {
    try {
      // Validate inputs
      const validatedOptions = TemplateMatchOptionsSchema.parse(options);
      const validatedBuffer = z.instanceof(Buffer).parse(screenImage);
      
      // Ensure tools are auto-discovered
      await this.toolManager.autoDiscoverTools();

      // Prepare input for template-matcher tool
      const matcherInput = {
        screenImage: validatedBuffer,
        templateIds: validatedOptions.templateIds,
        categories: validatedOptions.categories,
        tags: validatedOptions.tags,
        minConfidence: validatedOptions.minConfidence,
        maxResults: validatedOptions.maxResults,
        searchRegion: validatedOptions.searchRegion
      };

      // Call the template-matcher tool
      const results = await this.toolManager.runTool('template-matcher', matcherInput);
      
      // Validate results
      return z.array(TemplateMatchResultSchema).parse(results);
    } catch (error) {
      console.error('Template matching failed:', error);
      
      // Fall back to empty results if tool execution fails
      return [];
    }
  }

  // Template usage tracking
  async recordTemplateUsage(templateId: string, success: boolean = true): Promise<void> {
    return this.storage.incrementUsage(templateId, success);
  }

  // Scale cache management
  async updateScaleCache(templateId: string, resolution: string, scale: number): Promise<void> {
    return this.storage.updateScaleCache(templateId, resolution, scale);
  }

  // Template reference resolution (for workflow system)
  async resolveTemplateReference(reference: string): Promise<Template | null> {
    // Handle template references like {{template:template-id}} or {{template:category/name}}
    const cleanRef = reference.replace(/^{{template:/, '').replace(/}}$/, '');
    
    // First try direct ID lookup
    const directMatch = await this.getTemplate(cleanRef);
    if (directMatch) {
      return directMatch;
    }

    // Try category/name lookup
    if (cleanRef.includes('/')) {
      const [category, name] = cleanRef.split('/', 2);
      const templatesInCategory = await this.getTemplatesByCategory(category);
      const namedTemplate = templatesInCategory.find(t => t.name === name);
      
      if (namedTemplate) {
        return this.getTemplate(namedTemplate.id);
      }
    }

    // Try name lookup across all templates
    const allTemplates = await this.listTemplates();
    const namedTemplate = allTemplates.find(t => t.name === cleanRef);
    
    if (namedTemplate) {
      return this.getTemplate(namedTemplate.id);
    }

    return null;
  }

  // Utility methods
  async getCategories(): Promise<string[]> {
    const templates = await this.listTemplates();
    const categories = new Set(templates.map(t => t.category));
    return Array.from(categories).sort();
  }

  async getAllTags(): Promise<string[]> {
    const templates = await this.listTemplates();
    const allTags = new Set<string>();
    
    templates.forEach(template => {
      template.tags.forEach(tag => allTags.add(tag));
    });
    
    return Array.from(allTags).sort();
  }

  async getStats() {
    return this.storage.getStats();
  }

  async exportTemplate(templateId: string): Promise<string | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;
    
    // Export template with image data as base64
    const exportData = {
      ...template,
      imageData: template.imageData?.toString(),
      thumbnailData: template.thumbnailData?.toString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  async importTemplate(data: string): Promise<Template> {
    const importData = JSON.parse(data);
    
    // Convert base64 image data back to Buffer
    const createInput: CreateTemplateInput = {
      name: importData.name,
      description: importData.description,
      category: importData.category,
      tags: importData.tags,
      imageData: Buffer.from(importData.imageData, 'base64'),
      matchThreshold: importData.matchThreshold
    };
    
    return this.createTemplate(createInput);
  }

  /**
   * Close the template manager and cleanup all resources
   */
  async close(): Promise<void> {
    console.log('Closing template manager...');
    await this.storage.close();
  }
}