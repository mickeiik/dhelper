// packages/types/src/overlay.ts
// Basic geometric and overlay types are now defined in @app/schemas with Zod validation
// Import schemas where needed and infer types directly instead of duplicating here

export interface OverlayService {
  createOverlay(options?: any): Promise<OverlayWindow>;
}

export interface OverlayWindow {
  readonly id: string;
  
  // Drawing methods
  drawShapes(shapes: any[]): Promise<void>;
  drawText(texts: any[]): Promise<void>;
  clear(): Promise<void>;
  
  // Interaction
  onMouseClick(callback: (point: any) => void): void;
  onMouseMove(callback: (point: any) => void): void;
  onKeyPress(callback: (key: string) => void): void;
  
  // Lifecycle
  show(): Promise<void>;
  hide(): Promise<void>;
  close(): Promise<void>;
  
  // Properties
  isVisible(): boolean;
  getBounds(): any;
}

// Events for IPC communication
export interface OverlayEvents {
  'overlay-mouse-click': { overlayId: string; point: any };
  'overlay-mouse-move': { overlayId: string; point: any };
  'overlay-key-press': { overlayId: string; key: string };
  'overlay-closed': { overlayId: string };
}

// Common overlay styles
export const OVERLAY_STYLES = {
  SUCCESS: { color: '#00ff00', lineWidth: 2 },
  WARNING: { color: '#ffaa00', lineWidth: 2 },
  ERROR: { color: '#ff0000', lineWidth: 2 },
  INFO: { color: '#0099ff', lineWidth: 2 },
  HIGHLIGHT: { color: '#ffff00', fillColor: 'rgba(255, 255, 0, 0.2)', lineWidth: 3 },
  SELECTION: { color: '#00ff00', lineDash: [5, 5], lineWidth: 2 }
} as const;