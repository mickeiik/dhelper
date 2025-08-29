import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ScreenshotInputSchema, ScreenshotOutputSchema } from '@app/schemas';
import { ScreenshotTool } from '..';
import electron from 'electron';

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

        test('should generate correct result schema', async () => {
            const {
                screenshot,
                createFromBuffer,
                crop,
                toDataURL,
                getSize
            } = vi.hoisted(() => ({
                screenshot: vi.fn().mockImplementation(() => ({ mockOutput: true })),
                toDataURL: vi.fn().mockImplementation(() => ({})),
                getSize: vi.fn().mockImplementation(() => ({ width: 100, height: 150 })),
                crop: vi.fn(() => ({
                    toDataURL,
                    getSize
                })),
                createFromBuffer: vi.fn().mockImplementation(() => ({
                    crop,
                })),
            }));
            vi.mock('screenshot-desktop', () => ({
                default: screenshot
            }));

            vi.mock('electron', () => ({
                nativeImage: {
                    createFromBuffer,
                }
            }));

            const mockInput = {
                x: 0,
                y: 0,
                width: 100,
                height: 100,
            }

            const toolResult = await screenshotTool.executeValidated(mockInput);

            expect(screenshot).toHaveBeenCalledWith({ format: 'png' });
            expect(createFromBuffer).toHaveBeenCalledWith({ mockOutput: true });
            expect(crop).toHaveBeenCalledWith(mockInput);
            expect(toDataURL).toHaveBeenCalledOnce();
            expect(getSize).toHaveBeenCalledOnce();

            expect(toolResult.success).toStrictEqual(true);

            if (toolResult.success) {
                expect(toolResult.data.image).toBeDefined();

                if (toolResult.data.metadata) {
                    expect(toolResult.data.metadata).toBeDefined();
                    expect(toolResult.data.metadata.width).toBeDefined();
                    expect(toolResult.data.metadata.height).toBeDefined();
                    expect(toolResult.data.metadata.region).toStrictEqual(mockInput);
                    expect(toolResult.data.metadata?.timestamp).toBeDefined();
                }
            }
        });
    });

});