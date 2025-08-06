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
    const handleMouseClick = (event: Electron.IpcMainEvent, data: any) => {
      if (event.sender.id === this.window.webContents.id) {
        const point: Point = { x: data.x, y: data.y };
        this.mouseClickCallbacks.forEach(cb => cb(point));
      }
    };

    const handleMouseMove = (event: Electron.IpcMainEvent, data: any) => {
      if (event.sender.id === this.window.webContents.id) {
        const point: Point = { x: data.x, y: data.y };
        this.mouseMoveCallbacks.forEach(cb => cb(point));
      }
    };

    const handleKeyPress = (event: Electron.IpcMainEvent, data: any) => {
      if (event.sender.id === this.window.webContents.id) {
        this.keyPressCallbacks.forEach(cb => cb(data.key));
      }
    };

    ipcMain.on(`overlay-mouse-click-${this.id}`, handleMouseClick);
    ipcMain.on(`overlay-mouse-move-${this.id}`, handleMouseMove);
    ipcMain.on(`overlay-key-press-${this.id}`, handleKeyPress);

    // Clean up when window is closed
    this.window.on('closed', () => {
      ipcMain.removeListener(`overlay-mouse-click-${this.id}`, handleMouseClick);
      ipcMain.removeListener(`overlay-mouse-move-${this.id}`, handleMouseMove);
      ipcMain.removeListener(`overlay-key-press-${this.id}`, handleKeyPress);
    });
  }

  async drawShapes(shapes: OverlayShape[]): Promise<void> {
    console.log('Shapes:', shapes)
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
    console.log('Primary display overlay bounds:', bounds);

    // Create overlay window
    const window = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      transparent: options.transparent !== false, // Default to true
      frame: false,
      alwaysOnTop: options.alwaysOnTop !== false, // Default to true
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      focusable: !options.clickThrough, // If click-through, don't focus
      show: false, // Start hidden
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    // Force the window to the exact bounds after creation
    window.setBounds(bounds);

    // Set click-through if requested
    if (options.clickThrough) {
      window.setIgnoreMouseEvents(true, { forward: true });
    }

    // Load the overlay HTML
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    const overlayHtmlPath = join(__dirname, '..', '..', 'overlay', 'overlay.html');
    console.log('Loading overlay HTML from:', overlayHtmlPath);
    await window.loadFile(overlayHtmlPath);

    // Send initialization data to overlay
    window.webContents.once('dom-ready', () => {
      window.webContents.send('overlay-init', {
        id: overlayId,
        options: {
          showInstructions: options.showInstructions,
          instructionText: options.instructionText,
          timeout: options.timeout
        }
      });
    });

    // Handle auto-close timeout
    if (options.timeout && options.timeout > 0) {
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.close();
        }
      }, options.timeout);
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