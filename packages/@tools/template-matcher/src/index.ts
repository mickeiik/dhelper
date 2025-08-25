import { TemplateMatcherInputSchema, TemplateMatcherOutputSchema, TemplateMatchResultSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';
import type { ToolInputField, ToolOutputField, ToolInitContext, OverlayService } from '@app/types';
import { OverlayShapeSchema, OverlayTextSchema } from '@app/schemas';
import { OVERLAY_STYLES } from '@app/types';
import type { TemplateMetadata } from '@app/types';
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
type TemplateMatchResult = z.infer<typeof TemplateMatchResultSchema>;

export class TemplateMatcherTool extends Tool<typeof TemplateMatcherInputSchema, typeof TemplateMatcherOutputSchema> {
  id = 'template-matcher' as const;
  name = 'Template Matcher Tool';
  description = 'Find specific template matches on the current screen using multi-scale OpenCV template matching. Requires template IDs and automatically handles different screen resolutions (1080p, 1440p, 4K)';
  category = 'Computer Vision';

  inputSchema = TemplateMatcherInputSchema;
  outputSchema = TemplateMatcherOutputSchema;

  private templateManager: import('@app/types').TemplateManager | undefined; // Will be injected during initialization
  private overlayService?: OverlayService;

  inputFields: ToolInputField[] = [
    {
      name: 'templateIds',
      type: 'array',
      description: 'Specific template IDs to match against',
      required: true,
      example: ['template-1', 'template-2']
    },
    {
      name: 'threshold',
      type: 'number',
      description: 'Minimum confidence threshold (0-1). Lower values may help find scaled templates.',
      required: false,
      defaultValue: 0.8,
      example: 0.7
    },
    {
      name: 'showVisualIndicators',
      type: 'boolean',
      description: 'Show visual indicators on screen highlighting the found matches',
      required: false,
      defaultValue: false,
      example: true
    },
    {
      name: 'overlayTimeout',
      type: 'number',
      description: 'Auto-dismiss visual overlay after specified milliseconds',
      required: false,
      defaultValue: 5000,
      example: 3000
    }
  ];

  outputFields: ToolOutputField[] = [
    {
      name: 'result',
      type: 'array',
      description: 'Array of template match results - each element contains templateId, confidence, location, and template metadata',
      example: [
        {
          templateId: 'login-button',
          confidence: 0.95,
          location: { x: 100, y: 200, width: 120, height: 40 },
          template: { id: 'login-button', name: 'Login Button', category: 'Buttons' }
        }
      ]
    },
    {
      name: 'result[].templateId',
      type: 'string',
      description: 'ID of the matched template',
      example: 'login-button'
    },
    {
      name: 'result[].confidence',
      type: 'number',
      description: 'Match confidence score (0-1, where 1 is perfect match)',
      example: 0.95
    },
    {
      name: 'result[].location',
      type: 'object',
      description: 'Location and dimensions of the match on screen',
      example: { x: 100, y: 200, width: 120, height: 40 }
    },
    {
      name: 'result[].location.x',
      type: 'number',
      description: 'X coordinate of top-left corner of the match',
      example: 100
    },
    {
      name: 'result[].location.y',
      type: 'number',
      description: 'Y coordinate of top-left corner of the match',
      example: 200
    },
    {
      name: 'result[].location.width',
      type: 'number',
      description: 'Width of the matched region',
      example: 120
    },
    {
      name: 'result[].location.height',
      type: 'number',
      description: 'Height of the matched region',
      example: 40
    },
    {
      name: 'result[].template',
      type: 'object',
      description: 'Template metadata including name, category, and other properties',
      example: { id: 'login-button', name: 'Login Button', category: 'Buttons' }
    },
    {
      name: 'result[].template.id',
      type: 'string',
      description: 'Template ID',
      example: 'login-button'
    },
    {
      name: 'result[].template.name',
      type: 'string',
      description: 'Human-readable template name',
      example: 'Login Button'
    },
    {
      name: 'result[].template.category',
      type: 'string',
      description: 'Template category',
      example: 'Buttons'
    },
    {
      name: 'result[].template.detectedScale',
      type: 'number',
      description: 'Scale factor used for successful match (optional runtime property)',
      example: 1.33
    }
  ];

  examples = [
    {
      name: 'Match Specific Templates by ID',
      description: 'Search for specific template IDs on the current screen',
      inputs: {
        templateIds: ['login-button', 'close-icon'],
        threshold: 0.8,
        showVisualIndicators: true
      }
    },
    {
      name: 'High Confidence Match',
      description: 'Search with high confidence threshold for precise matches',
      inputs: {
        templateIds: ['submit-button'],
        threshold: 0.9
      }
    },
    {
      name: 'Multiple Templates with Indicators',
      description: 'Match multiple templates and show visual indicators',
      inputs: {
        templateIds: ['login-button', 'close-icon', 'submit-button'],
        threshold: 0.7,
        showVisualIndicators: true,
        overlayTimeout: 3000
      }
    }
  ];

  async initialize(context: ToolInitContext) {
    // opencv4nodejs is ready to use immediately

    // Create a new templateManager instance for this tool
    // The tool should be independent and not rely on the main process
    this.templateManager = context.templateManager!;

    // Store overlay service for visual indicators
    this.overlayService = context.overlayService;

    return;
  }

  async executeValidated(input: TemplateMatcherInput): Promise<TemplateMatcherResult> {
    let screenMat: cv.Mat | null = null;

    try {
      // Get screen image by capturing current screen
      const screenImage = await this.captureCurrentScreen();

      // Load and process the screen image
      screenMat = this.loadImage(screenImage);

      if (!screenMat) {
        throw new Error('Failed to capture or load screen image for template matching');
      }

      // Get candidate templates
      const templates = await this.getCandidateTemplates(input);

      if (templates.length === 0) {
        throw new Error(`No templates found for IDs: ${input.templateIds.join(', ')}`);
      }

      // Perform template matching
      const results: TemplateMatcherOutput = [];
      const threshold = input.threshold;

      for (const template of templates) {
        let templateMat: cv.Mat | null = null;
        try {
          templateMat = await this.loadTemplateImage(template.id);
          if (!templateMat) continue;

          const matches = await this.matchTemplate(
            screenMat,
            templateMat,
            template,
            threshold
          );

          results.push(...matches);
        } catch (error) {
          console.warn(`Failed to match template ${template.id}:`, error);
        } finally {
          // Cleanup template image Mat
          if (templateMat) {
            try {
              templateMat.release();
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      }

      // Sort by confidence (highest first)
      results.sort((a, b) => b.confidence - a.confidence);

      // Update usage statistics
      for (const result of results) {
        await this.templateManager?.recordTemplateUsage?.(result.templateId, true);
      }

      // Show visual indicators if requested
      if (input.showVisualIndicators && results.length > 0) {
        // Results already have correct {x, y} format, no conversion needed
        const overlayResults = results;
        await this.showVisualIndicators(overlayResults as any, input.overlayTimeout);
      }

      return {
        success: true,
        data: results
      };
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

  private async getCandidateTemplates(input: TemplateMatcherInput) {
    // Get specific templates by ID (templateIds is now required)
    const templates = [];
    for (const templateId of input.templateIds) {
      const template = await this.templateManager?.getTemplate?.(templateId);
      if (template && typeof template === 'object') {
        const templateObj = template as any;
        const { imageData, thumbnailData, ...metadata } = templateObj;
        templates.push(metadata);
      } else {
        console.warn(`[Template Matcher] Template not found by ID: ${templateId}`);
      }
    }
    return templates;
  }

  private async loadTemplateImage(templateId: string): Promise<cv.Mat | null> {
    const template = await this.templateManager?.getTemplate?.(templateId);
    if (!template || typeof template !== 'object') {
      return null;
    }
    const templateObj = template as any;
    if (!templateObj.imageData) {
      return null;
    }

    return cv.imdecode(templateObj.imageData);
  }

  private async matchTemplate(
    screenMat: cv.Mat,
    templateMat: cv.Mat,
    templateMetadata: TemplateMetadata,
    threshold: number
  ): Promise<TemplateMatchResult[]> {
    // Search on full screen (no region restriction)
    const searchMat = screenMat;

    const templateSize = templateMat.sizes;
    const originalWidth = templateSize[1];
    const originalHeight = templateSize[0];

    const matches: TemplateMatchResult[] = [];
    const finalThreshold = Math.max(threshold, templateMetadata.matchThreshold || 0.8);
    const currentResolution = this.getCurrentResolution();

    // Smart scale selection: try cached scale first, then fallback to full search
    let scalesToTry: number[] = [];

    if (templateMetadata.scaleCache && templateMetadata.scaleCache[currentResolution]) {
      // We have a cached scale for this resolution - try it first
      const cachedScale = templateMetadata.scaleCache[currentResolution];
      scalesToTry = [cachedScale, 1.0]; // Try cached scale first, then original size
    } else if (currentResolution === templateMetadata.sourceResolution) {
      // Same resolution as when template was created - should be 1.0
      scalesToTry = [1.0];
    } else {
      // No cached scale - need full search
      scalesToTry = [
        1.0,          // Original size (try first)
        // Scaling down (template larger than screen)
        0.9, 0.8, 0.75, 0.7, 0.67, 0.6, 0.5, 0.4, 0.33, 0.25,
        // Scaling up (template smaller than screen) 
        1.1, 1.2, 1.25, 1.33, 1.4, 1.5, 1.6, 1.67, 1.75, 1.8, 2.0, 2.25, 2.5, 3.0
      ];
    }

    // Try scale factors in order of priority
    for (const scale of scalesToTry) {
      let scaledWidth = originalWidth;
      let scaledHeight = originalHeight;

      let result: any = null;
      let scaledTemplate: cv.Mat = templateMat;

      try {
        // Scale template if scale factor is not 1.0
        if (Math.abs(scale - 1.0) > 0.01) {
          const newWidth = Math.round(originalWidth * scale);
          const newHeight = Math.round(originalHeight * scale);

          // Skip if scaled template would be too small or too large
          if (newWidth < 10 || newHeight < 10 ||
            newWidth > searchMat.sizes[1] || newHeight > searchMat.sizes[0]) {
            continue;
          }

          scaledTemplate = templateMat.resize(newHeight, newWidth);
          scaledWidth = newWidth;
          scaledHeight = newHeight;
        }

        // Perform template matching using normalized cross correlation
        result = searchMat.matchTemplate(scaledTemplate, cv.TM_CCOEFF_NORMED);

        // Find min/max locations and values
        const minMaxLoc = result.minMaxLoc();


        if (minMaxLoc.maxVal >= finalThreshold) {
          // Found a good match at this scale - create the match result
          matches.push({
            templateId: templateMetadata.id,
            confidence: minMaxLoc.maxVal,
            location: {
              x: minMaxLoc.maxLoc.x,
              y: minMaxLoc.maxLoc.y,
              width: scaledWidth,
              height: scaledHeight
            },
            template: {
              ...templateMetadata,
              // Add scale information for debugging/display
              detectedScale: scale
            }
          });
        }
      } catch (scaleError) {
        // Log but continue with other scales
      } finally {
        // Cleanup temporary Mat objects
        if (result) {
          try {
            result.release();
          } catch {
            // Fallback: ignore cleanup errors
          }
        }
        // Cleanup scaled template if it's different from original
        if (scaledTemplate !== templateMat) {
          try {
            scaledTemplate.release();
          } catch {
            // Fallback: ignore cleanup errors
          }
        }
      }
    }

    // Sort matches by confidence (highest first) and return top matches
    matches.sort((a, b) => b.confidence - a.confidence);

    if (matches.length > 0) {
      const bestMatch = matches[0];
      const bestScale = bestMatch.template.detectedScale;

      // Cache the successful scale if it's not already cached
      if (bestScale && (!templateMetadata.scaleCache || templateMetadata.scaleCache[currentResolution] !== bestScale)) {
        try {
          await this.templateManager?.updateScaleCache?.(templateMetadata.id, currentResolution, bestScale);
        } catch (error) {
          console.warn(`[Template Matcher] Failed to cache scale: ${error}`);
        }
      }

      return [bestMatch];
    }

    return [];
  }

  private async showVisualIndicators(results: TemplateMatchResult[], timeout: number): Promise<void> {
    if (!this.overlayService) {
      console.warn('[Template Matcher] Overlay service not available, skipping visual indicators');
      return;
    }

    // Create overlay window
    const overlay = await this.overlayService.createOverlay({
      showInstructions: true,
      instructionText: `Found ${results.length} template match(es)`,
      timeout: timeout,
      clickThrough: false
    });

    // Convert results to overlay shapes and text
    const shapes: OverlayShape[] = [];
    const texts: OverlayText[] = [];

    results.forEach((result, index) => {
      const { location, template, confidence } = result;
      // Location already has correct {x, y, width, height} format
      const rectForScreen = {
        x: location.x,
        y: location.y,
        width: location.width,
        height: location.height
      };
      const screenDipRect = screen.screenToDipRect(null, rectForScreen)

      // Create rectangle shape for each match
      shapes.push({
        id: `match-${index}`,
        type: 'rectangle',
        bounds: screenDipRect,
        style: {
          ...OVERLAY_STYLES.HIGHLIGHT,
          color: confidence > 0.9 ? '#00ff00' : confidence > 0.8 ? '#ffaa00' : '#ff8800',
          lineWidth: 3,
          fillColor: confidence > 0.9 ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 170, 0, 0.1)'
        },
        label: `${template.name}`,
        labelPosition: 'top'
      });

      // Add confidence text
      texts.push({
        id: `confidence-${index}`,
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
      });
    });

    // Draw shapes and text
    await overlay.drawShapes(shapes);
    await overlay.drawText(texts);

    // Show the overlay
    await overlay.show();
  }
}

