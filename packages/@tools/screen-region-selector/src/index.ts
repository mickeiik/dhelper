// packages/@tools/screen-region-selector/src/index.ts
import type { Tool, ToolInputField } from '@app/types';
import { BrowserWindow, screen, ipcMain } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';

export interface ScreenRegionSelectorInput {
  mode: 'point' | 'rectangle';
  timeout?: number; // Optional timeout in milliseconds (default: 30000)
}

export interface PointSelection {
  x: number;
  y: number;
}

export interface RectangleSelection {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type ScreenRegionSelectorOutput = PointSelection | RectangleSelection;

export class ScreenRegionSelectorTool implements Tool {
  id = 'screen-region-selector' as const;
  name = 'Screen Region Selector';
  description = 'Interactive tool to select a point or rectangle area on the screen';
  category = 'Input';

  inputFields: ToolInputField[] = [
    {
      name: 'mode',
      type: 'select',
      description: 'Selection mode - point for single click, rectangle for area selection',
      required: true,
      defaultValue: 'rectangle',
      options: [
        { value: 'point', label: 'Point (single click)' },
        { value: 'rectangle', label: 'Rectangle (drag area)' }
      ]
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Maximum time to wait for user selection (milliseconds)',
      required: false,
      defaultValue: 30000,
      placeholder: '30000'
    }
  ];

  examples = [
    {
      name: 'Select Rectangle Area',
      description: 'Most common use case - select a rectangular area on screen',
      inputs: {
        mode: 'rectangle',
        timeout: 30000
      }
    },
    {
      name: 'Select Single Point',
      description: 'Select a specific point on screen (e.g., for clicking)',
      inputs: {
        mode: 'point',
        timeout: 15000
      }
    }
  ];

  // Configure caching for this tool
  cacheConfig = {
    enabled: true,
    persistent: true, // Cache survives app restart
    ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  };

  private overlayWindow: BrowserWindow | null = null;

  async initialize() {
    return;
  }

  async execute(input: ScreenRegionSelectorInput): Promise<ScreenRegionSelectorOutput> {
    const timeout = input.timeout || 30000; // 30 second default timeout

    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const totalBounds = primaryDisplay.bounds;

      // Create overlay window
      this.overlayWindow = this.createOverlayWindow(totalBounds);

      // Setup selection handling
      const result = await this.handleSelection(input.mode, timeout);

      return result;
    } catch (error) {
      throw new Error(`Screen region selection failed: ${error}`);
    } finally {
      this.cleanup();
    }
  }

  private createOverlayWindow(bounds: { x: number, y: number, width: number, height: number }) {
    const __dirname = fileURLToPath(new URL('.', import.meta.url));

    const window = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      focusable: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    // Load the overlay HTML
    window.loadFile(join(__dirname, 'overlay.html'));

    return window;
  }

  private async handleSelection(mode: 'point' | 'rectangle', timeout: number): Promise<ScreenRegionSelectorOutput> {
    return new Promise((resolve, reject) => {
      if (!this.overlayWindow) {
        reject(new Error('Overlay window not created'));
        return;
      }

      let timeoutId: NodeJS.Timeout;
      const webContentsId = this.overlayWindow.webContents.id;

      // Setup timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          this.cleanup();
          reject(new Error('Selection timeout'));
        }, timeout);
      }

      // Setup IPC handlers
      const handleComplete = async (event: Electron.IpcMainEvent, data: any) => {
        if (event.sender.id === webContentsId) {
          if (timeoutId) clearTimeout(timeoutId);
          ipcMain.removeListener('selection-complete', handleComplete);
          ipcMain.removeListener('selection-cancelled', handleCancelled);

          if (!this.overlayWindow) {
            reject(new Error('Overlay window missing'));
            return;
          }

          const dipCursorPos = screen.getCursorScreenPoint();

          if ('width' in data && 'height' in data) {
            const width = data.width;
            const height = data.height;

            const rect = screen.dipToScreenRect(null, {
              height: height,
              width: width,
              x: dipCursorPos.x - width, // We are called when the rectangle selection ends
              y: dipCursorPos.y - height
            });

            resolve({
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height
            });
          } else {
            const screenPoint = screen.dipToScreenPoint(dipCursorPos)
            // Point selection — just return the cursor position
            resolve({ x: screenPoint.x, y: screenPoint.y });
          }
        }
      };


      const handleCancelled = (event: Electron.IpcMainEvent) => {
        if (event.sender.id === webContentsId) {
          if (timeoutId) clearTimeout(timeoutId);
          ipcMain.removeListener('selection-complete', handleComplete);
          ipcMain.removeListener('selection-cancelled', handleCancelled);
          reject(new Error('Selection cancelled by user'));
        }
      };

      ipcMain.on('selection-complete', handleComplete);
      ipcMain.on('selection-cancelled', handleCancelled);

      // Setup overlay window communication
      this.overlayWindow.webContents.once('dom-ready', () => {
        if (!this.overlayWindow) return;

        // Send mode to overlay
        this.overlayWindow.webContents.send('selection-mode', mode);
      });

      // Handle window close
      this.overlayWindow.on('closed', () => {
        if (timeoutId) clearTimeout(timeoutId);
        ipcMain.removeListener('selection-complete', handleComplete);
        ipcMain.removeListener('selection-cancelled', handleCancelled);
        reject(new Error('Selection window closed'));
      });
    });
  }

  private cleanup() {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      this.overlayWindow.close();
    }
    this.overlayWindow = null;
  }
}

// Self-register types for autocomplete
declare module '@app/tools' {
  interface ToolRegistry {
    'screen-region-selector': {
      input: ScreenRegionSelectorInput;
      output: ScreenRegionSelectorOutput;
    };
  }
}