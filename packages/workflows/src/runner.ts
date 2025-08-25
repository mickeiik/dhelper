import { ToolManager } from '@app/tools';
import { Workflow } from './workflow.js';

export class WorkflowRunner {
  private toolManager: ToolManager;
  
  constructor(toolManager: ToolManager) {
    this.toolManager = toolManager;
  }

  async run(rawWorkflow: unknown) {
    const workflow = Workflow.fromRaw(rawWorkflow);
    return await workflow.execute(this.toolManager);
  }
}

// Also re-export the main class
export { Workflow };