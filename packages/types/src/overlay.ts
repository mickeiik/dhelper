// packages/types/src/overlay.ts

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayStyle {
  color?: string;
  fillColor?: string;
  lineWidth?: number;
  lineDash?: number[];
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface OverlayShape {
  id?: string;
  type: 'rectangle' | 'circle' | 'crosshair' | 'point';
  bounds: Rectangle;
  style?: OverlayStyle;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface OverlayText {
  id?: string;
  text: string;
  position: Point;
  style?: OverlayStyle;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

export interface OverlayOptions {
  bounds?: Rectangle; // If not provided, uses full screen
  transparent?: boolean;
  alwaysOnTop?: boolean;
  timeout?: number; // Auto-close timeout in ms
  clickThrough?: boolean; // Allow clicks to pass through
  showInstructions?: boolean;
  instructionText?: string;
}

export interface OverlayService {
  createOverlay(options?: OverlayOptions): Promise<OverlayWindow>;
}

export interface OverlayWindow {
  readonly id: string;
  
  // Drawing methods
  drawShapes(shapes: OverlayShape[]): Promise<void>;
  drawText(texts: OverlayText[]): Promise<void>;
  clear(): Promise<void>;
  
  // Interaction
  onMouseClick(callback: (point: Point) => void): void;
  onMouseMove(callback: (point: Point) => void): void;
  onKeyPress(callback: (key: string) => void): void;
  
  // Lifecycle
  show(): Promise<void>;
  hide(): Promise<void>;
  close(): Promise<void>;
  
  // Properties
  isVisible(): boolean;
  getBounds(): Rectangle;
}

// Events for IPC communication
export interface OverlayEvents {
  'overlay-mouse-click': { overlayId: string; point: Point };
  'overlay-mouse-move': { overlayId: string; point: Point };
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