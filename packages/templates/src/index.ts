import { TemplateManager } from './manager.js';

// Re-export template registry types
export type {
  TemplateRegistry,
  TemplateId,
  TemplateRef,
  TemplateReference
} from './registry.js';

// Re-export storage classes
export { 
  SqliteTemplateStorage
} from './storage.js';

// Re-export main manager class
export { 
  TemplateManager 
} from './manager.js';

// Create and export singleton instance for use across the application
export const templateManager = new TemplateManager();