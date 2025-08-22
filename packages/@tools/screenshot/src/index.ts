// packages/@tools/screenshot/src/index.ts
import { ScreenshotInputSchema, ScreenshotOutputSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';
import type { ToolInputField, ToolOutputField } from '@app/types';
import { nativeImage } from 'electron';
import screenshot from 'screenshot-desktop';

// Type aliases for convenience
type ScreenshotInput = z.infer<typeof ScreenshotInputSchema>;
type ScreenshotOutput = z.infer<typeof ScreenshotOutputSchema>;
type ScreenshotResult = ToolResult<typeof ScreenshotOutputSchema>;

export class ScreenshotTool extends Tool<typeof ScreenshotInputSchema, typeof ScreenshotOutputSchema> {
  id = 'screenshot' as const;
  name = 'Screenshot Tool';
  description = 'Capture a screenshot of a specific screen region';
  category = 'Image';

  inputSchema = ScreenshotInputSchema;
  outputSchema = ScreenshotOutputSchema;

  examples = [
    {
      name: 'Full HD Area',
      description: 'Capture a 1920x1080 area from top-left corner',
      inputs: {
        top: 0,
        left: 0,
        width: 1920,
        height: 1080
      }
    },
    {
      name: 'Small Window',
      description: 'Capture a typical small window area',
      inputs: {
        top: 100,
        left: 100,
        width: 800,
        height: 600
      }
    },
    {
      name: 'Use Region Selector',
      description: 'Use coordinates from the most recent region selector step',
      inputs: {
        top: { $ref: '{{previous:screen-region-selector.top}}' },
        left: { $ref: '{{previous:screen-region-selector.left}}' },
        width: { $ref: '{{previous:screen-region-selector.width}}' },
        height: { $ref: '{{previous:screen-region-selector.height}}' }
      }
    },
    {
      name: 'Use Previous Step',
      description: 'Use coordinates from the immediately previous step (if it returns coordinates)',
      inputs: {
        top: { $ref: '{{previous.top}}' },
        left: { $ref: '{{previous.left}}' },
        width: { $ref: '{{previous.width}}' },
        height: { $ref: '{{previous.height}}' }
      }
    }
  ];

  async initialize() { }

  async executeValidated(input: ScreenshotInput): Promise<ScreenshotResult> {
    // Capture full screen at native resolution
    const imgBuffer = await screenshot({ format: 'png' });

    // Convert buffer to nativeImage for cropping
    const fullImage = nativeImage.createFromBuffer(imgBuffer);

    // Crop the image
    const croppedImage = fullImage.crop({
      x: input.left,
      y: input.top,
      width: input.width,
      height: input.height,
    });

    const dataURL = croppedImage.toDataURL();
    const imageSize = croppedImage.getSize();

    const result: ScreenshotOutput = {
      image: dataURL,
      metadata: {
        width: imageSize.width,
        height: imageSize.height,
        region: {
          top: input.top,
          left: input.left,
          width: input.width,
          height: input.height
        },
        timestamp: Date.now()
      }
    };

    return {
      success: true,
      data: result
    };
  }
}

