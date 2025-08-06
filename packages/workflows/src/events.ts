import { EventEmitter } from 'node:events';

export class WorkflowEventEmitter extends EventEmitter {
  constructor() {
    super();
    
    // Add error handling for uncaught listener errors
    this.on('error', (error) => {
      console.error('Workflow event error:', error);
    });
  }
}