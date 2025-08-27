import { describe, test, expect, beforeEach } from 'vitest';
import { ClickTool } from '..';
import { ClickInputSchema, ClickOutputSchema } from '../../../../schemas/src';

describe('ClickTool Class', () => {
    let clickTool: ClickTool;

    beforeEach(() => {
        clickTool = new ClickTool();
    });

    describe('ClickTOol Properties', () => {
        test('should have required properties', () => {
            expect(clickTool.id).toBe('click');
            expect(clickTool.name).toBe('Click Tool');
            expect(clickTool.description).toBe('Click at screen positions with multiple click methods and input types');
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

});