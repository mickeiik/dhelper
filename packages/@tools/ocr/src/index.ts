// packages/@tools/ocr/src/index.ts
import type { Tool, ToolInputField, ToolOutputField } from '@app/types';
import Tesseract from 'tesseract.js';

export type TesseractOcrToolInput = Tesseract.ImageLike;

export type TesseractOcrToolOutput = string;

export class TesseractOcrTool implements Tool<Tesseract.ImageLike, string> {
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
      placeholder: 'data:image/png;base64,..',
      example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'
    }
  ];

  outputFields: ToolOutputField[] = [
    {
      name: 'text',
      type: 'string',
      description: 'Extracted and cleaned text from the image using OCR',
      example: 'This is the extracted text from the image'
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`TesseractOcrTool failed: ${message}`);
    }
    return ''
  }
}

