import { describe, test, expect, beforeEach, vi } from 'vitest';
import { HelloWorldTool } from '..';
import { HelloWorldInputSchema, HelloWorldOutputSchema } from '@app/schemas';

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

    describe('HelloWorldTool Methods', () => {
        test('should parse and set default values', () => {
            const inputSchemaSpy = vi.spyOn(helloWorldTool.inputSchema, 'parse');
            const executeValidatedSpy = vi.spyOn(helloWorldTool, 'executeValidated');

            helloWorldTool.execute({})

            expect(executeValidatedSpy).toHaveBeenCalledWith({
                message: "Hello World!"
            })

            expect(inputSchemaSpy).toHaveBeenCalled()
        });
    });
});