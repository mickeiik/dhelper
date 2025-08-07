// packages/@tools/ocr/src/index.ts
import type { Tool, ToolInputField } from '@app/types';
import Tesseract from 'tesseract.js';

export type TesseractOcrToolInput = Tesseract.ImageLike;

export type TesseractOcrToolOutput = string;

export class TesseractOcrTool implements Tool {
  id = 'tesseract-ocr' as const;
  name = 'Tesseract OCR Tool';
  description = 'Extract text from images using Tesseract OCR engine';
  category = 'Text Processing';

  inputFields: ToolInputField[] = [
    {
      name: 'image',
      type: 'string',
      description: 'Image data (base64 data URL, file path, or buffer)',
      required: true,
      placeholder: 'data:image/png;base64,... or /path/to/image.png',
      example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
    }
  ];

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
      name: 'From File Path',
      description: 'Load image from a file path',
      inputs: '/path/to/your/image.png'
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

  async execute(input: TesseractOcrToolInput): Promise<TesseractOcrToolOutput> {
    try {
      const recognizeResult = await this.worker?.recognize(input);

      if (recognizeResult) {
        const { data: { text } } = recognizeResult;

        const cleanedText = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');

        return cleanedText;
      }
    } catch (error: any) {
      throw new Error(`TesseractOcrTool failed: ${error.message}`);
    }
    return ''
  }
}

