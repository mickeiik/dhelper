import { Tool } from '@app/tools';
import Tesseract from 'tesseract.js';

export type TesseractOcrToolInput = Tesseract.ImageLike;

export type TesseractOcrToolOutput = string;


export class TesseractOcrTool implements Tool {
  id = 'tesseract-ocr';
  name = 'Tesseract Ocr Tool';
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
