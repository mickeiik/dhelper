import type { Tool, ToolInputField, ToolInitContext, OverlayService, OverlayShape, OverlayText, OVERLAY_STYLES } from '@app/types';
import type { TemplateMatchResult, TemplateMetadata } from '@app/templates';
import cv from '@u4/opencv4nodejs';
import screenshot from 'screenshot-desktop';

export interface TemplateMatcherInput {
  // Screen image to search in (base64 data URL, file path, or buffer) - optional, will capture current screen if not provided
  screenImage?: string | Buffer;
  
  // Template selection options
  templateIds?: string[]; // Specific template IDs to match against
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
  overlayTimeout?: number; // Auto-dismiss overlay after milliseconds (default: 5000)
}

export type TemplateMatcherOutput = TemplateMatchResult[];

export class TemplateMatcherTool implements Tool {
  id = 'template-matcher' as const;
  name = 'Template Matcher Tool';
  description = 'Find template matches on the current screen or provided image using OpenCV template matching';
  category = 'Computer Vision';
  
  private templateManager: any; // Will be injected during initialization
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
      type: 'object',
      description: 'Specific template IDs to match against (optional)',
      required: false,
      example: ['template-1', 'template-2']
    },
    {
      name: 'categories',
      type: 'object',
      description: 'Match templates in these categories (optional)',
      required: false,
      example: ['Buttons', 'Icons']
    },
    {
      name: 'tags',
      type: 'object',
      description: 'Match templates with these tags (optional)',
      required: false,
      example: ['login', 'submit']
    },
    {
      name: 'minConfidence',
      type: 'number',
      description: 'Minimum confidence threshold (0-1)',
      required: false,
      defaultValue: 0.8,
      example: 0.8
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

  examples = [
    {
      name: 'Match All Templates on Current Screen',
      description: 'Search for all available templates on the current screen (auto-captures screenshot)',
      inputs: {
        minConfidence: 0.8,
        maxResults: 5,
        showVisualIndicators: true
      }
    },
    {
      name: 'Match Button Templates on Current Screen',
      description: 'Search only for button templates on the current screen',
      inputs: {
        categories: ['Buttons'],
        minConfidence: 0.7,
        showVisualIndicators: true
      }
    },
    {
      name: 'Match Specific Templates',
      description: 'Search for specific template IDs on the current screen',
      inputs: {
        templateIds: ['login-button', 'close-icon']
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
          x: { $ref: '{{previous:region-selector.left}}' },
          y: { $ref: '{{previous:region-selector.top}}' },
          width: { $ref: '{{previous:region-selector.width}}' },
          height: { $ref: '{{previous:region-selector.height}}' }
        }
      }
    }
  ];

  async initialize(context: ToolInitContext) {
    // opencv4nodejs is ready to use immediately
    
    // Create a new templateManager instance for this tool
    // The tool should be independent and not rely on the main process
    const { TemplateManager } = await import('@app/templates');
    this.templateManager = new TemplateManager();
    
    // Store overlay service for visual indicators
    this.overlayService = context.overlayService;
    
    return;
  }

  async execute(input: TemplateMatcherInput): Promise<TemplateMatcherOutput> {
    try {
      // Get screen image - either from input or by capturing current screen
      const screenImage = input.screenImage || await this.captureCurrentScreen();
      
      // Load and process the screen image
      const screenMat = this.loadImage(screenImage);
      if (!screenMat) {
        throw new Error('Failed to load screen image');
      }

      // Get candidate templates
      const templates = await this.getCandidateTemplates(input);
      if (templates.length === 0) {
        return [];
      }

      // Perform template matching
      const results: TemplateMatchResult[] = [];
      const minConfidence = input.minConfidence || 0.8;
      const maxResults = input.maxResults || 10;

      for (const template of templates) {
        try {
          const templateMat = await this.loadTemplateImage(template.id);
          if (!templateMat) continue;

          const matches = this.matchTemplate(
            screenMat, 
            templateMat, 
            template, 
            minConfidence,
            input.searchRegion
          );

          results.push(...matches);
        } catch (error) {
          console.warn(`Failed to match template ${template.id}:`, error);
        }
      }
      // Sort by confidence and limit results
      results.sort((a, b) => b.confidence - a.confidence);
      const limitedResults = results.slice(0, maxResults);

      // Update usage statistics
      for (const result of limitedResults) {
        await this.templateManager.recordTemplateUsage(result.templateId, true);
      }

      // Show visual indicators if requested
      if (input.showVisualIndicators && limitedResults.length > 0) {
        await this.showVisualIndicators(limitedResults, input.overlayTimeout || 5000);
      }

      return limitedResults;

    } catch (error) {
      throw new Error(`Template matching failed: ${error}`);
    }
  }

  private async captureCurrentScreen(): Promise<Buffer> {
    try {
      console.log('[Template Matcher] Capturing current screen...');
      const imgBuffer = await screenshot({ format: 'png' });
      console.log(`[Template Matcher] Screen captured: ${Math.round(imgBuffer.length / 1024)}KB`);
      return imgBuffer;
    } catch (error) {
      throw new Error(`Failed to capture screen: ${error}`);
    }
  }

  private loadImage(imageInput: string | Buffer): any | null {
    try {
      let imageMat: any = null;
      
      if (typeof imageInput === 'string') {
        if (imageInput.startsWith('data:')) {
          // Base64 data URL
          const base64Data = imageInput.split(',')[1];
          const imageData = Buffer.from(base64Data, 'base64');
          console.log(`[Template Matcher] Loading base64 image: ${Math.round(imageData.length / 1024)}KB`);
          imageMat = cv.imdecode(imageData);
        } else {
          // File path
          console.log(`[Template Matcher] Loading image from file: ${imageInput}`);
          imageMat = cv.imread(imageInput);
        }
      } else {
        // Buffer
        console.log(`[Template Matcher] Loading image from buffer: ${Math.round(imageInput.length / 1024)}KB`);
        imageMat = cv.imdecode(imageInput);
      }
      
      if (imageMat) {
        const size = imageMat.sizes;
        console.log(`[Template Matcher] Loaded image dimensions: ${size[1]}x${size[0]}`);
      }
      
      return imageMat;
    } catch (error) {
      console.error('Failed to load image:', error);
      return null;
    }
  }

  private async getCandidateTemplates(input: TemplateMatcherInput) {
    if (input.templateIds && input.templateIds.length > 0) {
      // Get specific templates
      const templates = [];
      for (const templateId of input.templateIds) {
        const template = await this.templateManager.getTemplate(templateId);
        if (template) {
          const { imageData, thumbnailData, ...metadata } = template;
          templates.push(metadata);
        }
      }
      return templates;
    }

    // Get all templates, apply filters
    let templates = await this.templateManager.listTemplates();

    if (input.categories && input.categories.length > 0) {
      templates = templates.filter((t: TemplateMetadata) => input.categories!.includes(t.category));
    }

    if (input.tags && input.tags.length > 0) {
      templates = templates.filter((t: TemplateMetadata) => 
        input.tags!.some(tag => t.tags.includes(tag))
      );
    }

    return templates;
  }

  private async loadTemplateImage(templateId: string): Promise<any | null> {
    const template = await this.templateManager.getTemplate(templateId);
    if (!template || !template.imageData) {
      return null;
    }

    try {
      return cv.imdecode(template.imageData);
    } catch (error) {
      console.error(`Failed to load template image ${templateId}:`, error);
      return null;
    }
  }

  private matchTemplate(
    screenMat: any,
    templateMat: any,
    templateMetadata: any,
    minConfidence: number,
    searchRegion?: { x: number; y: number; width: number; height: number }
  ): TemplateMatchResult[] {
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

      // Get screen and template dimensions for debugging
      const screenSize = searchMat.sizes;
      const screenWidth = screenSize[1];
      const screenHeight = screenSize[0];
      
      const templateSize = templateMat.sizes;
      const templateWidth = templateSize[1];
      const templateHeight = templateSize[0];
      
      console.log(`[Template Matcher] Screen: ${screenWidth}x${screenHeight}, Template: ${templateWidth}x${templateHeight}`);

      // Perform template matching using normalized cross correlation
      const result = searchMat.matchTemplate(templateMat, cv.TM_CCOEFF_NORMED);

      // Find all matches above threshold
      const matches: TemplateMatchResult[] = [];
      const threshold = Math.max(minConfidence, templateMetadata.matchThreshold || 0.8);

      // Find min/max locations and values
      const minMaxLoc = result.minMaxLoc();
      
      console.log(`[Template Matcher] Template ${templateMetadata.name}: confidence=${minMaxLoc.maxVal}, position=(${minMaxLoc.maxLoc.x}, ${minMaxLoc.maxLoc.y}), threshold=${threshold}`);
      
      if (minMaxLoc.maxVal >= threshold) {
        // Found at least one good match - create the match result
        matches.push({
          templateId: templateMetadata.id,
          confidence: minMaxLoc.maxVal,
          location: {
            x: minMaxLoc.maxLoc.x + offsetX,
            y: minMaxLoc.maxLoc.y + offsetY,
            width: templateWidth,
            height: templateHeight
          },
          template: templateMetadata
        });
      }

      return matches;
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
      // Import OVERLAY_STYLES after we know overlay service is available
      const { OVERLAY_STYLES } = await import('@app/types');
      
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
        
        // Create rectangle shape for each match
        shapes.push({
          id: `match-${index}`,
          type: 'rectangle',
          bounds: location,
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

      console.log(`[Template Matcher] Visual indicators displayed for ${results.length} matches (auto-close in ${timeout}ms)`);
    } catch (error) {
      console.error('[Template Matcher] Failed to show visual indicators:', error);
    }
  }
}

// Self-register types for autocomplete
declare module '@app/tools' {
  interface ToolRegistry {
    'template-matcher': {
      input: TemplateMatcherInput;
      output: TemplateMatcherOutput;
    };
  }
}