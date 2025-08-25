import { TemplateManager } from './manager.js';

// Re-export storage classes
export { 
  TemplateStorage
} from './storage.js';

// Re-export main manager class
export { 
  TemplateManager 
} from './manager.js';

// Create and export singleton instance for use across the application
export const templateManager = new TemplateManager();