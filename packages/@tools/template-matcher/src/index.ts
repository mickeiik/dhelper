import { TemplateMatcherInputSchema, TemplateMatcherOutputSchema, TemplateMatchResultSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';
import type { OverlayService } from '@app/overlay';
import { OverlayShapeSchema, OverlayTextSchema } from '@app/schemas';
import { OVERLAY_STYLES } from '@app/overlay';
import screenshot from 'screenshot-desktop';

// Configure OpenCV before importing opencv4nodejs
import { join } from 'node:path';

if (process.env.NODE_ENV !== 'development') {
  const resourcesPath = process.resourcesPath;
  const opencvPath = join(resourcesPath, 'opencv');

  process.env.OPENCV4NODEJS_DISABLE_AUTOBUILD = '1';
  process.env.OPENCV_INCLUDE_DIR = join(opencvPath, 'include');
  process.env.OPENCV_LIB_DIR = join(opencvPath, 'lib');
  process.env.OPENCV_BIN_DIR = join(opencvPath, 'bin');
}

import cv from '@u4/opencv4nodejs';
import { screen } from 'electron';

// Type aliases for convenience
type TemplateMatcherInput = z.infer<typeof TemplateMatcherInputSchema>;
type TemplateMatcherOutput = z.infer<typeof TemplateMatcherOutputSchema>;
type TemplateMatcherResult = ToolResult<typeof TemplateMatcherOutputSchema>;
type OverlayShape = z.infer<typeof OverlayShapeSchema>;
type OverlayText = z.infer<typeof OverlayTextSchema>;

export class TemplateMatcherTool extends Tool<typeof TemplateMatcherInputSchema, typeof TemplateMatcherOutputSchema> {
  id = 'template-matcher' as const;
  name = 'Template Matcher Tool';
  description = 'Find specific template matches on the current screen using multi-scale OpenCV template matching. Requires template IDs and automatically handles different screen resolutions (1080p, 1440p, 4K)';
  category = 'Computer Vision';

  inputSchema = TemplateMatcherInputSchema;
  outputSchema = TemplateMatcherOutputSchema;

  private overlayService?: OverlayService;

  examples = [

  ];

  async initialize(context: any) {
    // opencv4nodejs is ready to use immediately

    // Store overlay service for visual indicators
    this.overlayService = context.overlayService;

    return;
  }

  async executeValidated(input: TemplateMatcherInput): Promise<TemplateMatcherResult> {
    let screenMat: cv.Mat | null = null;
    let match: TemplateMatcherOutput | null = null;

    try {
      // Get screen image by capturing current screen
      const screenImage = await this.captureCurrentScreen();

      // Load and process the screen image
      screenMat = this.loadImage(screenImage);

      if (!screenMat) {
        throw new Error('Failed to capture or load screen image for template matching');
      }

      let templateMat: cv.Mat | null = null;
      try {
        templateMat = await this.loadImage(input.image);

        if (!templateMat) throw Error('Could not load template image')

        match = await this.matchTemplate(
          screenMat,
          templateMat,
        );

      } catch (error) {
        console.warn(`Failed to match template`, error);
      }

      // Show visual indicators if requested
      if (input.showVisualIndicators && match) {
        await this.showVisualIndicators(match, input.overlayTimeout);
      }

      if (match) {
        return {
          success: true,
          data: match
        };
      }

      return {
        success: false,
        error: {
          message: 'Could not match template',
          code: 'TOOL_EXECUTION_ERROR'
        }
      }
    } finally {
      // Cleanup screen image Mat to prevent memory leaks
      if (screenMat) {
        try {
          screenMat.release();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private async captureCurrentScreen(): Promise<Buffer> {
    const imgBuffer = await screenshot({ format: 'png' });
    return imgBuffer;
  }

  private loadImage(imageInput: string | Buffer): cv.Mat | null {
    let imageMat: cv.Mat | null = null;

    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:')) {
        // Base64 data URL
        const base64Data = imageInput.split(',')[1];
        const imageData = Buffer.from(base64Data, 'base64');
        imageMat = cv.imdecode(imageData);
      } else {
        // File path
        imageMat = cv.imread(imageInput);
      }
    } else {
      // Buffer
      imageMat = cv.imdecode(imageInput);
    }

    if (imageMat) {
      const size = imageMat.sizes;
    }

    return imageMat;
  }

  private getCurrentResolution(): string {
    const primaryDisplay = screen.getPrimaryDisplay();
    return `${primaryDisplay.bounds.width}x${primaryDisplay.bounds.height}`;
  }

  private async matchTemplate(
    screenMat: cv.Mat,
    templateMat: cv.Mat,
  ): Promise<TemplateMatcherOutput> {
    let matchResult;
    try {
      // Search on full screen (no region restriction)
      const searchMat = screenMat;

      const templateSize = templateMat.sizes;
      const width = templateSize[1];
      const height = templateSize[0];

      // Perform template matching using normalized cross correlation
      matchResult = searchMat.matchTemplate(templateMat, cv.TM_CCOEFF_NORMED);

      // Find min/max locations and values
      const minMaxLoc = matchResult.minMaxLoc();

      return {
        confidence: minMaxLoc.maxVal,
        location: {
          x: minMaxLoc.maxLoc.x,
          y: minMaxLoc.maxLoc.y,
          width: width,
          height: height
        }
      }
    } catch (error) {
      throw error;
    } finally {
      // Cleanup temporary Mat objects
      if (matchResult) {
        try {
          matchResult.release();
        } catch {
          // Fallback: ignore cleanup errors
        }
      }
      // Cleanup scaled template if it's different from original
      if (templateMat) {
        try {
          templateMat.release();
        } catch {
          // Fallback: ignore cleanup errors
        }
      }
    }
  }

  private async showVisualIndicators(result: TemplateMatcherOutput, timeout: number): Promise<void> {
    if (!this.overlayService) {
      console.warn('[Template Matcher] Overlay service not available, skipping visual indicators');
      return;
    }

    // Create overlay window
    const overlay = await this.overlayService.createOverlay({
      transparent: true,
      alwaysOnTop: true,
      showInstructions: true,
      instructionText: `Found template match`,
      timeout: timeout,
      clickThrough: false
    });

    const { location, confidence } = result;
    // Location already has correct {x, y, width, height} format
    const rectForScreen = {
      x: location.x,
      y: location.y,
      width: location.width,
      height: location.height
    };
    const screenDipRect = screen.screenToDipRect(null, rectForScreen)

    // Create rectangle shape for each match
    const shape: OverlayShape = {
      id: `match`,
      type: 'rectangle',
      bounds: screenDipRect,
      style: {
        ...OVERLAY_STYLES.HIGHLIGHT,
        color: confidence > 0.9 ? '#00ff00' : confidence > 0.8 ? '#ffaa00' : '#ff8800',
        lineWidth: 3,
        fillColor: confidence > 0.9 ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 170, 0, 0.1)'
      },
      label: `Match`,
      labelPosition: 'top'
    };

    // Add confidence text
    const text: OverlayText = {
      id: `confidence`,
      text: `${Math.round(confidence * 100)}%`,
      position: {
        x: rectForScreen.x + rectForScreen.width + 5,
        y: rectForScreen.y + 20
      },
      style: {
        color: '#ffffff',
        fontSize: 14,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      backgroundColor: 'rgba(26, 26, 26, 0.9)',
      padding: 6,
      borderRadius: 4
    };

    // Draw shapes and text
    await overlay.drawShapes([shape]);
    await overlay.drawText([text]);

    // Show the overlay
    await overlay.show();
  }
}

