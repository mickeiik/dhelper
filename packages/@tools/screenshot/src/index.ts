// packages/@tools/screenshot/src/index.ts
import { Tool, ToolInputField } from '@app/types';
import { nativeImage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import screenshot from 'screenshot-desktop';

export type ScreenshotToolInput = {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type ScreenshotToolOutput = string;

export class ScreenshotTool implements Tool {
  id = 'screenshot' as const;
  name = 'Screenshot Tool';
  description = 'Capture a screenshot of a specific screen region';
  category = 'Image';

  inputFields: ToolInputField[] = [
    {
      name: 'top',
      type: 'number',
      description: 'Y coordinate of the top-left corner',
      required: true,
      example: 100
    },
    {
      name: 'left',
      type: 'number',
      description: 'X coordinate of the top-left corner',
      required: true,
      example: 100
    },
    {
      name: 'width',
      type: 'number',
      description: 'Width of the area to capture',
      required: true,
      example: 800
    },
    {
      name: 'height',
      type: 'number',
      description: 'Height of the area to capture',
      required: true,
      example: 600
    }
  ];

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
      name: 'Use Previous Step',
      description: 'Use output from screen-region-selector step',
      inputs: { $ref: 'region-step-id' }
    }
  ];

  async initialize(inputs: any) { }

  async execute(input: ScreenshotToolInput): Promise<ScreenshotToolOutput> {
    try {
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

      // Save debug file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const outputPath = path.join(__dirname, 'screenshot.png');
      fs.writeFileSync(outputPath, croppedImage.toPNG());
      console.log(`Screenshot saved to: ${outputPath}`);

      return croppedImage.toDataURL();

    } catch (error) {
      throw new Error(`Failed to capture screenshot: ${error}`);
    }
  }
}

// Self-register types for autocomplete
declare module '@app/tools' {
  interface ToolRegistry {
    'screenshot': {
      input: ScreenshotToolInput;
      output: ScreenshotToolOutput;
    };
  }
}