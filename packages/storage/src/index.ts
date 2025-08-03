import { Workflow } from '@app/workflows';

export class WorkflowStorage {
    async saveWorkflow(workflow: Workflow): Promise<void> {
        // TODO: Implement actual file/database storage
        console.log('Saving workflow:', workflow.id);
        // For now, just log it
    }

    async loadWorkflow(id: string): Promise<Workflow | null> {
        // TODO: Implement actual loading
        console.log('Loading workflow:', id);
        return null; // Return null when not found
    }

    async listWorkflows(): Promise<Workflow[]> {
        // TODO: Implement actual listing
        console.log('Listing workflows');
        return []; // Return empty array for now
    }
}