import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TesseractOcrTool } from '..';
import { TesseractOcrInputSchema, TesseractOcrOutputSchema } from '@app/schemas';

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

    describe('TesseractOcrTool Methods', () => {
        test('should initialize tesseractWorker', async () => {
            vi.mock('tesseract.js', () => {
                return {
                    default: {
                        createWorker: vi.fn().mockImplementation(() => ({ isMock: true })),
                        OEM: {
                            DEFAULT: ''
                        }
                    }
                }
            });

            expect(tesseractOcrTool['worker']).toBeNull();

            await tesseractOcrTool.initialize();

            expect(tesseractOcrTool['worker']).toBeDefined();
            expect(tesseractOcrTool['worker']).toStrictEqual({ isMock: true });
        });

        test('should parse tool input', () => {
            const inputSchemaSpy = vi.spyOn(tesseractOcrTool.inputSchema, 'parse');
            const executeValidatedSpy = vi.spyOn(tesseractOcrTool, 'executeValidated');

            tesseractOcrTool.execute('string');
            
            expect(executeValidatedSpy).toHaveBeenCalledWith('string');
            
            const buffer = Buffer.alloc(0);
            tesseractOcrTool.execute(buffer);
            expect(executeValidatedSpy).toHaveBeenCalledWith(buffer);
            expect(inputSchemaSpy).toHaveBeenCalled();
        });
    });
});