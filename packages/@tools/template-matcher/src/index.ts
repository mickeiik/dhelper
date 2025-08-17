import type { Tool, ToolInputField, ToolOutputField, ToolInitContext, OverlayService, OverlayShape, OverlayText } from '@app/types';
import { OVERLAY_STYLES, ToolExecutionError } from '@app/types';
import type { TemplateMatchResult, TemplateMetadata } from '@app/types';
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

export interface TemplateMatcherInput {
  // Screen image to search in (base64 data URL, file path, or buffer) - optional, will capture current screen if not provided
  screenImage?: string | Buffer;

  // Template selection options
  templateIds?: string[]; // Specific template IDs to match against
  templateNames?: string[]; // Specific template names to match against
  categories?: string[]; // Match templates in these categories
  tags?: string[]; // Match templates with these tags

  // Matching options
  minConfidence?: number; // Minimum confidence threshold (0-1)
  maxResults?: number; // Maximum number of results to return

  // Search region (optional)
  searchRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Visual options
  showVisualIndicators?: boolean; // Show results on screen overlay
  overlayTimeout?: number; // Auto-dismiss overlay after milliseconds (default: 500)
}

export type TemplateMatcherOutput = TemplateMatchResult[];

export class TemplateMatcherTool implements Tool<TemplateMatcherInput, TemplateMatcherOutput> {
  id = 'template-matcher' as const;
  name = 'Template Matcher Tool';
  description = 'Find template matches on the current screen or provided image using multi-scale OpenCV template matching. Automatically handles different screen resolutions (1080p, 1440p, 4K)';
  category = 'Computer Vision';

  private templateManager: import('@app/types').TemplateManager | undefined; // Will be injected during initialization
  private overlayService?: OverlayService;

