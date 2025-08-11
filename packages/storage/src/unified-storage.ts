export interface StorageMetadata {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export abstract class BaseStorage<T> {
  abstract save(id: string, data: T): Promise<void>;
  abstract load(id: string): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract list(): Promise<Array<{ id: string; metadata: StorageMetadata }>>;

  async exists(id: string): Promise<boolean> {
    return (await this.load(id)) !== null;
  }

  async clear(): Promise<void> {
    const items = await this.list();
    for (const item of items) {
      await this.delete(item.id);
    }
  }

  async count(): Promise<number> {
    const items = await this.list();
    return items.length;
  }

  async search(query: string): Promise<Array<{ id: string; metadata: StorageMetadata }>> {
    const items = await this.list();
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => 
      item.id.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(item.metadata).toLowerCase().includes(lowerQuery)
    );
  }
}

export abstract class FileBasedStorage<T> extends BaseStorage<T> {
  protected storageDir: string;
  protected initialized = false;

  constructor(storageDir: string) {
    super();
    this.storageDir = storageDir;
  }

  protected async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const { mkdir } = await import('node:fs/promises');
    await mkdir(this.storageDir, { recursive: true });
    this.initialized = true;
  }

  protected getFilePath(id: string): string {
    const { join } = require('node:path');
    return join(this.storageDir, `${id}.json`);
  }

  async save(id: string, data: T): Promise<void> {
    await this.initialize();
    
    const { writeFile } = await import('node:fs/promises');
    const filePath = this.getFilePath(id);
    const jsonData = JSON.stringify(data, null, 2);
    await writeFile(filePath, jsonData, 'utf-8');
  }

  async load(id: string): Promise<T | null> {
    await this.initialize();
    
    const { existsSync } = await import('node:fs');
    const { readFile } = await import('node:fs/promises');
    const filePath = this.getFilePath(id);
    
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load ${id}:`, error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();
    
    const { existsSync } = await import('node:fs');
    const { unlink } = await import('node:fs/promises');
    const filePath = this.getFilePath(id);
    
    if (!existsSync(filePath)) {
      return false;
    }

    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Failed to delete ${id}:`, error);
      return false;
    }
  }

  async list(): Promise<Array<{ id: string; metadata: StorageMetadata }>> {
    await this.initialize();
    
    const { existsSync } = await import('node:fs');
    const { readdir, stat } = await import('node:fs/promises');
    
    if (!existsSync(this.storageDir)) {
      return [];
    }

    const files = await readdir(this.storageDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const items: Array<{ id: string; metadata: StorageMetadata }> = [];
    
    for (const file of jsonFiles) {
      try {
        const id = file.replace('.json', '');
        const filePath = this.getFilePath(id);
        const stats = await stat(filePath);
        
        const data = await this.load(id);
        const metadata: StorageMetadata = {
          id,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          ...(this.extractMetadata && data ? this.extractMetadata(data) : {})
        };
        
        items.push({ id, metadata });
      } catch (error) {
        console.warn(`Failed to process file ${file}:`, error);
      }
    }
    
    return items.sort((a, b) => b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime());
  }

  protected extractMetadata?(data: T): Partial<StorageMetadata>;
}

export abstract class DatabaseStorage<T> extends BaseStorage<T> {
  protected abstract initializeDatabase(): Promise<void>;
  protected abstract closeDatabase(): Promise<void>;
  
  async close(): Promise<void> {
    await this.closeDatabase();
  }
}