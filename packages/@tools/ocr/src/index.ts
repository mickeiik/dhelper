import { TesseractOcrInputSchema, TesseractOcrOutputSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';
import Tesseract from 'tesseract.js';

// Type aliases for convenience
type TesseractOcrInput = z.infer<typeof TesseractOcrInputSchema>;
type TesseractOcrOutput = z.infer<typeof TesseractOcrOutputSchema>;
type TesseractOcrResult = ToolResult<typeof TesseractOcrOutputSchema>;

export class TesseractOcrTool extends Tool<typeof TesseractOcrInputSchema, typeof TesseractOcrOutputSchema> {
  id = 'tesseract-ocr' as const;
  name = 'Tesseract OCR Tool';
  description = 'Extract text from images using Tesseract OCR engine';
  category = 'textProcessing';

  inputSchema = TesseractOcrInputSchema;
  outputSchema = TesseractOcrOutputSchema;

  examples = [
    {
      name: 'From Screenshot Step',
      description: 'Use output from the most recent screenshot step',
      inputs: { $ref: '{{previous:screenshot}}' }
    },
    {
      name: 'From Previous Step',
      description: 'Use output from the immediately previous step',
      inputs: { $ref: '{{previous}}' }
    },
    {
      name: 'From Data URL',
      description: 'Process a base64 encoded image',
      inputs: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
    }
  ];

  worker: Tesseract.Worker | null = null;

  async initialize() {
    this.worker = await Tesseract.createWorker('eng', Tesseract.OEM.DEFAULT, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`TesseractOcrToolInput Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
  }

  async executeValidated(input: TesseractOcrInput): Promise<TesseractOcrResult> {
    const startTime = Date.now();

    const recognizeResult = await this.worker?.recognize(input);

    if (!recognizeResult) {
      throw new Error('Failed to process image with OCR');
    }

    const { data: { text, confidence } } = recognizeResult;
    const cleanedText = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    const processingTime = Date.now() - startTime;

    const result: TesseractOcrOutput = {
      text: cleanedText,
      confidence,
      metadata: {
        processingTime,
        timestamp: Date.now()
      }
    };

    return {
      success: true,
      data: result
    };
  }
}

