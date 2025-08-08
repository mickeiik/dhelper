// packages/preload/src/index.ts
import { sha256sum } from './nodeCrypto.js';
import { versions } from './versions.js';
import { ipcRenderer } from 'electron';

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message);
}

export { sha256sum, versions, send };

import { getTools, runTool } from './tools.js';
export { getTools, runTool };

import {
  runWorkflow,
  runCustomWorkflow,
  onWorkflowProgress,
  clearWorkflowCache,
  clearAllCaches,
  getCacheStats,
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow,
  listWorkflows,
  workflowExists,
  getStorageStats,
  clearAllWorkflows,
  exportWorkflow,
  importWorkflow,
  duplicateWorkflow,
  searchWorkflows,
  validateSemanticReferences,
  resolveSemanticReferences
} from './workflow.js';

export {
  runWorkflow,
  runCustomWorkflow,
  onWorkflowProgress,
  clearWorkflowCache,
  clearAllCaches,
  getCacheStats,
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow,
  listWorkflows,
  workflowExists,
  getStorageStats,
  clearAllWorkflows,
  exportWorkflow,
  importWorkflow,
  duplicateWorkflow,
  searchWorkflows,
  validateSemanticReferences,
  resolveSemanticReferences
};

import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getTemplatesByCategory,
  getTemplatesByTags,
  getTemplateCategories,
  getAllTemplateTags,
  matchTemplates,
  recordTemplateUsage,
  resolveTemplateReference,
  getTemplateStats,
  exportTemplate,
  importTemplate,
  createTemplateFromScreenshot
} from './templates.js';

export {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getTemplatesByCategory,
  getTemplatesByTags,
  getTemplateCategories,
  getAllTemplateTags,
  matchTemplates,
  recordTemplateUsage,
  resolveTemplateReference,
  getTemplateStats,
  exportTemplate,
  importTemplate,
  createTemplateFromScreenshot
};