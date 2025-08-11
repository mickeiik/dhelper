import type { AppInitConfig } from './AppInitConfig.js';
import { app, BrowserWindow } from 'electron';
import { getToolManager, initializeTools } from './modules/ToolModule.js';
import { initializeWorkflows } from './modules/WorkflowModule.js';
import { getTemplateManager, initializeTemplates, cleanupTemplates } from './modules/TemplateModule.js';
import { initializeOverlay, cleanupOverlays } from './modules/OverlayModule.js';
import { initializeSecurity } from './modules/security.js';
import { initializeElectron } from './modules/electron.js';
import { ConfigLoader } from './config/index.js';

export async function initApp(initConfig: AppInitConfig) {
  // Load centralized configuration
  const config = ConfigLoader.loadConfig();
  console.log('✓ Configuration loaded:', {
    workflowsPath: config.storage.workflowsPath,
    templatesPath: config.storage.templatesPath,
    toolTimeout: config.tools.timeout,
    theme: config.ui.theme
  });

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

  const templateManagerService = getTemplateManager()
  getToolManager().setTemplateManager(templateManagerService)

  // Setup cleanup handlers for graceful shutdown
  setupCleanupHandlers();
}

async function cleanup() {
  console.log('Starting application cleanup...');
  
  try {
    // Close all overlay windows
    await cleanupOverlays();
    console.log('✓ Overlay windows cleaned up');
    
    // Close database connections and cleanup templates
    await cleanupTemplates();
    console.log('✓ Template storage cleaned up');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

function setupCleanupHandlers() {
  // Handle app quit
  app.on('before-quit', async (event) => {
    event.preventDefault();
    await cleanup();
    app.exit(0);
  });

  // Handle window all closed
  app.on('window-all-closed', async () => {
    await cleanup();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Handle process signals for graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
  });
}
