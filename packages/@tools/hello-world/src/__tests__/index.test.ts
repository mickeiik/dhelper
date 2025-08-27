import { describe, test, expect, beforeEach } from 'vitest';
import { HelloWorldTool } from '..';
import { HelloWorldInputSchema, HelloWorldOutputSchema } from '../../../../schemas/src';

describe('HelloWorldTool Class', () => {
    let helloWorldTool: HelloWorldTool;

    beforeEach(() => {
        helloWorldTool = new HelloWorldTool();
    });

    describe('HelloWorldTool Properties', () => {
        test('should have required properties', () => {
            expect(helloWorldTool.id).toBe('hello-world');
            expect(helloWorldTool.name).toBe('Hello World Tool');
            expect(helloWorldTool.description).toBe('Simple debugging tool that logs input and returns it');
            expect(helloWorldTool.category).toBe('debug');
            expect(JSON.stringify(helloWorldTool.inputSchema))
                .toStrictEqual(JSON.stringify(HelloWorldInputSchema));
            expect(JSON.stringify(helloWorldTool.outputSchema))
                .toStrictEqual(JSON.stringify(HelloWorldOutputSchema));
        });

        test('should generate correct result schema', () => {
            const resultSchema = helloWorldTool.resultSchema;
            expect(resultSchema).toBeDefined();

            const result = {
                success: true,
                data: {
                    message: 'message',
                    timestamp: 0,
                }
            };

            const parseResult = () => helloWorldTool.resultSchema.parse(result);

            expect(parseResult).not.toThrow();
        });
    });

});