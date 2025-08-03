import { Tool } from '@app/tools';
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
  id = 'screenshot'
  name = 'Screenshot Tool'

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