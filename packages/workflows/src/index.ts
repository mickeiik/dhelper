import { ToolManager } from '@app/tools';

export interface Workflow {
    id: string
    name: string
    steps: Array<{
        toolId: string
        inputs: any
    }>
}

export class WorkflowRunner {
    constructor(private toolManager: ToolManager) { }

    async run(workflow: Workflow) {
        let results: Record<string, any> = {}

        for (const step of workflow.steps) {
            const result = await this.toolManager.runTool(step.toolId, step.inputs)
            results[step.toolId] = result

            // Emit progress event
            this.emit('step-done', { stepId: step.toolId, result })
        }

        return results
    }

    // Simple event emitter for progress updates
    private listeners = new Map()
    emit(event: string, data: any) { /* ... */ }
    on(event: string, callback: Function) { /* ... */ }
}