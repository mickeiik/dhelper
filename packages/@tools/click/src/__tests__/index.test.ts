import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ClickTool } from '..';
import { ClickInputSchema, ClickOutputSchema } from '@app/schemas';
import type { OverlayService } from '@app/overlay';
import z from 'zod';
import { Button } from '@nut-tree-fork/nut-js';

describe('ClickTool Class', () => {
    let clickTool: ClickTool;

    beforeEach(() => {
        clickTool = new ClickTool();
    });

    describe('ClickTool Properties', () => {
        test('should have required properties', () => {
            expect(clickTool.id).toBe('click');
            expect(clickTool.name).toBe('Click Tool');
            expect(clickTool.description).toBe('Click at screen position or center of region');
            expect(clickTool.category).toBe('input');
            expect(JSON.stringify(clickTool.inputSchema))
                .toStrictEqual(JSON.stringify(ClickInputSchema));
            expect(JSON.stringify(clickTool.outputSchema))
                .toStrictEqual(JSON.stringify(ClickOutputSchema));
        });

        test('should generate correct result schema', () => {
            const resultSchema = clickTool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    x: 0,
                    y: 0
                }
            };

            const parseResult = () => clickTool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

    describe('ClickTool Methods', () => {
        test('should initialize overlayService', () => {
            expect(clickTool['overlayService']).toBeUndefined();

            const overlay = '' as unknown as OverlayService;
            clickTool.initialize({ overlayService: overlay });

            expect(clickTool['overlayService']).toBeDefined();
            expect(clickTool['overlayService']).toStrictEqual(overlay);
        });

        test('should parse and set default values for point input', async () => {
            const inputSchemaSpy = vi.spyOn(clickTool.inputSchema, 'parse');
            const executeValidatedSpy = vi.spyOn(clickTool, 'executeValidated');
            vi.spyOn(clickTool as any, 'clickDefault').mockImplementation(() => { });

            const toolInput = {
                x: 0,
                y: 0
            };

            await clickTool.execute(toolInput);

            expect(executeValidatedSpy).toHaveBeenCalledWith({
                ...toolInput,
                button: 'left',
                clicks: 1,
                delay: 100,
                indicatorTimeout: 1000,
                showVisualIndicator: false
            })

            expect(inputSchemaSpy).toHaveBeenCalledWith(toolInput);
        });

        test('should parse and set default values for rectangle input', async () => {
            const inputSchemaSpy = vi.spyOn(clickTool.inputSchema, 'parse');
            const executeValidatedSpy = vi.spyOn(clickTool, 'executeValidated').mockImplementation(vi.fn());
            vi.spyOn(clickTool as any, 'clickDefault').mockImplementation(() => { });

            const toolInput = {
                height: 1,
                width: 1,
                x: 0,
                y: 0,
            }

            await clickTool.execute(toolInput);

            expect(inputSchemaSpy).toHaveBeenCalledWith(toolInput);

            expect(executeValidatedSpy).toHaveBeenCalledWith({
                height: 1,
                width: 1,
                x: 0,
                y: 0,
                button: "left",
                clicks: 1,
                delay: 100,
                indicatorTimeout: 1000,
                showVisualIndicator: false,
            })

        });

        test('should calculate click position from point input', async () => {
            const calculateClickPositionSpy = vi.spyOn(clickTool as any, 'calculateClickPosition');
            vi.spyOn(clickTool as any, 'clickDefault').mockImplementation(() => { });

            const executeValidatedInput: z.output<typeof ClickInputSchema> = {
                x: 0,
                y: 0,
                button: "left",
                clicks: 1,
                delay: 100,
                indicatorTimeout: 1000,
                showVisualIndicator: false,
            };

            await clickTool.executeValidated(executeValidatedInput);

            expect(calculateClickPositionSpy).toHaveBeenCalledWith(executeValidatedInput);
            expect(calculateClickPositionSpy).toHaveReturnedWith({
                x: executeValidatedInput.x,
                y: executeValidatedInput.y,
            });
        });

        test('should calculate click position from rectangle', async () => {
            const calculateClickPositionSpy = vi.spyOn(clickTool as any, 'calculateClickPosition');
            vi.spyOn(clickTool as any, 'clickDefault').mockImplementation(() => { });

            const executeValidatedInput: z.output<typeof ClickInputSchema> = {
                x: 200,
                y: 150,
                width: 12,
                height: 50,
                button: "left",
                clicks: 1,
                delay: 100,
                indicatorTimeout: 1000,
                showVisualIndicator: false,
            };

            await clickTool.executeValidated(executeValidatedInput);

            expect(calculateClickPositionSpy).toHaveBeenCalledWith(executeValidatedInput);
            expect(calculateClickPositionSpy).toHaveReturnedWith({
                x: 206,
                y: 175,
            });
        });

        test('should call showVisualIndicator when input.showVisualIndicator is true', async () => {
            const showVisualIndicatorSpy = vi.spyOn(clickTool as any, 'showVisualIndicator');
            vi.spyOn(clickTool as any, 'clickDefault').mockImplementation(() => { });

            const executeValidatedInput: z.output<typeof ClickInputSchema> = {
                x: 200,
                y: 150,
                width: 12,
                height: 50,
                button: "left",
                clicks: 1,
                delay: 100,
                indicatorTimeout: 1000,
                showVisualIndicator: true,
            };

            await clickTool.executeValidated(executeValidatedInput);

            expect(showVisualIndicatorSpy).toHaveBeenCalledWith({
                x: 206,
                y: 175,
            }, executeValidatedInput.indicatorTimeout);
        });

        test('should perform clickDefault at given position', async () => {
            const clickDefaultSpy = vi.spyOn(clickTool as any, 'clickDefault')
                .mockImplementation(() => { });

            const executeValidatedInput: z.output<typeof ClickInputSchema> = {
                x: 200,
                y: 150,
                button: "left",
                clicks: 1,
                delay: 100,
                indicatorTimeout: 1000,
                showVisualIndicator: false,
            };

            await clickTool.executeValidated(executeValidatedInput);

            expect(clickDefaultSpy).toHaveBeenCalledWith({
                x: 200,
                y: 150,
            },
                Button.LEFT,
                executeValidatedInput.clicks,
                executeValidatedInput.delay
            );
        });

        test('should return nutjs mouse button enum', async () => {
            const right = 'right';
            const middle = 'middle';
            const left = 'left';
            const shouldDefaultToLeft = 'rightLeft';

            expect(clickTool['getMouseButton'](right)).toEqual(Button.RIGHT);
            expect(clickTool['getMouseButton'](middle)).toEqual(Button.MIDDLE);
            expect(clickTool['getMouseButton'](left)).toEqual(Button.LEFT);
            expect(clickTool['getMouseButton'](shouldDefaultToLeft)).toEqual(Button.LEFT);
        });

        test('should move mouse and click 2 times with 200ms delay', async () => {
            const {
                mouse,
                sleep,
                Button
            } = vi.hoisted(() => ({
                mouse: {
                    setPosition: vi.fn(),
                    pressButton: vi.fn(),
                    releaseButton: vi.fn()
                },
                Button: vi.fn(),
                sleep: vi.fn()
            }));

            vi.mock('@nut-tree-fork/nut-js', async () => ({
                mouse,
                Button,
                sleep
            }));

            const clickPosition = { x: 100, y: 300 };
            const leftClick = 0;
            const numberOfClicks = 2;
            const clickDelayInMs = 200;
            await clickTool['clickDefault'](
                clickPosition,
                leftClick,
                numberOfClicks,
                clickDelayInMs
            );

            expect(mouse.setPosition).toHaveBeenCalledWith(clickPosition);
            expect(mouse.pressButton).toHaveBeenCalledWith(leftClick);
            expect(mouse.releaseButton).toHaveBeenCalledWith(leftClick);
            expect(sleep).toHaveBeenCalledWith(clickDelayInMs);
        });
    });
});