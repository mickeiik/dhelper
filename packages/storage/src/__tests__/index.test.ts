import { describe, it, expect } from 'vitest';
import * as storageIndex from '../index.js';
import { WorkflowStorage } from '../workflow-storage.js';

describe('Storage index exports', () => {
  it('should export WorkflowStorage', () => {
    expect(storageIndex.WorkflowStorage).toBeDefined();
    expect(storageIndex.WorkflowStorage).toBe(WorkflowStorage);
  });
});