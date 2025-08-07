import type { Template, TemplateMetadata, CreateTemplateInput, UpdateTemplateInput } from '@app/types';
import { writeFile, readFile, mkdir, unlink, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export interface TemplateStorageStats {
  totalTemplates: number;
  totalSize: number;
  imageSize: number;
  oldestTemplate?: Date;
  newestTemplate?: Date;
  categoryCounts: Record<string, number>;
}

export class FileTemplateStorage {
  private storageDir: string;
  private imagesDir: string;
  private thumbnailsDir: string;
  private initialized = false;

  constructor(customDir?: string) {
    this.storageDir = customDir || join(app.getPath('userData'), 'templates');
    this.imagesDir = join(this.storageDir, 'images');
    this.thumbnailsDir = join(this.storageDir, 'thumbnails');
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await mkdir(this.storageDir, { recursive: true });
      await mkdir(this.imagesDir, { recursive: true });
      await mkdir(this.thumbnailsDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize template storage:', error);
      throw error;
    }
  }

  private getMetadataPath(templateId: string): string {
    return join(this.storageDir, `${templateId}.json`);
  }

  private getImagePath(templateId: string, extension: string = 'png'): string {
    return join(this.imagesDir, `${templateId}.${extension}`);
  }

  private getThumbnailPath(templateId: string, extension: string = 'png'): string {
    return join(this.thumbnailsDir, `${templateId}_thumb.${extension}`);
  }

  private async processImage(imageData: Uint8Array<ArrayBufferLike>, templateId: string): Promise<{ width: number; height: number; thumbnailData: Buffer }> {
    try {
      const image = sharp(imageData);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not determine image dimensions');
      }

      // Generate thumbnail (max 150x150, maintaining aspect ratio)
      const thumbnailBuffer = await image
        .resize(150, 150, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .png()
        .toBuffer();

      // Save thumbnail to disk
      const thumbnailPath = this.getThumbnailPath(templateId);
      await writeFile(thumbnailPath, thumbnailBuffer);

      return {
        width: metadata.width,
        height: metadata.height,
        thumbnailData: thumbnailBuffer
      };
    } catch (error) {
      console.error('Failed to process image:', error);
      // Fallback to default dimensions
      return {
        width: 100,
        height: 100,
        thumbnailData: Buffer.alloc(0)
      };
    }
  }

  async create(input: CreateTemplateInput): Promise<Template> {
    await this.initialize();

    const templateId = randomUUID();
    const now = new Date();
    
    const metadata: TemplateMetadata = {
      id: templateId,
      name: input.name,
      description: input.description,
      category: input.category,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
      width: 0, // Will be updated after image processing
      height: 0, // Will be updated after image processing
      colorProfile: input.colorProfile || 'auto',
      matchThreshold: input.matchThreshold || 0.8,
      scaleTolerance: input.scaleTolerance,
      rotationTolerance: input.rotationTolerance,
      usageCount: 0,
      imagePath: `images/${templateId}.png`,
      thumbnailPath: `thumbnails/${templateId}_thumb.png`
    };

    try {
      // Save image
      const imagePath = this.getImagePath(templateId);
      await writeFile(imagePath, input.imageData);

      // Process image to get dimensions and generate thumbnail
      const { width, height, thumbnailData } = await this.processImage(input.imageData, templateId);
      metadata.width = width;
      metadata.height = height;

      // Save metadata
      const metadataPath = this.getMetadataPath(templateId);
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

      const template: Template = {
        ...metadata,
        imageData: input.imageData,
        thumbnailData
      };

      return template;
    } catch (error) {
      console.error(`Failed to create template:`, error);
      throw error;
    }
  }

  async get(templateId: string): Promise<Template | null> {
    await this.initialize();

    try {
      const metadataPath = this.getMetadataPath(templateId);
      
      if (!existsSync(metadataPath)) {
        return null;
      }

      const metadataData = await readFile(metadataPath, 'utf-8');
      const metadata: TemplateMetadata = JSON.parse(metadataData);

      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt);
      metadata.updatedAt = new Date(metadata.updatedAt);
      if (metadata.lastUsed) {
        metadata.lastUsed = new Date(metadata.lastUsed);
      }

      // Load image data
      const imagePath = this.getImagePath(templateId);
      let imageData: Buffer | undefined;
      if (existsSync(imagePath)) {
        imageData = await readFile(imagePath);
      }

      // Load thumbnail data if exists
      const thumbnailPath = this.getThumbnailPath(templateId);
      let thumbnailData: Buffer | undefined;
      if (existsSync(thumbnailPath)) {
        thumbnailData = await readFile(thumbnailPath);
      }

      const template: Template = {
        ...metadata,
        imageData,
        thumbnailData
      };

      return template;
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      return null;
    }
  }

  async update(input: UpdateTemplateInput): Promise<Template | null> {
    await this.initialize();

    const existing = await this.get(input.id);
    if (!existing) {
      return null;
    }

    const updatedMetadata: TemplateMetadata = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      tags: input.tags ?? existing.tags,
      matchThreshold: input.matchThreshold ?? existing.matchThreshold,
      scaleTolerance: input.scaleTolerance ?? existing.scaleTolerance,
      rotationTolerance: input.rotationTolerance ?? existing.rotationTolerance,
      colorProfile: input.colorProfile ?? existing.colorProfile,
      updatedAt: new Date()
    };

    try {
      const metadataPath = this.getMetadataPath(input.id);
      await writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');

      return {
        ...updatedMetadata,
        imageData: existing.imageData,
        thumbnailData: existing.thumbnailData
      };
    } catch (error) {
      console.error(`Failed to update template ${input.id}:`, error);
      throw error;
    }
  }

  async delete(templateId: string): Promise<boolean> {
    await this.initialize();

    try {
      const metadataPath = this.getMetadataPath(templateId);
      const imagePath = this.getImagePath(templateId);
      const thumbnailPath = this.getThumbnailPath(templateId);

      if (!existsSync(metadataPath)) {
        return false;
      }

      // Delete metadata file
      await unlink(metadataPath);

      // Delete image file if exists
      if (existsSync(imagePath)) {
        await unlink(imagePath);
      }

      // Delete thumbnail file if exists
      if (existsSync(thumbnailPath)) {
        await unlink(thumbnailPath);
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete template ${templateId}:`, error);
      return false;
    }
  }

  async list(): Promise<TemplateMetadata[]> {
    await this.initialize();

    try {
      if (!existsSync(this.storageDir)) {
        return [];
      }

      const files = await readdir(this.storageDir);
      const metadataFiles = files.filter(file => file.endsWith('.json'));

      const templates: TemplateMetadata[] = [];

      for (const file of metadataFiles) {
        try {
          const templateId = file.replace('.json', '');
          const template = await this.get(templateId);

          if (template) {
            // Return metadata only (without image data for performance)
            const { imageData, thumbnailData, ...metadata } = template;
            templates.push(metadata);
          }
        } catch (error) {
          console.warn(`Failed to load template info from ${file}:`, error);
        }
      }

      // Sort by updatedAt (newest first)
      templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return templates;
    } catch (error) {
      console.error('Failed to list templates:', error);
      return [];
    }
  }

  async listByCategory(category: string): Promise<TemplateMetadata[]> {
    const allTemplates = await this.list();
    return allTemplates.filter(template => template.category === category);
  }

  async listByTags(tags: string[]): Promise<TemplateMetadata[]> {
    const allTemplates = await this.list();
    return allTemplates.filter(template => 
      tags.some(tag => template.tags.includes(tag))
    );
  }

  async exists(templateId: string): Promise<boolean> {
    await this.initialize();
    const metadataPath = this.getMetadataPath(templateId);
    return existsSync(metadataPath);
  }

  async incrementUsage(templateId: string, success: boolean = true): Promise<void> {
    const template = await this.get(templateId);
    if (!template) return;

    const currentSuccessRate = template.successRate || 0;
    const currentUsageCount = template.usageCount;
    
    // Update success rate with weighted average
    const newSuccessRate = success 
      ? (currentSuccessRate * currentUsageCount + 1) / (currentUsageCount + 1)
      : (currentSuccessRate * currentUsageCount) / (currentUsageCount + 1);

    await this.update({
      id: templateId,
      usageCount: currentUsageCount + 1,
      successRate: newSuccessRate,
      lastUsed: new Date()
    } as UpdateTemplateInput & { usageCount: number; successRate: number; lastUsed: Date });
  }

  async getStats(): Promise<TemplateStorageStats> {
    await this.initialize();

    const templates = await this.list();
    let totalSize = 0;
    let imageSize = 0;
    const categoryCounts: Record<string, number> = {};

    for (const template of templates) {
      try {
        // Metadata file size
        const metadataPath = this.getMetadataPath(template.id);
        if (existsSync(metadataPath)) {
          const metadataStats = await stat(metadataPath);
          totalSize += metadataStats.size;
        }

        // Image file size
        const imagePath = this.getImagePath(template.id);
        if (existsSync(imagePath)) {
          const imageStats = await stat(imagePath);
          totalSize += imageStats.size;
          imageSize += imageStats.size;
        }

        // Thumbnail file size
        const thumbnailPath = this.getThumbnailPath(template.id);
        if (existsSync(thumbnailPath)) {
          const thumbStats = await stat(thumbnailPath);
          totalSize += thumbStats.size;
          imageSize += thumbStats.size;
        }

        // Count categories
        categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1;
      } catch (error) {
        console.warn(`Failed to get stats for template ${template.id}:`, error);
      }
    }

    const dates = templates.map(t => t.updatedAt).sort((a, b) => a.getTime() - b.getTime());

    return {
      totalTemplates: templates.length,
      totalSize,
      imageSize,
      oldestTemplate: dates[0],
      newestTemplate: dates[dates.length - 1],
      categoryCounts
    };
  }

  async clear(): Promise<void> {
    await this.initialize();

    try {
      const templates = await this.list();

      for (const template of templates) {
        await this.delete(template.id);
      }
    } catch (error) {
      console.error('Failed to clear all templates:', error);
      throw error;
    }
  }
}