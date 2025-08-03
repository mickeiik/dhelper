// packages/@tools/hello-world/src/index.ts
import { Tool } from '@app/tools';

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