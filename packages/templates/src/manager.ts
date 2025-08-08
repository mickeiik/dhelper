import type { 
  Template, 
  TemplateMetadata, 
  CreateTemplateInput, 
  UpdateTemplateInput,
  TemplateMatchResult,
  TemplateMatchOptions 
} from '@app/types';
import { SqliteTemplateStorage } from './storage.js';
import { ToolManager } from '@app/tools';

export class TemplateManager {
  private storage: SqliteTemplateStorage;
  private toolManager: ToolManager;

  constructor(customStorageDir?: string, toolManager?: ToolManager) {
    this.storage = new SqliteTemplateStorage(customStorageDir);
    this.toolManager = toolManager || new ToolManager();
  }

  // Template CRUD operations
  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    return this.storage.create(input);
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    return this.storage.get(templateId);
  }

  async getTemplateByName(templateName: string): Promise<Template | null> {
    return this.storage.getByName(templateName);
  }

  async updateTemplate(input: UpdateTemplateInput): Promise<Template | null> {
    return this.storage.update(input);
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    return this.storage.delete(templateId);
  }

  // Template discovery
  async listTemplates(): Promise<TemplateMetadata[]> {
    return this.storage.list();
  }

  async getTemplatesByCategory(category: string): Promise<TemplateMetadata[]> {
    return this.storage.listByCategory(category);
  }

  async getTemplatesByTags(tags: string[]): Promise<TemplateMetadata[]> {
    return this.storage.listByTags(tags);
  }

  async searchTemplates(query: string): Promise<TemplateMetadata[]> {
    const allTemplates = await this.listTemplates();
    const searchTerm = query.toLowerCase();

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
      // Ensure tools are auto-discovered
      await this.toolManager.autoDiscoverTools();

      // Prepare input for template-matcher tool
      const matcherInput = {
        screenImage,
        templateIds: options.templateIds,
        categories: options.categories,
        tags: options.tags,
        minConfidence: options.minConfidence,
        maxResults: options.maxResults,
        searchRegion: options.searchRegion
      };

      // Call the template-matcher tool
      const results = await this.toolManager.runTool('template-matcher', matcherInput);
      
      return results as TemplateMatchResult[];
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
      matchThreshold: importData.matchThreshold,
      scaleTolerance: importData.scaleTolerance,
      rotationTolerance: importData.rotationTolerance,
      colorProfile: importData.colorProfile
    };
    
    return this.createTemplate(createInput);
  }
}