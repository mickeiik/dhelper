
export interface ToolMetadata {
    id: string
    name: string
}
export interface Tool extends ToolMetadata {
    initialize(inputs: any): Promise<any>
    execute(inputs: any): Promise<any>
}

export class ToolManager {
    private tools = new Map<string, Tool>()

    registerTool(tool: Tool) {
        tool.initialize({})
        this.tools.set(tool.id, tool)
        console.log(`ToolManager: "${tool.name}" tool registered`)
    }

    async runTool(id: string, inputs: any) {
        const tool = this.tools.get(id)
        if(tool) {
            console.log(`RunningToolId "${tool.id}"`)
            const result = await tool.execute(inputs);
            console.log(`ToolResult: "${result}"`)
            return result;
        }
    }

    getTools() {
        return Array.from(this.tools.values().map((tool): ToolMetadata => {
            return {
                id: tool.id,
                name: tool.name,
            }
        }))
    }
}