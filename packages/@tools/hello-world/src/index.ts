// packages/@tools/hello-world/src/index.ts
import type { Tool, ToolInputField, ToolOutputField } from '@app/types';

export interface HelloWorldToolInput {
  message?: string;
  data?: unknown;
}

export interface HelloWorldToolOutput {
  success: boolean;
  data: unknown;
}

export class HelloWorldTool implements Tool<HelloWorldToolInput, HelloWorldToolOutput> {
  id = 'hello-world' as const;
  name = 'Hello World Tool';
  description = 'Simple debugging tool that logs input and returns it';
  category = 'Debug';

  inputFields: ToolInputField[] = [
    {
      name: 'message',
      type: 'string',
      description: 'A message to include in the output',
      required: false,
      defaultValue: 'Hello World!',
      placeholder: 'Enter your message...'
    },
    {
      name: 'data',
      type: 'object',
      description: 'Any data to process and return',
      required: false,
      example: { key: 'value', number: 42 }
    }
  ];

  outputFields: ToolOutputField[] = [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether the operation was successful',
      example: true
    },
    {
      name: 'data',
      type: 'object',
      description: 'The processed data returned by the tool',
      example: { message: 'Hello World!', data: null }
    }
  ];

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

  async execute(input: HelloWorldToolInput): Promise<HelloWorldToolOutput> {
    return { success: true, data: input };
  }
}

