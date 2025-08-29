import { describe, test, expect, beforeEach } from 'vitest';
import { ScreenshotInputSchema, ScreenshotOutputSchema } from '@app/schemas';
import { ScreenshotTool } from '..';

describe('ScreenshotTool Class', () => {
    let screenshotTool: ScreenshotTool;

    beforeEach(() => {
        screenshotTool = new ScreenshotTool();
    });

    describe('ScreenshotTool Properties', () => {
        test('should have required properties', () => {
            expect(screenshotTool.id).toBe('screenshot');
            expect(screenshotTool.name).toBe('Screenshot Tool');
            expect(screenshotTool.description).toBe('Capture a screenshot of a specific screen region');
            expect(screenshotTool.category).toBe('image');
            expect(JSON.stringify(screenshotTool.inputSchema))
                .toStrictEqual(JSON.stringify(ScreenshotInputSchema));
            expect(JSON.stringify(screenshotTool.outputSchema))
                .toStrictEqual(JSON.stringify(ScreenshotOutputSchema));
        });


        test('should generate correct result schema', () => {
            const resultSchema = screenshotTool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    image: 'data:image/data',
                    metadata: {
                        width: 1,
                        height: 1,
                        region: {
                            x: 0,
                            y: 0,
                            width: 1,
                            height: 1,
                        },
                        timestamp: 0
                    },
                }
            };

            const parseResult = () => screenshotTool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

});