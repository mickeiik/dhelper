import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TesseractOcrTool } from '..';
import { TesseractOcrInputSchema, TesseractOcrOutputSchema } from '@app/schemas';
import Tesseract from 'tesseract.js';

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
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        test('should initialize tesseractWorker', async () => {
            const tesseractCreateWorkerSpy = vi.spyOn(Tesseract, 'createWorker')
                .mockImplementation(async () => ({ isMock: true } as unknown as Tesseract.Worker))
            expect(tesseractOcrTool['worker']).toBeNull();

            await tesseractOcrTool.initialize();

            expect(JSON.stringify(tesseractCreateWorkerSpy.mock.calls[0][0]))
                .toStrictEqual('"eng"')
            expect(JSON.stringify(tesseractCreateWorkerSpy.mock.calls[0][1]))
                .toStrictEqual(JSON.stringify(Tesseract.OEM.DEFAULT))
            expect(JSON.stringify(tesseractCreateWorkerSpy.mock.calls[0][2]))
                .toStrictEqual(JSON.stringify({})); //TODO: Should actually check that the logger is properly defined

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

        test('should recognize image input', async () => {
            const recognizeMock = vi.fn(() => ({
                data: {
                    text: 'recognizedMock',
                    confidence: 0,
                }
            } as unknown as Tesseract.RecognizeResult))
            tesseractOcrTool['worker'] = {
                recognize: recognizeMock
            } as unknown as Tesseract.Worker;

            await tesseractOcrTool.executeValidated('base64Img');

            expect(recognizeMock).toHaveBeenCalledWith('base64Img')
        })

        test('should recognize real image input', async () => {
            await tesseractOcrTool.initialize()
            const base64LoremIpsum = 'data:image/png;base64,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';
            const ocrResult = await tesseractOcrTool.executeValidated(
                base64LoremIpsum
            );

            const expectedOcrResult = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae.';

            expect(ocrResult.success).toEqual(true);

            if (ocrResult.success) {
                expect(ocrResult.data.confidence).toBeDefined();
                expect(ocrResult.data.confidence).toBeTypeOf('number');

                expect(ocrResult.data.metadata).toBeDefined();
                expect(ocrResult.data.metadata).toHaveProperty('processingTime');
                expect(ocrResult.data.metadata).toHaveProperty('timestamp');

                expect(ocrResult.data.text).toBeDefined();
                expect(ocrResult.data.text).toEqual(expectedOcrResult);
            };
        })
    });
});