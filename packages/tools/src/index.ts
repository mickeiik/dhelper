export interface Tool {
    id: string
    name: string
    execute(inputs: any): Promise<any>
}

export class ToolManager {
    private tools = new Map<string, Tool>()

    registerTool(tool: Tool) {
        console.log('Register')
        this.tools.set(tool.id, tool)
        console.log('this.tools: ', this.tools.keys())
    }

    async runTool(id: string, inputs: any) {
        const tool = this.tools.get(id)
        if(tool) {
            return await tool.execute(inputs)
        }
    }

    getTools() {
        return Array.from(this.tools.values())
    }
}