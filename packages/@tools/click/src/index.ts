import type { Tool, ToolInputField, ToolInitContext, OverlayService, OverlayShape } from '@app/types';
import { OVERLAY_STYLES } from '@app/types';
import { mouse, Button, sleep } from '@nut-tree-fork/nut-js';

export interface ClickToolInput {
  // Position input (either point OR region)
  x?: number;
  y?: number;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Click configuration
  button?: 'left' | 'right' | 'middle';
  clicks?: number;     // Single, double, triple click
  delay?: number;      // Delay between multiple clicks (ms)

  // Visual feedback
  showVisualIndicator?: boolean;
  indicatorTimeout?: number;
}

export interface ClickToolOutput {
  success: boolean;
  clickedAt: {
    x: number;
    y: number;
  };
  error?: string;
}

export class ClickTool implements Tool {
  id = 'click' as const;
  name = 'Click Tool';
  description = 'Click at screen positions with multiple click methods and input types';
  category = 'Input';

  private overlayService?: OverlayService;

  inputFields: ToolInputField[] = [
    {
      name: 'x',
      type: 'number',
      description: 'X coordinate to click',
      required: false,
      example: 500
    },
    {
      name: 'y',
      type: 'number',
      description: 'Y coordinate to click',
      required: false,
      example: 300
    },
    {
      name: 'region',
      type: 'object',
      description: 'Region to click in the center of',
      required: false,
      example: { x: 100, y: 100, width: 200, height: 100 }
    },
    {
      name: 'button',
      type: 'string',
      description: 'Mouse button to click (left, middle or right)',
      required: false,
      defaultValue: 'left',
      example: 'left'
    },
    {
      name: 'clicks',
      type: 'number',
      description: 'Number of clicks',
      required: false,
      defaultValue: 1,
      example: 1
    },
    {
      name: 'delay',
      type: 'number',
      description: 'Delay between clicks in milliseconds',
      required: false,
      defaultValue: 100,
      example: 100
    },
    {
      name: 'showVisualIndicator',
      type: 'boolean',
      description: 'Show visual indicator at click location',
      required: false,
      defaultValue: true
    },
    {
      name: 'indicatorTimeout',
      type: 'number',
      description: 'How long to show visual indicator (ms)',
      required: false,
      defaultValue: 2000,
      example: 2000
    }
  ];

  examples = [
    {
      name: 'Simple Click',
      description: 'Click at specific coordinates',
      inputs: {
        x: 500,
        y: 300,
        showVisualIndicator: true
      }
    },
    {
      name: 'Click in Region Center',
      description: 'Click in the center of a region',
      inputs: {
        region: { x: 100, y: 100, width: 200, height: 100 },
      }
    },
    {
      name: 'Double Click',
      description: 'Perform a double click',
      inputs: {
        x: 400,
        y: 250,
        clicks: 2,
        delay: 50
      }
    },
    {
      name: 'Right Click',
      description: 'Perform a right click',
      inputs: {
        x: 600,
        y: 400,
        button: 'right'
      }
    },
    {
      name: 'Click Template Match Result',
      description: 'Click on a template match result from previous step',
      inputs: {
        region: {
          x: { $ref: '{{previous:template-matcher.location.x}}' },
          y: { $ref: '{{previous:template-matcher.location.y}}' },
          width: { $ref: '{{previous:template-matcher.location.width}}' },
          height: { $ref: '{{previous:template-matcher.location.height}}' }
        }
      }
    },
    {
      name: 'Click Selected Region',
      description: 'Click in the center of a region selected with screen-region-selector',
      inputs: {
        region: {
          x: { $ref: '{{previous:screen-region-selector.left}}' },
          y: { $ref: '{{previous:screen-region-selector.top}}' },
          width: { $ref: '{{previous:screen-region-selector.width}}' },
          height: { $ref: '{{previous:screen-region-selector.height}}' }
        }
      }
    }
  ];

  async initialize(context: ToolInitContext) {
    this.overlayService = context.overlayService;
    return;
  }

