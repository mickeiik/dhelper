import { HelloWorldInputSchema, HelloWorldOutputSchema, ToolResult } from '@app/schemas';
import { Tool } from '@app/tools';
import { z } from 'zod';

// Type aliases for convenience
type HelloWorldInput = z.infer<typeof HelloWorldInputSchema>;
type HelloWorldOutput = z.infer<typeof HelloWorldOutputSchema>;
type HelloWorldResult = ToolResult<typeof HelloWorldOutputSchema>;

export class HelloWorldTool extends Tool<typeof HelloWorldInputSchema, typeof HelloWorldOutputSchema> {
  id = 'hello-world' as const;
  name = 'Hello World Tool';
  description = 'Simple debugging tool that logs input and returns it';
  category = 'Debug';

  inputSchema = HelloWorldInputSchema;
  outputSchema = HelloWorldOutputSchema;

  examples = [
    {
      name: 'Simple Message',
      description: 'Just log a simple message',
      inputs: {
        message: 'Hello from workflow!',
        data: null
      }
    },
    {
      name: 'Process Previous Step',
      description: 'Log and return output from the previous step',
      inputs: {
        message: 'Previous step result:',
        data: { $ref: '{{previous}}' }
      }
    },
    {
      name: 'Process OCR Result',
      description: 'Log and return OCR text result',
      inputs: {
        message: 'OCR Result:',
        data: { $ref: '{{previous:ocr}}' }
      }
    },
    {
      name: 'Debug Complex Data',
      description: 'Debug complex workflow data',
      inputs: {
        message: 'Debug info:',
        data: {
          timestamp: new Date().toISOString(),
          workflow: 'test-workflow',
          step: 'debug'
        }
      }
    }
  ];

  async initialize() {
    return;
  }

  async executeValidated(input: HelloWorldInput): Promise<HelloWorldResult> {
    const result: HelloWorldOutput = {
      message: input.message,
      data: input.data,
      timestamp: Date.now()
    };

    return {
      success: true,
      data: result
    };
  }
}

