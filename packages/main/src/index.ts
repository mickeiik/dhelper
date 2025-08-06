import type { AppInitConfig } from './AppInitConfig.js';
import { app, BrowserWindow } from 'electron';
import { initializeTools } from './modules/ToolModule.js';
import { initializeWorkflows } from './modules/WorkflowModule.js';
import { initializeTemplates } from './modules/TemplateModule.js';
import { initializeOverlay } from './modules/OverlayModule.js';
import { initializeSecurity } from './modules/security.js';
import { initializeElectron } from './modules/electron.js';

export async function initApp(initConfig: AppInitConfig) {
  // Initialize core electron functionality
  await initializeElectron(initConfig, import.meta.env.DEV);
  
  // Wait for app to be ready
  await app.whenReady();
  
  // Initialize overlay service first (other modules depend on it)
  const overlayService = await initializeOverlay();
  
  // Initialize security policies
  initializeSecurity(initConfig);
  
  // Initialize feature modules
  await initializeTools(overlayService);
  initializeWorkflows();
  initializeTemplates();
}