  async execute(input: ClickToolInput): Promise<ClickToolOutput> {
    try {
      // Determine click position
      const position = this.calculateClickPosition(input);
      if (!position) {
        throw new Error('No valid position provided. Use either x,y coordinates or region.');
      }

      // Get click configuration
      const button = this.getMouseButton(input.button || 'left');
      const clicks = Math.max(1, Math.min(10, input.clicks || 1)); // Limit clicks 1-10
      const delay = Math.max(10, input.delay || 100); // Minimum 10ms delay

      // Show visual indicator before clicking
      if (input.showVisualIndicator !== false) {
        await this.showVisualIndicator(position, input.indicatorTimeout || 2000);
      }

      // Perform the click using selected method
      await this.performClick(position, button, clicks, delay);

      return {
        success: true,
        clickedAt: position,
      };

    } catch (error) {
      return {
        success: false,
        clickedAt: { x: 0, y: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private calculateClickPosition(input: ClickToolInput): { x: number; y: number } | null {
    if (input.x !== undefined && input.y !== undefined) {
      return { x: input.x, y: input.y };
    }

    if (input.region) {
      return {
        x: input.region.x + Math.floor(input.region.width / 2),
        y: input.region.y + Math.floor(input.region.height / 2)
      };
    }

    return null;
  }

  private getMouseButton(button: string): Button {
    switch (button.toLowerCase()) {
      case 'right': return Button.RIGHT;
      case 'middle': return Button.MIDDLE;
      case 'left':
      default: return Button.LEFT;
    }
  }

  private async performClick(
    position: { x: number; y: number },
    button: Button,
    clicks: number,
    delay: number
  ): Promise<void> {
    await this.clickDefault(position, button, clicks, delay);
  }

  private async clickDefault(
    position: { x: number; y: number },
    button: Button,
    clicks: number,
    delay: number
  ): Promise<void> {
    // Move to position and click
    await mouse.setPosition({ x: position.x, y: position.y });
    await sleep(50);

    for (let i = 0; i < clicks; i++) {
      await mouse.pressButton(button);
      await mouse.releaseButton(button);
      if (i < clicks - 1) {
        await sleep(delay);
      }
    }
  }

  private async showVisualIndicator(
    position: { x: number; y: number },
    timeout: number
  ): Promise<void> {
    if (!this.overlayService) {
      console.warn('[Click Tool] Overlay service not available, skipping visual indicator');
      return;
    }

    try {
      // Create overlay window
      const overlay = await this.overlayService.createOverlay({
        showInstructions: false,
        timeout: timeout,
        clickThrough: true
      });

      // Create crosshair and circle at click position
      const indicatorSize = 20;
      const shapes: OverlayShape[] = [
        // Circle
        {
          id: 'click-circle',
          type: 'rectangle',
          bounds: {
            x: position.x - indicatorSize / 2,
            y: position.y - indicatorSize / 2,
            width: indicatorSize,
            height: indicatorSize
          },
          style: {
            ...OVERLAY_STYLES.HIGHLIGHT,
            color: '#ff0000',
            lineWidth: 3,
            fillColor: 'rgba(255, 0, 0, 0.2)'
          },
          label: 'Click Target',
          labelPosition: 'top'
        }
      ];

      // Crosshair lines
      shapes.push(
        // Horizontal line
        {
          id: 'click-line-h',
          type: 'rectangle',
          bounds: {
            x: position.x - 10,
            y: position.y - 1,
            width: 20,
            height: 2
          },
          style: {
            color: '#ff0000',
            lineWidth: 2,
            fillColor: '#ff0000'
          }
        },
        // Vertical line
        {
          id: 'click-line-v',
          type: 'rectangle',
          bounds: {
            x: position.x - 1,
            y: position.y - 10,
            width: 2,
            height: 20
          },
          style: {
            color: '#ff0000',
            lineWidth: 2,
            fillColor: '#ff0000'
          }
        }
      );

      // Draw shapes
      await overlay.drawShapes(shapes);

      // Show the overlay
      await overlay.show();

    } catch (error) {
      console.error('[Click Tool] Failed to show visual indicator:', error);
    }
  }
}