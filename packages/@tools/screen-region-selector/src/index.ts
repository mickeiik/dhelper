import { ScreenRegionSelectorInputSchema, ScreenRegionSelectorOutputUnionSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';
import type { OverlayService, OverlayWindow } from '@app/overlay';
import { OverlayShapeSchema, OverlayTextSchema, PointSchema } from '@app/schemas';
import { OVERLAY_STYLES } from '@app/overlay';
import { screen } from 'electron';

// Type aliases for convenience
type ScreenRegionSelectorInput = z.infer<typeof ScreenRegionSelectorInputSchema>;
type ScreenRegionSelectorOutput = z.infer<typeof ScreenRegionSelectorOutputUnionSchema>;
type ScreenRegionSelectorResult = ToolResult<typeof ScreenRegionSelectorOutputUnionSchema>;
type OverlayShape = z.infer<typeof OverlayShapeSchema>;
type OverlayText = z.infer<typeof OverlayTextSchema>;
type Point = z.infer<typeof PointSchema>;

export class ScreenRegionSelectorTool extends Tool<typeof ScreenRegionSelectorInputSchema, typeof ScreenRegionSelectorOutputUnionSchema> {
  id = 'screen-region-selector' as const;
  name = 'Screen Region Selector';
  description = 'Interactive tool to select a point or rectangle area on the screen';
  category = 'Input';

  inputSchema = ScreenRegionSelectorInputSchema;
  outputSchema = ScreenRegionSelectorOutputUnionSchema;

  private overlayService?: OverlayService;
  private selectionPromise?: {
    resolve: (value: ScreenRegionSelectorOutput) => void;
    reject: (error: Error) => void;
    cleanup?: () => void;
  };

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
      description: 'Select a specific point on screen',
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

  async initialize(context: any) {
    this.overlayService = context.overlayService;
    return;
  }

  async executeValidated(input: ScreenRegionSelectorInput): Promise<ScreenRegionSelectorResult> {
    if (!this.overlayService) {
      throw new Error('Overlay service not available for screen region selection');
    }

    // Normalize mode - handle both 'rectangle' and 'region' for backward compatibility
    const normalizedMode = (input.mode === 'region' ? 'rectangle' : input.mode) as 'point' | 'rectangle';

    // Create overlay for selection
    const overlay = await this.overlayService.createOverlay({
      showInstructions: true,
      instructionText: normalizedMode === 'point'
        ? 'Click to select a point on screen. Press ESC to cancel.'
        : 'Click and drag to select a rectangle area. Press ESC to cancel.',
      timeout: input.timeout,
      clickThrough: false // Allow interaction
    });

    // Setup crosshairs for visual feedback
    await this.setupCrosshairs(overlay);

    // Show the overlay
    await overlay.show();

    // Add a small delay to ensure overlay is fully ready
    await new Promise(resolve => setTimeout(resolve, 200));

    // Handle selection based on mode
    const result = await this.handleSelection(overlay, normalizedMode, input.timeout);

    // Hide overlay
    await overlay.hide();

    return {
      success: true,
      data: result
    };
  }

  private async setupCrosshairs(overlay: OverlayWindow): Promise<void> {
    // Add crosshair indicators (will follow mouse via overlay service)
    const shapes: OverlayShape[] = [];
    // const texts: OverlayText[] = [];

    // Initial crosshair setup - the overlay service should handle mouse tracking
    shapes.push({
      id: 'crosshair-horizontal',
      type: 'rectangle',
      bounds: { x: 0, y: 100, width: screen.getPrimaryDisplay().bounds.width, height: 2 },
      style: {
        color: '#00ff00',
        lineWidth: 1,
        fillColor: '#00ff00'
      }
    });

    shapes.push({
      id: 'crosshair-vertical',
      type: 'rectangle',
      bounds: { x: 100, y: 0, width: 2, height: screen.getPrimaryDisplay().bounds.height },
      style: {
        color: '#00ff00',
        lineWidth: 1,
        fillColor: '#00ff00'
      }
    });

    await overlay.drawShapes(shapes);
  }

  private async handleSelection(overlay: OverlayWindow, mode: 'point' | 'rectangle', timeout: number): Promise<ScreenRegionSelectorOutput> {
    return new Promise((resolve, reject) => {
      this.selectionPromise = { resolve, reject };

      let timeoutId: NodeJS.Timeout;
      let isSelecting = false;
      let startPoint: Point | null = null;
      let currentMousePos: Point = { x: 0, y: 0 };

      // Setup timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Selection timeout'));
        }, timeout);
      }

      // Cleanup function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (this.selectionPromise) {
          this.selectionPromise = undefined;
        }
      };

      const updateVisuals = async () => {
        try {
          // Update crosshairs position
          const shapes: OverlayShape[] = [
            {
              id: 'crosshair-horizontal',
              type: 'rectangle',
              bounds: { x: 0, y: currentMousePos.y - 1, width: screen.getPrimaryDisplay().bounds.width, height: 2 },
              style: {
                ...OVERLAY_STYLES.SUCCESS,
                lineWidth: 1,
                fillColor: '#00ff00'
              }
            },
            {
              id: 'crosshair-vertical',
              type: 'rectangle',
              bounds: { x: currentMousePos.x - 1, y: 0, width: 2, height: screen.getPrimaryDisplay().bounds.height },
              style: {
                ...OVERLAY_STYLES.SUCCESS,
                lineWidth: 1,
                fillColor: '#00ff00'
              }
            },
            // Center dot
            {
              id: 'crosshair-center',
              type: 'rectangle',
              bounds: { x: currentMousePos.x - 3, y: currentMousePos.y - 3, width: 6, height: 6 },
              style: {
                ...OVERLAY_STYLES.SUCCESS,
                lineWidth: 2,
                fillColor: '#00ff00'
              }
            }
          ];

          // If selecting rectangle, add selection rectangle
          if (isSelecting && startPoint) {
            const width = currentMousePos.x - startPoint.x;
            const height = currentMousePos.y - startPoint.y;

            shapes.push({
              id: 'selection-rect',
              type: 'rectangle',
              bounds: {
                x: Math.min(startPoint.x, currentMousePos.x),
                y: Math.min(startPoint.y, currentMousePos.y),
                width: Math.abs(width),
                height: Math.abs(height)
              },
              style: {
                color: OVERLAY_STYLES.SELECTION.color,
                lineWidth: OVERLAY_STYLES.SELECTION.lineWidth,
                lineDash: [...OVERLAY_STYLES.SELECTION.lineDash],
                fillColor: 'rgba(0, 255, 0, 0.1)'
              },
              label: `${Math.abs(width)} × ${Math.abs(height)}`,
              labelPosition: 'center'
            });
          }

          await overlay.drawShapes(shapes);

          // Update coordinates text
          const texts: OverlayText[] = [
            {
              id: 'coordinates',
              text: `Mouse: (${currentMousePos.x}, ${currentMousePos.y})`,
              position: { x: currentMousePos.x + 10, y: currentMousePos.y - 20 },
              style: {
                color: '#ffffff',
                fontSize: 12,
                fontFamily: 'Courier New, monospace'
              },
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 6,
              borderRadius: 4
            }
          ];

          await overlay.drawText(texts);
        } catch (error) {
          console.error('Error updating visuals:', error);
        }
      };

      // Handle mouse click
      overlay.onMouseClick((point: Point) => {
        if (mode === 'point') {
          // Point mode - immediate selection
          cleanup();
          const screenPoint = screen.dipToScreenPoint(point)
          resolve({ x: screenPoint.x, y: screenPoint.y });
        } else if (mode === 'rectangle') {
          if (!isSelecting) {
            // Rectangle mode - start selection
            isSelecting = true;
            startPoint = { x: point.x, y: point.y };
            updateVisuals();
          } else {
            // Rectangle mode - end selection
            if (!startPoint) return;

            const width = Math.abs(point.x - startPoint.x);
            const height = Math.abs(point.y - startPoint.y);

            if (width < 5 || height < 5) {
              // Too small, reset selection
              isSelecting = false;
              startPoint = null;
              updateVisuals();
              return;
            }

            const result = {
              x: Math.min(startPoint.x, point.x),
              y: Math.min(startPoint.y, point.y),
              width: width,
              height: height
            };
            cleanup();
            const screenRect = screen.dipToScreenRect(null, {
              x: result.x,
              y: result.y,
              width: result.width,
              height: result.height
            })

            resolve({
              x: screenRect.x,
              y: screenRect.y,
              width: screenRect.width,
              height: screenRect.height
            });
          }
        } else {
          console.warn(`[Screen Region Selector] Unknown mode: ${mode}`);
        }
      });

      // Handle mouse move
      overlay.onMouseMove((point: Point) => {
        currentMousePos = { x: point.x, y: point.y };
        updateVisuals();
      });

      // Handle key press
      overlay.onKeyPress((key: string) => {
        if (key === 'Escape') {
          cleanup();
          reject(new Error('Selection cancelled by user'));
        }
      });

      // Initial visual update
      updateVisuals();

      // Store cleanup for later use
      this.selectionPromise!.cleanup = cleanup;
    });
  }
}