  inputFields: ToolInputField[] = [
    {
      name: 'screenImage',
      type: 'string',
      description: 'Screen image to search in (base64 data URL, file path, or buffer) - optional, will capture current screen if not provided',
      required: false,
      placeholder: 'data:image/png;base64,... or /path/to/image.png',
      example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
    },
    {
      name: 'templateIds',
      type: 'array',
      description: 'Specific template IDs to match against (optional)',
      required: false,
      example: ['template-1', 'template-2']
    },
    {
      name: 'templateNames',
      type: 'array',
      description: 'Specific template names to match against (optional)',
      required: false,
      example: ['Login Button', 'Close Icon']
    },
    {
      name: 'categories',
      type: 'array',
      description: 'Match templates in these categories (optional)',
      required: false,
      example: ['Buttons', 'Icons']
    },
    {
      name: 'tags',
      type: 'array',
      description: 'Match templates with these tags (optional)',
      required: false,
      example: ['login', 'submit']
    },
    {
      name: 'minConfidence',
      type: 'number',
      description: 'Minimum confidence threshold (0-1). Lower values (e.g. 0.6) may help find scaled templates.',
      required: false,
      defaultValue: 0.7,
      example: 0.6
    },
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of results to return',
      required: false,
      defaultValue: 10,
      example: 5
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
      description: 'Auto-dismiss visual overlay after specified milliseconds (default: 5000ms)',
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
      name: 'Match All Templates on Current Screen',
      description: 'Search for all available templates on the current screen (auto-captures screenshot)',
      inputs: {
        minConfidence: 0.7,
        maxResults: 5,
        showVisualIndicators: true
      }
    },
    {
      name: 'Match Button Templates on Current Screen',
      description: 'Search only for button templates on the current screen',
      inputs: {
        categories: ['Buttons'],
        minConfidence: 0.6,
        showVisualIndicators: true
      }
    },
    {
      name: 'Match Specific Templates by ID',
      description: 'Search for specific template IDs on the current screen',
      inputs: {
        templateIds: ['login-button', 'close-icon']
      }
    },
    {
      name: 'Match Specific Templates by Name',
      description: 'Search for specific template names on the current screen',
      inputs: {
        templateNames: ['Login Button', 'Close Icon']
      }
    },
    {
      name: 'Match Templates in Previous Screenshot',
      description: 'Search for templates in a previously captured screenshot',
      inputs: {
        screenImage: { $ref: '{{previous:screenshot}}' },
        minConfidence: 0.8,
        maxResults: 5
      }
    },
    {
      name: 'Search in Region on Current Screen',
      description: 'Search for templates only in a specific region of the current screen',
      inputs: {
        searchRegion: {
          x: { $ref: '{{previous:screen-region-selector.left}}' },
          y: { $ref: '{{previous:screen-region-selector.top}}' },
          width: { $ref: '{{previous:screen-region-selector.width}}' },
          height: { $ref: '{{previous:screen-region-selector.height}}' }
        }
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

  async execute(input: TemplateMatcherInput): Promise<TemplateMatcherOutput> {
    let screenMat: cv.Mat | null = null;

    try {
      // Get screen image - either from input or by capturing current screen
      const screenImage = input.screenImage || await this.captureCurrentScreen();

      // Load and process the screen image
      screenMat = this.loadImage(screenImage);

      if (!screenMat) {
        throw new ToolExecutionError('Failed to load screen image', 'template-matcher', { screenImage: typeof screenImage });
      }

      // Get candidate templates
      const templates = await this.getCandidateTemplates(input);

      if (templates.length === 0) {
        if (input.templateIds && Array.isArray(input.templateIds) && input.templateIds.length > 0) {
          throw new ToolExecutionError(`No templates found for IDs: ${input.templateIds.join(', ')}`, 'template-matcher', { templateIds: input.templateIds });
        }
        if (input.templateNames && Array.isArray(input.templateNames) && input.templateNames.length > 0) {
          throw new ToolExecutionError(`No templates found for names: ${input.templateNames.join(', ')}`, 'template-matcher', { templateNames: input.templateNames });
        }
        console.warn('[Template Matcher] No candidate templates found with current filters');
        return [];
      }

      // Perform template matching
      const results: TemplateMatchResult[] = [];
      const minConfidence = input.minConfidence || 0.8;
      const maxResults = input.maxResults || 10;

      for (const template of templates) {
        let templateMat: cv.Mat | null = null;
        try {
          templateMat = await this.loadTemplateImage(template.id);
          if (!templateMat) continue;

          const matches = await this.matchTemplate(
            screenMat,
            templateMat,
            template,
            minConfidence,
            input.searchRegion
          );

          results.push(...matches);
        } catch (error) {
          console.warn(`Failed to match template ${template.id}:`, error);
        } finally {
          // Cleanup template image Mat - use OpenCV4nodejs release method
          if (templateMat) {
            try {
              templateMat.release();
            } catch {
              // Fallback: try accessing release through prototype or manual cleanup
            }
          }
        }
      }
      // Sort by confidence and limit results
      results.sort((a, b) => b.confidence - a.confidence);
      const limitedResults = results.slice(0, maxResults);

      // Update usage statistics
      for (const result of limitedResults) {
        await this.templateManager?.recordTemplateUsage?.(result.templateId, true);
      }

      // Show visual indicators if requested
      if (input.showVisualIndicators && limitedResults.length > 0) {
        await this.showVisualIndicators(limitedResults, input.overlayTimeout || 500);
      }

      return limitedResults;

    } catch (error) {
      throw new ToolExecutionError(`Template matching failed: ${error}`, 'template-matcher', { originalError: error, input });
    } finally {
      // Cleanup screen image Mat to prevent memory leaks
      if (screenMat) {
        try {
          screenMat.release();
        } catch {
          // Fallback: ignore cleanup errors
        }
      }
    }
  }

  private async captureCurrentScreen(): Promise<Buffer> {
    try {
      const imgBuffer = await screenshot({ format: 'png' });
      return imgBuffer;
    } catch (error) {
      throw new ToolExecutionError(`Failed to capture screen: ${error}`, 'template-matcher', { originalError: error });
    }
  }

  private loadImage(imageInput: string | Buffer): cv.Mat | null {
    try {
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
    } catch (error) {
      console.error('Failed to load image:', error);
      return null;
    }
  }

  private getCurrentResolution(): string {
    const primaryDisplay = screen.getPrimaryDisplay();
    return `${primaryDisplay.bounds.width}x${primaryDisplay.bounds.height}`;
  }

  private async getCandidateTemplates(input: TemplateMatcherInput) {
    if (input.templateIds && Array.isArray(input.templateIds) && input.templateIds.length > 0) {
      // Get specific templates by ID
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

    if (input.templateNames && Array.isArray(input.templateNames) && input.templateNames.length > 0) {
      // Get specific templates by name
      const templates = [];
      for (const templateName of input.templateNames) {
        const template = await this.templateManager?.getTemplateByName?.(templateName);
        if (template && typeof template === 'object') {
          const templateObj = template as any;
          const { imageData, thumbnailData, ...metadata } = templateObj;
          templates.push(metadata);
        } else {
          console.warn(`[Template Matcher] Template not found by name: ${templateName}`);
        }
      }
      return templates;
    }

    // Get all templates, apply filters
    let templates = (await this.templateManager?.listTemplates?.() || []) as TemplateMetadata[];

    if (input.categories && Array.isArray(input.categories) && input.categories.length > 0) {
      templates = templates.filter((t) => input.categories!.includes((t as any).category));
    }

    if (input.tags && Array.isArray(input.tags) && input.tags.length > 0) {
      templates = templates.filter((t) =>
        input.tags?.some(tag => (t as any).tags?.includes(tag))
      );
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

    try {
      return cv.imdecode(templateObj.imageData);
    } catch (error) {
      console.error(`Failed to load template image ${templateId}:`, error);
      return null;
    }
  }

  private async matchTemplate(
    screenMat: cv.Mat,
    templateMat: cv.Mat,
    templateMetadata: TemplateMetadata,
    minConfidence: number,
    searchRegion?: { x: number; y: number; width: number; height: number }
  ): Promise<TemplateMatchResult[]> {
    try {
      let searchMat = screenMat;
      let offsetX = 0;
      let offsetY = 0;

      // Crop to search region if specified
      if (searchRegion) {
        const rect = new cv.Rect(
          searchRegion.x,
          searchRegion.y,
          searchRegion.width,
          searchRegion.height
        );
        searchMat = screenMat.getRegion(rect);
        offsetX = searchRegion.x;
        offsetY = searchRegion.y;
      }

      const templateSize = templateMat.sizes;
      const originalWidth = templateSize[1];
      const originalHeight = templateSize[0];

      const matches: TemplateMatchResult[] = [];
      const threshold = Math.max(minConfidence, templateMetadata.matchThreshold || 0.8);
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


          if (minMaxLoc.maxVal >= threshold) {
            // Found a good match at this scale - create the match result
            matches.push({
              templateId: templateMetadata.id,
              confidence: minMaxLoc.maxVal,
              location: {
                x: minMaxLoc.maxLoc.x + offsetX,
                y: minMaxLoc.maxLoc.y + offsetY,
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

    } catch (error) {
      console.error('Template matching error:', error);
      return [];
    }
  }

  private async showVisualIndicators(results: TemplateMatchResult[], timeout: number): Promise<void> {
    if (!this.overlayService) {
      console.warn('[Template Matcher] Overlay service not available, skipping visual indicators');
      return;
    }

    try {
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
        const screenDipRect = screen.screenToDipRect(null, location)

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
            x: location.x + location.width + 5,
            y: location.y + 20
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

    } catch (error) {
      console.error('[Template Matcher] Failed to show visual indicators:', error);
    }
  }
}

