// packages/@tools/hello-world/src/index.ts
import { Tool, ToolInputField } from '@app/types';

export interface HelloWorldToolInput {
  message?: string;
  data?: any;
}

export interface HelloWorldToolOutput {
  success: boolean;
  data: any;
}

export class HelloWorldTool implements Tool {
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
      name: 'Process OCR Result',
      description: 'Log and return OCR text result',
      inputs: {
        message: 'OCR Result:',
        data: { $ref: 'ocr-step-id' }
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

  async initialize(inputs: any) {
    return;
  }

  async execute(input: HelloWorldToolInput): Promise<HelloWorldToolOutput> {
    console.log('Hello World: ', input);
    return { success: true, data: input };
  }
}

// Self-register types for autocomplete
declare module '@app/tools' {
  interface ToolRegistry {
    'hello-world': {
      input: HelloWorldToolInput;
      output: HelloWorldToolOutput;
    };
  }
}