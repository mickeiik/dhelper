// packages/preload/src/index.ts
import { sha256sum } from './nodeCrypto.js';
import { versions } from './versions.js';
import { ipcRenderer } from 'electron';

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message);
}

export { sha256sum, versions, send };

import { getTools } from './tools.js';
export { getTools };

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
  searchWorkflows
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
  searchWorkflows
};