import type { OverlayService } from '@app/overlay';
import { OVERLAY_STYLES } from '@app/overlay';
import { OverlayShapeSchema, ClickInputSchema, ClickOutputSchema, ToolResult, PointSchema } from '@app/schemas';
import { mouse, Button, sleep } from '@nut-tree-fork/nut-js';
import { Tool } from '@app/tools';
import { z } from 'zod';

// Type aliases for convenience
type ClickToolInput = z.infer<typeof ClickInputSchema>;
type ClickToolOutput = z.infer<typeof ClickOutputSchema>;
type ClickResult = ToolResult<typeof ClickOutputSchema>;
type OverlayShape = z.infer<typeof OverlayShapeSchema>;
export class ClickTool extends Tool<typeof ClickInputSchema, typeof ClickOutputSchema> {
  id = 'click' as const;
  name = 'Click Tool';
  description = 'Click at screen positions with multiple click methods and input types';
  category = 'Input';

  inputSchema = ClickInputSchema;
  outputSchema = ClickOutputSchema;

  private overlayService?: OverlayService;

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
          x: { $ref: '{{previous:screen-region-selector.x}}' },
          y: { $ref: '{{previous:screen-region-selector.y}}' },
          width: { $ref: '{{previous:screen-region-selector.width}}' },
          height: { $ref: '{{previous:screen-region-selector.height}}' }
        }
      }
    }
  ];

  async initialize(context: any) {
    this.overlayService = context.overlayService;
    return;
  }

  async executeValidated(input: ClickToolInput): Promise<ClickResult> {
    // Determine click position
    const position = this.calculateClickPosition(input);

    // Get click configuration
    const button = this.getMouseButton(input.button);

    // Show visual indicator before clicking
    if (input.showVisualIndicator !== false) {
      await this.showVisualIndicator(position, input.indicatorTimeout);
    }

    // Perform the click using selected method
    await this.clickDefault(position, button, input.clicks, input.delay);

    return {
      success: true,
      data: position // Return the clicked position {x, y}
    };
  }

  private calculateClickPosition(input: ClickToolInput): ClickToolOutput {
    const isRectangle = 'width' in input;

    if (isRectangle) {
      return {
        x: input.x + Math.floor(input.width / 2),
        y: input.y + Math.floor(input.height / 2)
      };
    }

    return { x: input.x, y: input.y };
  }

  private getMouseButton(button: string): Button {
    switch (button.toLowerCase()) {
      case 'right': return Button.RIGHT;
      case 'middle': return Button.MIDDLE;
      case 'left':
      default: return Button.LEFT;
    }
  }

  private async clickDefault(
    position: z.infer<typeof PointSchema>,
    button: Button,
    clicks: number,
    delay: number
  ): Promise<void> {
    // Move to position and click
    await mouse.setPosition(position);
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
    position: z.infer<typeof PointSchema>,
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