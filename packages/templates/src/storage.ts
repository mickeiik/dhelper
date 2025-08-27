import { z } from 'zod';
import { app } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { writeFile, readFile, mkdir, unlink, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { TemplateSchema, CreateTemplateInputSchema, UpdateTemplateInputSchema } from '@app/schemas';

type Template = z.infer<typeof TemplateSchema>;
type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;
type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;

export class TemplateStorage {
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
    await mkdir(this.storageDir, { recursive: true });
    await mkdir(this.imagesDir, { recursive: true });
    await mkdir(this.thumbnailsDir, { recursive: true });
    this.initialized = true;
  }

  private getFilePath(templateId: string): string {
    return join(this.storageDir, `${templateId}.json`);
  }

  private getImagePath(templateId: string): string {
    return join(this.imagesDir, `${templateId}.png`);
  }

  private getThumbnailPath(templateId: string): string {
    return join(this.thumbnailsDir, `${templateId}_thumb.png`);
  }

  private async processAndSaveImage(imageData: Uint8Array, templateId: string): Promise<{ width: number; height: number }> {
    const image = sharp(imageData);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }

    // Save original image
    const imagePath = this.getImagePath(templateId);
    await writeFile(imagePath, imageData);

    // Generate and save thumbnail (max 150x150, maintaining aspect ratio)
    const thumbnailBuffer = await image
      .resize(150, 150, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .png()
      .toBuffer();

    const thumbnailPath = this.getThumbnailPath(templateId);
    await writeFile(thumbnailPath, thumbnailBuffer);

    return {
      width: metadata.width,
      height: metadata.height
    };
  }

  async save(input: CreateTemplateInput): Promise<Template> {
    await this.initialize();
    
    const templateId = randomUUID();
    const now = new Date();
    
    // Process and save images, get dimensions
    const { width, height } = await this.processAndSaveImage(input.imageData, templateId);
    
    // Create template with file paths
    const template: Template = {
      id: templateId,
      name: input.name,
      description: input.description,
      category: input.category,
      width,
      height,
      matchThreshold: input.matchThreshold || 0.8,
      sourceResolution: input.sourceResolution,
      imagePath: `images/${templateId}.png`,
      thumbnailPath: `thumbnails/${templateId}_thumb.png`,
      createdAt: now,
      updatedAt: now,
    };

    // Save template metadata
    const filePath = this.getFilePath(templateId);
    const data = JSON.stringify(template, null, 2);
    await writeFile(filePath, data, 'utf-8');

    return template;
  }

  async load(id: string): Promise<Template | null> {
    await this.initialize();
    
    const filePath = this.getFilePath(id);
    if (!existsSync(filePath)) {
      return null;
    }

    const rawData = await readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    
    // Convert date strings back to Date objects
    if (parsedData.createdAt) parsedData.createdAt = new Date(parsedData.createdAt);
    if (parsedData.updatedAt) parsedData.updatedAt = new Date(parsedData.updatedAt);
    
    // Validate and return
    return TemplateSchema.parse(parsedData);
  }

  async update(id: string, input: UpdateTemplateInput): Promise<void> {
    await this.initialize();
    
    const stored = await this.load(id);
    if (!stored) {
      throw new Error(`Template ${id} not found`);
    }

    const updated: Template = {
      ...stored,
      name: input.name ?? stored.name,
      description: input.description ?? stored.description,
      category: input.category ?? stored.category,
      matchThreshold: input.matchThreshold ?? stored.matchThreshold,
      updatedAt: new Date(),
    };

    const filePath = this.getFilePath(id);
    const data = JSON.stringify(updated, null, 2);
    await writeFile(filePath, data, 'utf-8');
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();
    
    const filePath = this.getFilePath(id);
    if (!existsSync(filePath)) {
      return false;
    }
    
    await unlink(filePath);
    
    // Delete image files
    const imagePath = this.getImagePath(id);
    const thumbnailPath = this.getThumbnailPath(id);

    if (existsSync(imagePath)) {
      await unlink(imagePath);
    }

    if (existsSync(thumbnailPath)) {
      await unlink(thumbnailPath);
    }
    
    return true;
  }

  async list(): Promise<Template[]> {
    await this.initialize();
    
    if (!existsSync(this.storageDir)) {
      return [];
    }

    const files = await readdir(this.storageDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const templates: Template[] = [];

    for (const file of jsonFiles) {
      try {
        const id = file.replace('.json', '');
        const template = await this.load(id);
        
        if (template) {
          templates.push(template);
        }
      } catch (error) {
        console.warn(`Failed to load template ${file}:`, error);
      }
    }

    // Sort by updated date (newest first)
    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async exists(id: string): Promise<boolean> {
    await this.initialize();
    return existsSync(this.getFilePath(id));
  }

  async clear(): Promise<void> {
    const templates = await this.list();
    for (const template of templates) {
      await this.delete(template.id);
    }
  }

  async search(query: string): Promise<Template[]> {
    const templates = await this.list();
    const lowerQuery = query.toLowerCase();

    return templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description?.toLowerCase().includes(lowerQuery) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  }

  // Get absolute file paths for protocol handler
  getAbsoluteImagePath(templateId: string): string {
    return this.getImagePath(templateId);
  }

  getAbsoluteThumbnailPath(templateId: string): string {
    return this.getThumbnailPath(templateId);
  }

  async getImageData(templateId: string): Promise<{ fileData: Buffer; exists: boolean }> {
    await this.initialize();
    
    const imagePath = this.getImagePath(templateId);
    if (!existsSync(imagePath)) {
      return { fileData: Buffer.alloc(0), exists: false };
    }

    const fileData = await readFile(imagePath);
    return { fileData, exists: true };
  }

  async getThumbnailData(templateId: string): Promise<{ fileData: Buffer; exists: boolean }> {
    await this.initialize();
    
    const thumbnailPath = this.getThumbnailPath(templateId);
    if (!existsSync(thumbnailPath)) {
      return { fileData: Buffer.alloc(0), exists: false };
    }

    const fileData = await readFile(thumbnailPath);
    return { fileData, exists: true };
  }
}