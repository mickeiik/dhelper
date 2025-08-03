import { Workflow } from '@app/workflows';

export class WorkflowStorage {
    async saveWorkflow(workflow: Workflow) {
        // Save to file or database
    }

    //@ts-expect-error A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.ts(2355)
    async loadWorkflow(id: string): Promise<Workflow> {
        // Load from storage
    }

    //@ts-expect-error A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.ts(2355)
    async listWorkflows(): Promise<Workflow[]> {
        // Return all workflows
    }
}