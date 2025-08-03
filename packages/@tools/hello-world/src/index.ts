import { Tool } from '@app/tools';

export class HelloWorldTool implements Tool {
  id = 'hello-world'
  name = 'Hello World Tool'

  async initialize(inputs: any) {
      return 
  }

  async execute(input: any) {
    // Do whatever the tool needs to do
    console.log('Hello World: ', input)
    return { success: true, data: input }
  }
}
