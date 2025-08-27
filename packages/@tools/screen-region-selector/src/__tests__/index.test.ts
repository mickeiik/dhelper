import { describe, test, expect, beforeEach } from 'vitest';
import { ScreenRegionSelectorInputSchema, ScreenRegionSelectorOutputUnionSchema } from '../../../../schemas/src';
import { ScreenRegionSelectorTool } from '..';

describe('ScreenRegionSelectorTool Class', () => {
    let screenRegionSelectorTool: ScreenRegionSelectorTool;

    beforeEach(() => {
        screenRegionSelectorTool = new ScreenRegionSelectorTool();
    });

    describe('HelloWorldTool Properties', () => {
        test('should have required properties', () => {
            expect(screenRegionSelectorTool.id).toBe('screen-region-selector');
            expect(screenRegionSelectorTool.name).toBe('Screen Region Selector');
            expect(screenRegionSelectorTool.description).toBe('Interactive tool to select a point or rectangle area on the screen');
            expect(screenRegionSelectorTool.category).toBe('input');
            expect(JSON.stringify(screenRegionSelectorTool.inputSchema))
                .toStrictEqual(JSON.stringify(ScreenRegionSelectorInputSchema));
            expect(JSON.stringify(screenRegionSelectorTool.outputSchema))
                .toStrictEqual(JSON.stringify(ScreenRegionSelectorOutputUnionSchema));
        });


        test('should generate correct result schema', () => {
            const resultSchema = screenRegionSelectorTool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    x: 0,
                    y: 0
                }
            };

            const parseResult = () => screenRegionSelectorTool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

});