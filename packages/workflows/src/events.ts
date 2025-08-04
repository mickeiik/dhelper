import type { WorkflowProgress } from '@app/types';

export class WorkflowEventEmitter {
  private listeners = new Map<string, Function[]>();

  on(event: string, callback: (progress: WorkflowProgress) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data: WorkflowProgress) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in workflow event callback:', error);
        }
      });
    }
  }
}