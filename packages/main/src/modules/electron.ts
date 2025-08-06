// packages/main/src/modules/electron.ts
import { app, BrowserWindow } from 'electron';
import type { AppInitConfig } from '../AppInitConfig.js';

let mainWindow: BrowserWindow | null = null;

export async function initializeElectron(initConfig: AppInitConfig, openDevTools = false) {
  // Single instance enforcement
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  // Disable hardware acceleration
  app.disableHardwareAcceleration();

  // Handle app events
  app.on('second-instance', () => restoreOrCreateWindow(true));
  app.on('activate', () => restoreOrCreateWindow(true));
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('ready', () => restoreOrCreateWindow(true));

  async function createWindow(): Promise<BrowserWindow> {
    const browserWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webviewTag: false,
        preload: initConfig.preload.path,
      },
    });

    if (initConfig.renderer instanceof URL) {
      await browserWindow.loadURL(initConfig.renderer.href);
    } else {
      await browserWindow.loadFile(initConfig.renderer.path);
    }

    if (openDevTools) {
      browserWindow.webContents.openDevTools();
    }

    return browserWindow;
  }

  async function restoreOrCreateWindow(show = false) {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = await createWindow();
    }

    if (!show) return mainWindow;

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();

    return mainWindow;
  }
}