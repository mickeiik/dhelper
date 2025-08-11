// packages/main/src/modules/OverlayModule.ts
import type {
  OverlayService,
  OverlayWindow,
  OverlayOptions,
  OverlayShape,
  OverlayText,
  Point,
  Rectangle,
  OverlayEvents
} from '@app/types';
import { BrowserWindow, screen, ipcMain } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { getConfig } from '../config/index.js';

class OverlayWindowImpl implements OverlayWindow {
  readonly id: string;
  private window: BrowserWindow;
  private mouseClickCallbacks: ((point: Point) => void)[] = [];
  private mouseMoveCallbacks: ((point: Point) => void)[] = [];
  private keyPressCallbacks: ((key: string) => void)[] = [];

  constructor(window: BrowserWindow, id: string) {
    this.window = window;
    this.id = id;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle IPC events from overlay window
    const handleMouseClick = (event: Electron.IpcMainEvent, data: { x: number; y: number }) => {
      if (event.sender.id === this.window.webContents.id) {
        const point: Point = { x: data.x, y: data.y };
        this.mouseClickCallbacks.forEach(cb => cb(point));
      }
    };

    const handleMouseMove = (event: Electron.IpcMainEvent, data: { x: number; y: number }) => {
      if (event.sender.id === this.window.webContents.id) {
        const point: Point = { x: data.x, y: data.y };
        this.mouseMoveCallbacks.forEach(cb => cb(point));
      }
    };

    const handleKeyPress = (event: Electron.IpcMainEvent, data: { key: string }) => {
      if (event.sender.id === this.window.webContents.id) {
        this.keyPressCallbacks.forEach(cb => cb(data.key));
      }
    };

    const clickChannel = `overlay-mouse-click-${this.id}`;
    const moveChannel = `overlay-mouse-move-${this.id}`;
    const keyChannel = `overlay-key-press-${this.id}`;
    
    ipcMain.on(clickChannel, handleMouseClick);
    ipcMain.on(moveChannel, handleMouseMove);
    ipcMain.on(keyChannel, handleKeyPress);

    // Clean up when window is closed
    this.window.on('closed', () => {
      ipcMain.removeListener(`overlay-mouse-click-${this.id}`, handleMouseClick);
      ipcMain.removeListener(`overlay-mouse-move-${this.id}`, handleMouseMove);
      ipcMain.removeListener(`overlay-key-press-${this.id}`, handleKeyPress);
    });
  }

