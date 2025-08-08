import type { Template, TemplateMetadata, CreateTemplateInput, UpdateTemplateInput } from '@app/types';
import { writeFile, readFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import sqlite3 from 'sqlite3'
const sqlite = sqlite3.verbose()

export interface TemplateStorageStats {
  totalTemplates: number;
  totalSize: number;
  imageSize: number;
  oldestTemplate?: Date;
  newestTemplate?: Date;
  categoryCounts: Record<string, number>;
}

export class SqliteTemplateStorage {
  private storageDir: string;
  private imagesDir: string;
  private thumbnailsDir: string;
  private dbPath: string;
  private db: sqlite3.Database | null = null;
  private initialized = false;

  constructor(customDir?: string) {
    this.storageDir = customDir || join(app.getPath('userData'), 'templates');
    this.imagesDir = join(this.storageDir, 'images');
    this.thumbnailsDir = join(this.storageDir, 'thumbnails');
    this.dbPath = join(this.storageDir, 'templates.db');
  }

  private createDatabase(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      const db = new sqlite.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  }

  private execAsync(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private runAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  private getAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allAsync(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await mkdir(this.storageDir, { recursive: true });
      await mkdir(this.imagesDir, { recursive: true });
      await mkdir(this.thumbnailsDir, { recursive: true });
      
      // Initialize SQLite database
      this.db = await this.createDatabase();
      
      // Create templates table
      await this.execAsync(`
        CREATE TABLE IF NOT EXISTS templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          tags TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          last_used INTEGER,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          color_profile TEXT,
          match_threshold REAL,
          scale_tolerance REAL,
          rotation_tolerance REAL,
          usage_count INTEGER DEFAULT 0,
          success_rate REAL DEFAULT 0,
          image_path TEXT NOT NULL,
          thumbnail_path TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
        CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
        CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at);
      `);

      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize template storage:', error);
      throw error;
    }
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
    if (!this.db) throw new Error('Database not initialized');

    const templateId = randomUUID();
    const now = new Date();
    
    try {
      // Save image
      const imagePath = this.getImagePath(templateId);
      await writeFile(imagePath, input.imageData);

      // Process image to get dimensions and generate thumbnail
      const { width, height, thumbnailData } = await this.processImage(input.imageData, templateId);

      const metadata: TemplateMetadata = {
        id: templateId,
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
        width,
        height,
        colorProfile: input.colorProfile || 'auto',
        matchThreshold: input.matchThreshold || 0.8,
        scaleTolerance: input.scaleTolerance,
        rotationTolerance: input.rotationTolerance,
        usageCount: 0,
        imagePath: `images/${templateId}.png`,
        thumbnailPath: `thumbnails/${templateId}_thumb.png`
      };

      // Insert into database
      const insertSql = `
        INSERT INTO templates (
          id, name, description, category, tags, created_at, updated_at, last_used,
          width, height, color_profile, match_threshold, scale_tolerance, rotation_tolerance,
          usage_count, success_rate, image_path, thumbnail_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.runAsync(insertSql, [
        templateId,
        input.name,
        input.description || null,
        input.category,
        JSON.stringify(input.tags || []),
        now.getTime(),
        now.getTime(),
        null,
        width,
        height,
        input.colorProfile || 'auto',
        input.matchThreshold || 0.8,
        input.scaleTolerance || null,
        input.rotationTolerance || null,
        0,
        0,
        `images/${templateId}.png`,
        `thumbnails/${templateId}_thumb.png`
      ]);

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
    if (!this.db) throw new Error('Database not initialized');

    try {
      const row = await this.getAsync('SELECT * FROM templates WHERE id = ?', [templateId]);
      
      if (!row) {
        return null;
      }

      // Parse database row into metadata
      const metadata: TemplateMetadata = {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        width: row.width,
        height: row.height,
        colorProfile: row.color_profile,
        matchThreshold: row.match_threshold,
        scaleTolerance: row.scale_tolerance,
        rotationTolerance: row.rotation_tolerance,
        usageCount: row.usage_count,
        successRate: row.success_rate,
        imagePath: row.image_path,
        thumbnailPath: row.thumbnail_path
      };

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

  async getByName(templateName: string): Promise<Template | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const row = await this.getAsync('SELECT * FROM templates WHERE name = ?', [templateName]);
      
      if (!row) {
        return null;
      }

      // Use the existing get method to load full template data
      return await this.get(row.id);
    } catch (error) {
      console.error(`Failed to get template by name ${templateName}:`, error);
      return null;
    }
  }

  async update(input: UpdateTemplateInput): Promise<Template | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const updateSql = `
        UPDATE templates SET 
          name = COALESCE(?, name),
          description = COALESCE(?, description), 
          category = COALESCE(?, category),
          tags = COALESCE(?, tags),
          match_threshold = COALESCE(?, match_threshold),
          scale_tolerance = COALESCE(?, scale_tolerance),
          rotation_tolerance = COALESCE(?, rotation_tolerance),
          color_profile = COALESCE(?, color_profile),
          updated_at = ?
        WHERE id = ?
      `;

      const result = await this.runAsync(updateSql, [
        input.name || null,
        input.description || null,
        input.category || null,
        input.tags ? JSON.stringify(input.tags) : null,
        input.matchThreshold || null,
        input.scaleTolerance || null,
        input.rotationTolerance || null,
        input.colorProfile || null,
        new Date().getTime(),
        input.id
      ]);

      if (result.changes === 0) {
        return null;
      }

      // Return the updated template
      return await this.get(input.id);
    } catch (error) {
      console.error(`Failed to update template ${input.id}:`, error);
      throw error;
    }
  }

  async delete(templateId: string): Promise<boolean> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.runAsync('DELETE FROM templates WHERE id = ?', [templateId]);

      if (result.changes === 0) {
        return false;
      }

      // Delete image files
      const imagePath = this.getImagePath(templateId);
      const thumbnailPath = this.getThumbnailPath(templateId);

      if (existsSync(imagePath)) {
        await unlink(imagePath);
      }

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
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = await this.allAsync('SELECT * FROM templates ORDER BY updated_at DESC');

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        width: row.width,
        height: row.height,
        colorProfile: row.color_profile,
        matchThreshold: row.match_threshold,
        scaleTolerance: row.scale_tolerance,
        rotationTolerance: row.rotation_tolerance,
        usageCount: row.usage_count,
        successRate: row.success_rate,
        imagePath: row.image_path,
        thumbnailPath: row.thumbnail_path
      }));
    } catch (error) {
      console.error('Failed to list templates:', error);
      return [];
    }
  }

  async listByCategory(category: string): Promise<TemplateMetadata[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = await this.allAsync('SELECT * FROM templates WHERE category = ? ORDER BY updated_at DESC', [category]);

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        width: row.width,
        height: row.height,
        colorProfile: row.color_profile,
        matchThreshold: row.match_threshold,
        scaleTolerance: row.scale_tolerance,
        rotationTolerance: row.rotation_tolerance,
        usageCount: row.usage_count,
        successRate: row.success_rate,
        imagePath: row.image_path,
        thumbnailPath: row.thumbnail_path
      }));
    } catch (error) {
      console.error(`Failed to list templates by category ${category}:`, error);
      return [];
    }
  }

  async listByTags(tags: string[]): Promise<TemplateMetadata[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Build query to match any of the provided tags
      const placeholders = tags.map(() => 'tags LIKE ?').join(' OR ');
      const searchTags = tags.map(tag => `%"${tag}"%`);
      const rows = await this.allAsync(`SELECT * FROM templates WHERE ${placeholders} ORDER BY updated_at DESC`, searchTags);

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        width: row.width,
        height: row.height,
        colorProfile: row.color_profile,
        matchThreshold: row.match_threshold,
        scaleTolerance: row.scale_tolerance,
        rotationTolerance: row.rotation_tolerance,
        usageCount: row.usage_count,
        successRate: row.success_rate,
        imagePath: row.image_path,
        thumbnailPath: row.thumbnail_path
      }));
    } catch (error) {
      console.error(`Failed to list templates by tags:`, error);
      return [];
    }
  }

  async exists(templateId: string): Promise<boolean> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.getAsync('SELECT 1 FROM templates WHERE id = ?', [templateId]);
      return result !== undefined;
    } catch (error) {
      console.error(`Failed to check if template exists ${templateId}:`, error);
      return false;
    }
  }

  async incrementUsage(templateId: string, success: boolean = true): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get current usage data
      const current = await this.getAsync('SELECT usage_count, success_rate FROM templates WHERE id = ?', [templateId]);
      
      if (!current) return;

      const currentSuccessRate = current.success_rate || 0;
      const currentUsageCount = current.usage_count;
      
      // Update success rate with weighted average
      const newSuccessRate = success 
        ? (currentSuccessRate * currentUsageCount + 1) / (currentUsageCount + 1)
        : (currentSuccessRate * currentUsageCount) / (currentUsageCount + 1);

      // Update database
      const updateSql = `
        UPDATE templates SET 
          usage_count = ?,
          success_rate = ?,
          last_used = ?
        WHERE id = ?
      `;
      
      await this.runAsync(updateSql, [
        currentUsageCount + 1,
        newSuccessRate,
        new Date().getTime(),
        templateId
      ]);
    } catch (error) {
      console.error(`Failed to increment usage for template ${templateId}:`, error);
    }
  }

  async getStats(): Promise<TemplateStorageStats> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get template count and category counts
      const totalResult = await this.getAsync('SELECT COUNT(*) as total FROM templates');
      const totalTemplates = totalResult.total;

      const categoryResults = await this.allAsync('SELECT category, COUNT(*) as count FROM templates GROUP BY category');
      const categoryCounts: Record<string, number> = {};
      categoryResults.forEach(row => {
        categoryCounts[row.category] = row.count;
      });

      // Get date ranges
      const dateResult = await this.getAsync('SELECT MIN(created_at) as oldest, MAX(updated_at) as newest FROM templates');

      // Calculate file sizes
      const templates = await this.list();
      let totalSize = 0;
      let imageSize = 0;

      // Add database size
      if (existsSync(this.dbPath)) {
        const dbStats = await stat(this.dbPath);
        totalSize += dbStats.size;
      }

      for (const template of templates) {
        try {
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
        } catch (error) {
          console.warn(`Failed to get stats for template ${template.id}:`, error);
        }
      }

      return {
        totalTemplates,
        totalSize,
        imageSize,
        oldestTemplate: dateResult.oldest ? new Date(dateResult.oldest) : undefined,
        newestTemplate: dateResult.newest ? new Date(dateResult.newest) : undefined,
        categoryCounts
      };
    } catch (error) {
      console.error('Failed to get template stats:', error);
      return {
        totalTemplates: 0,
        totalSize: 0,
        imageSize: 0,
        categoryCounts: {}
      };
    }
  }

  async clear(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get all template IDs for file cleanup
      const templates = await this.list();
      
      // Clear database
      await this.runAsync('DELETE FROM templates');

      // Clean up image files
      for (const template of templates) {
        try {
          const imagePath = this.getImagePath(template.id);
          const thumbnailPath = this.getThumbnailPath(template.id);

          if (existsSync(imagePath)) {
            await unlink(imagePath);
          }

          if (existsSync(thumbnailPath)) {
            await unlink(thumbnailPath);
          }
        } catch (error) {
          console.warn(`Failed to delete files for template ${template.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to clear all templates:', error);
      throw error;
    }
  }
}