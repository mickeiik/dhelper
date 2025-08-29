import { ScreenshotInputSchema, ScreenshotOutputSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';
import { nativeImage } from 'electron';
import screenshot from 'screenshot-desktop';

// Type aliases for convenience
type ScreenshotInput = z.output<typeof ScreenshotInputSchema>;
type ScreenshotOutput = z.infer<typeof ScreenshotOutputSchema>;
type ScreenshotResult = ToolResult<typeof ScreenshotOutputSchema>;

export class ScreenshotTool extends Tool<typeof ScreenshotInputSchema, typeof ScreenshotOutputSchema> {
  id = 'screenshot' as const;
  name = 'Screenshot Tool';
  description = 'Capture a screenshot of a specific screen region';
  category = 'image';

  inputSchema = ScreenshotInputSchema;
  outputSchema = ScreenshotOutputSchema;

  examples = [];

  async executeValidated(input: ScreenshotInput): Promise<ScreenshotResult> {
    // Capture full screen at native resolution
    const imgBuffer = await screenshot({ format: 'png' });

    // Convert buffer to nativeImage for cropping
    const fullImage = nativeImage.createFromBuffer(imgBuffer);

    // Crop the image
    const croppedImage = fullImage.crop({
      x: input.x,
      y: input.y,
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
          x: input.x,
          y: input.y,
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

