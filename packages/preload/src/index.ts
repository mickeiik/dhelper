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
  runExampleWorkflow,
  runCustomWorkflow,
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow,
  listWorkflows,
  workflowExists,
  clearAllWorkflows,
  searchWorkflows
} from './workflow.js';

export {
  runWorkflow,
  runExampleWorkflow,
  runCustomWorkflow,
  saveWorkflow,
  loadWorkflow,
  deleteWorkflow,
  listWorkflows,
  workflowExists,
  clearAllWorkflows,
  searchWorkflows
};

import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getTemplateCategories
} from './templates.js';

export {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getTemplateCategories
};