  async drawShapes(shapes: OverlayShape[]): Promise<void> {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('overlay-draw-shapes', shapes);
    }
  }

  async drawText(texts: OverlayText[]): Promise<void> {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('overlay-draw-text', texts);
    }
  }

  async clear(): Promise<void> {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('overlay-clear');
    }
  }

  onMouseClick(callback: (point: Point) => void): void {
    this.mouseClickCallbacks.push(callback);
  }

  onMouseMove(callback: (point: Point) => void): void {
    this.mouseMoveCallbacks.push(callback);
  }

  onKeyPress(callback: (key: string) => void): void {
    this.keyPressCallbacks.push(callback);
  }

  async show(): Promise<void> {
    if (!this.window.isDestroyed()) {
      this.window.show();
    }
  }

  async hide(): Promise<void> {
    if (!this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  async close(): Promise<void> {
    if (!this.window.isDestroyed()) {
      this.window.close();
    }
  }

  isVisible(): boolean {
    return !this.window.isDestroyed() && this.window.isVisible();
  }

  getBounds(): Rectangle {
    if (this.window.isDestroyed()) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const bounds = this.window.getBounds();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  }
}

class OverlayServiceImpl implements OverlayService {
  private overlays = new Map<string, OverlayWindowImpl>();

  async createOverlay(options: OverlayOptions = {}): Promise<OverlayWindow> {
    const overlayId = randomUUID();
    const config = getConfig();
    
    // Determine bounds - use provided bounds or full screen
    let bounds: Rectangle;
    if (options.bounds) {
      bounds = options.bounds;
    } else {
      // Always use primary display with full screen bounds
      const primaryDisplay = screen.getPrimaryDisplay();
      bounds = {
        x: primaryDisplay.bounds.x,
        y: primaryDisplay.bounds.y,
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height
      };
    }

    // Create overlay window with configuration defaults
    const window = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      transparent: options.transparent ?? config.overlay.transparent,
      frame: false,
      alwaysOnTop: options.alwaysOnTop ?? config.overlay.alwaysOnTop,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      focusable: !(options.clickThrough ?? config.overlay.clickThrough),
      show: false, // Start hidden
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    // Force the window to the exact bounds after creation
    window.setBounds(bounds);

    // Set mouse event handling based on clickThrough option
    const clickThrough = options.clickThrough ?? config.overlay.clickThrough;
    if (clickThrough) {
      window.setIgnoreMouseEvents(true, { forward: true });
    } else {
      // Explicitly enable mouse events for interactive overlays
      window.setIgnoreMouseEvents(false);
    }

    // Load the overlay HTML using configured paths
    const possiblePaths = config.overlay.htmlPaths;
    
    let overlayHtmlPath: string | null = null;
    for (const path of possiblePaths) {
      try {
        // Check if file exists by trying to load it
        await window.loadFile(path);
        overlayHtmlPath = path;
        break;
      } catch (error) {
      }
    }
    
    if (!overlayHtmlPath) {
      const error = new Error(`Failed to load overlay HTML from any of the tried paths: ${possiblePaths.join(', ')}`);
      console.error(`[OverlayModule] Critical error:`, error);
      throw error;
    }    
    
    // Send initialization data to overlay - use did-finish-load instead of dom-ready
    const initializeOverlay = () => {
      // Ensure window is focused and activated for interactive overlays
      if (!clickThrough) {
        window.focus();
        window.moveTop();
        window.setAlwaysOnTop(true, 'screen-saver'); // Higher priority
      }
      
      window.webContents.send('overlay-init', {
        id: overlayId,
        options: {
          showInstructions: options.showInstructions ?? config.ui.showInstructions,
          instructionText: options.instructionText,
          timeout: options.timeout ?? config.ui.overlayTimeout
        }
      });
    };

    // Try both events - whichever fires first
    let initialized = false;
    const safeInitialize = () => {
      if (!initialized) {
        initialized = true;
        initializeOverlay();
      }
    };
    
    window.webContents.once('dom-ready', safeInitialize);
    
    // Fallback: force initialization after 500ms if no events fired
    setTimeout(() => {
      if (!initialized) {
        console.log(`[OverlayModule] Force initializing overlay ${overlayId} after timeout`);
        safeInitialize();
      }
    }, 500);

    // Handle auto-close timeout
    const timeout = options.timeout ?? config.ui.overlayTimeout;
    if (timeout && timeout > 0) {
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.close();
        }
      }, timeout);
    }

    // Create wrapper and store
    const overlayWindow = new OverlayWindowImpl(window, overlayId);
    this.overlays.set(overlayId, overlayWindow);

    // Clean up when closed
    window.on('closed', () => {
      this.overlays.delete(overlayId);
    });

    return overlayWindow;
  }

  getOverlay(id: string): OverlayWindow | undefined {
    return this.overlays.get(id);
  }

  getAllOverlays(): OverlayWindow[] {
    return Array.from(this.overlays.values());
  }

  async closeAllOverlays(): Promise<void> {
    const overlays = Array.from(this.overlays.values());
    await Promise.all(overlays.map(overlay => overlay.close()));
  }
}

const overlayService = new OverlayServiceImpl();

export async function initializeOverlay(): Promise<OverlayService> {
  // The service is initialized and ready to use
  return overlayService;
}

export async function cleanupOverlays(): Promise<void> {
  console.log('Cleaning up overlay windows...');
  await overlayService.closeAllOverlays();
}