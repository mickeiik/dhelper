import { z } from 'zod';
import { app } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { writeFile, readFile, mkdir, unlink, readdir } from 'node:fs/promises';
import { WorkflowSchema, WorkflowStorageListItemSchema } from '@app/schemas';

// Simple stored workflow - just the workflow + timestamps
const StoredWorkflowSchema = WorkflowSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Workflow = z.infer<typeof WorkflowSchema>;
type StoredWorkflow = z.infer<typeof StoredWorkflowSchema>;
type WorkflowStorageListItem = z.infer<typeof WorkflowStorageListItemSchema>;

export class WorkflowStorage {
  private storageDir: string;
  private initialized = false;

  constructor(customDir?: string) {
    this.storageDir = customDir || join(app.getPath('userData'), 'workflows');
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.storageDir, { recursive: true });
    this.initialized = true;
  }

  private getFilePath(workflowId: string): string {
    return join(this.storageDir, `${workflowId}.json`);
  }

  async save(workflow: Workflow): Promise<void> {
    await this.initialize();
    
    // Validate workflow
    const validatedWorkflow = WorkflowSchema.parse(workflow);
    
    const now = new Date();
    
    // Check if workflow exists to preserve creation date
    const existing = await this.load(validatedWorkflow.id);
    const createdAt = existing?.createdAt || now;

    const storedWorkflow: StoredWorkflow = {
      ...validatedWorkflow,
      createdAt,
      updatedAt: now,
    };

    const filePath = this.getFilePath(workflow.id);
    const data = JSON.stringify(storedWorkflow, null, 2);
    await writeFile(filePath, data, 'utf-8');
  }

  async load(id: string): Promise<StoredWorkflow | null> {
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
    return StoredWorkflowSchema.parse(parsedData);
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();
    
    const filePath = this.getFilePath(id);
    if (!existsSync(filePath)) {
      return false;
    }
    
    await unlink(filePath);
    return true;
  }

  async list(): Promise<WorkflowStorageListItem[]> {
    await this.initialize();
    
    if (!existsSync(this.storageDir)) {
      return [];
    }

    const files = await readdir(this.storageDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    const items: WorkflowStorageListItem[] = [];

    for (const file of jsonFiles) {
      try {
        const id = file.replace('.json', '');
        const stored = await this.load(id);
        
        if (stored) {
          items.push({
            id: stored.id,
            name: stored.name,
            description: stored.description,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
            tags: [],
          });
        }
      } catch (error) {
        // Skip invalid files
        console.warn(`Failed to load workflow ${file}:`, error);
      }
    }

    // Sort by updated date (newest first)
    return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async exists(id: string): Promise<boolean> {
    await this.initialize();
    return existsSync(this.getFilePath(id));
  }


  async clear(): Promise<void> {
    const items = await this.list();
    for (const item of items) {
      await this.delete(item.id);
    }
  }

  async duplicate(sourceId: string, newId: string, newName?: string): Promise<void> {
    const stored = await this.load(sourceId);
    if (!stored) {
      throw new Error(`Source workflow ${sourceId} not found`);
    }

    const duplicated: Workflow = {
      id: newId,
      name: newName || `${stored.name} (Copy)`,
      description: stored.description,
      steps: stored.steps,
    };

    await this.save(duplicated);
  }

  async search(query: string): Promise<WorkflowStorageListItem[]> {
    const items = await this.list();
    const lowerQuery = query.toLowerCase();

    return items.filter(item =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}