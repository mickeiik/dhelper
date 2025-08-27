import { describe, test, expect, beforeEach } from 'vitest';
import { TesseractOcrTool } from '..';
import { TesseractOcrInputSchema, TesseractOcrOutputSchema } from '../../../../schemas/src';

describe('TesseractOcrTool Class', () => {
    let tesseractOcrTool: TesseractOcrTool;

    beforeEach(() => {
        tesseractOcrTool = new TesseractOcrTool();
    });

    describe('TesseractOcrTool Properties', () => {
        test('should have required properties', () => {
            expect(tesseractOcrTool.id).toBe('tesseract-ocr');
            expect(tesseractOcrTool.name).toBe('Tesseract OCR Tool');
            expect(tesseractOcrTool.description).toBe('Extract text from images using Tesseract OCR engine');
            expect(tesseractOcrTool.category).toBe('textProcessing');
            expect(JSON.stringify(tesseractOcrTool.inputSchema))
                .toStrictEqual(JSON.stringify(TesseractOcrInputSchema));
            expect(JSON.stringify(tesseractOcrTool.outputSchema))
                .toStrictEqual(JSON.stringify(TesseractOcrOutputSchema));
        });

        test('should generate correct result schema', () => {
            const resultSchema = tesseractOcrTool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    text: 'Found Text',
                    confidence: 0,
                    metadata: {
                        processingTime: 0,
                        timestamp: 0,
                    }
                }
            };

            const parseResult = () => tesseractOcrTool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

});