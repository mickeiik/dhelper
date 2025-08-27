import { describe, test, expect, beforeEach, vi } from 'vitest';
import { TemplateMatcherInputSchema, TemplateMatcherOutputSchema } from '../../../../schemas/src';
import { TemplateMatcherTool } from '..';

describe('TemplateMatcherTool Class', () => {
    let templateMatcherTool: TemplateMatcherTool;

    vi.mock('@u4/opencv4nodejs', () => ({
        cv: vi.fn()
    }))

    beforeEach(() => {
        templateMatcherTool = new TemplateMatcherTool();
    });

    describe('TemplateMatcherTool Properties', () => {
        test('should have required properties', () => {
            expect(templateMatcherTool.id).toBe('template-matcher');
            expect(templateMatcherTool.name).toBe('Template Matcher Tool');
            expect(templateMatcherTool.description).toBe('Find specific template match on the current screen using OpenCV');
            expect(templateMatcherTool.category).toBe('computerVision');
            expect(JSON.stringify(templateMatcherTool.inputSchema))
                .toStrictEqual(JSON.stringify(TemplateMatcherInputSchema));
            expect(JSON.stringify(templateMatcherTool.outputSchema))
                .toStrictEqual(JSON.stringify(TemplateMatcherOutputSchema));
        });


        test('should generate correct result schema', () => {
            const resultSchema = templateMatcherTool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    confidence: 0,
                    location: {
                        x: 0,
                        y: 0,
                        width: 1,
                        height: 1,
                    }
                }
            };

            const parseResult = () => templateMatcherTool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

});