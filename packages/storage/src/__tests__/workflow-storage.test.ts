import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowStorage } from '../workflow-storage.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import z from 'zod';
import { WorkflowSchema } from '../../../schemas/src';

describe('WorkflowStorage', () => {
  let storage: WorkflowStorage;
  let testDir: string;

  const mockWorkflow: z.infer<typeof WorkflowSchema> = {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    description: 'A test workflow for unit testing',
    steps: [
      {
        id: 'step-1',
        toolId: 'hello-world',
        inputs: { param: 'value' },
        onError: 'stop'
      }
    ]
  };


  beforeEach(async () => {
    testDir = join(tmpdir(), 'workflow-storage-test', Date.now().toString());
    storage = new WorkflowStorage(testDir);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Save Method', () => {
    test('should save a valid workflow', async () => {
      const expectedSavePath = join(testDir, `${mockWorkflow.id}.json`);
      expect(existsSync(expectedSavePath)).toBe(false);

      await storage.save(mockWorkflow);

      expect(existsSync(expectedSavePath)).toBe(true);
    });

    test('should reject invalid workflow data', async () => {
      const invalidWorkflow = {
        id: '', // Invalid - empty id
        name: 'Test',
        steps: []
      };

      await expect(storage.save(invalidWorkflow as any)).rejects.toThrow();
    });

    test('should create storage directory if it does not exist', async () => {
      const nonExistentDir = join(testDir, 'non-existent-' + Date.now());
      const newStorage = new WorkflowStorage(nonExistentDir);

      expect(existsSync(nonExistentDir)).toBe(false);

      await newStorage.save(mockWorkflow);

      expect(existsSync(nonExistentDir)).toBe(true);
    });
  });

  describe('Constructor and Initialization', () => {
    test('should create with default directory when no path provided', async () => {
      const mockStoragePath = join(testDir, 'default');

      const { getPath } = vi.hoisted(() => {
        return { getPath: vi.fn() }
      })

      vi.mock('electron', () => ({
        app: {
          getPath: getPath
        }
      }));

      getPath.mockReturnValue(mockStoragePath)

      expect(existsSync(mockStoragePath)).toBe(false);

      const defaultStorage = new WorkflowStorage();
      await defaultStorage.save(mockWorkflow)
      expect(existsSync(mockStoragePath)).toBe(true);
    });

    test('should use correct file paths for workflow storage', async () => {
      const expectedPath = join(testDir, `${mockWorkflow.id}.json`);
      expect(existsSync(expectedPath)).toBe(false);

      await storage.save(mockWorkflow);
      // Test that the file exists at the expected location

      expect(existsSync(expectedPath)).toBe(true);
    });

    test('should handle different workflow IDs in file paths', async () => {
      const workflows = [
        { ...mockWorkflow, id: 'simple-id' },
        { ...mockWorkflow, id: 'workflow-with-dashes' },
        { ...mockWorkflow, id: 'workflow_with_underscores' }
      ];

      for (const workflow of workflows) {
        const expectedPath = join(testDir, `${workflow.id}.json`);
        expect(existsSync(expectedPath)).toBe(false);

        await storage.save(workflow);

        expect(existsSync(expectedPath)).toBe(true);
      }
    });
  });

  describe('Load Method', () => {
    test('should load existing workflow', async () => {
      await storage.save(mockWorkflow);

      const loaded = await storage.load(mockWorkflow.id);

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(mockWorkflow.id);
      expect(loaded!.name).toBe(mockWorkflow.name);
      expect(loaded!.description).toBe(mockWorkflow.description);
      expect(loaded!.createdAt).toBeInstanceOf(Date);
      expect(loaded!.updatedAt).toBeInstanceOf(Date);
    });

    test('should return null for non-existent workflow', async () => {
      const loaded = await storage.load('non-existent-id');
      expect(loaded).toBeNull();
    });

    test('should parse dates correctly from JSON', async () => {
      await storage.save(mockWorkflow);

      const loaded = await storage.load(mockWorkflow.id);

      expect(loaded!.createdAt).toBeInstanceOf(Date);
      expect(loaded!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Delete Method', () => {
    test('should delete existing workflow', async () => {
      await storage.save(mockWorkflow);
      const expectedPath = join(testDir, `${mockWorkflow.id}.json`);

      expect(existsSync(expectedPath)).toBe(true);

      const deleted = await storage.delete(mockWorkflow.id);

      expect(deleted).toBe(true);
      expect(existsSync(expectedPath)).toBe(false);
    });

    test('should return false when deleting non-existent workflow', async () => {
      const deleted = await storage.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('List Method', () => {
    test('should return empty array when no workflows exist', async () => {
      const list = await storage.list();
      expect(list).toEqual([]);
    });

    test('should return list of workflows', async () => {
      const workflow2 = { ...mockWorkflow, id: 'workflow-2', name: 'Second Workflow' };

      await storage.save(mockWorkflow);
      await storage.save(workflow2);

      const list = await storage.list();

      expect(list).toHaveLength(2);
      expect(list[0]).toHaveProperty('id');
      expect(list[0]).toHaveProperty('name');
      expect(list[0]).toHaveProperty('createdAt');
      expect(list[0]).toHaveProperty('updatedAt');
      expect(list[0]).toHaveProperty('tags');
      expect(list[1]).toHaveProperty('id');
      expect(list[1]).toHaveProperty('name');
      expect(list[1]).toHaveProperty('createdAt');
      expect(list[1]).toHaveProperty('updatedAt');
      expect(list[1]).toHaveProperty('tags');
    });

    test('should sort workflows by updated date (newest first)', async () => {
      await storage.save(mockWorkflow);

      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const workflow2 = { ...mockWorkflow, id: 'workflow-2', name: 'Newer Workflow' };
      await storage.save(workflow2);

      const list = await storage.list();

      expect(list[0].id).toBe('workflow-2');
      expect(list[1].id).toBe('test-workflow-1');
    });

    test('should skip invalid workflow files', async () => {
      await storage.save(mockWorkflow);

      // Create an invalid JSON file
      const invalidFile = join(testDir, 'invalid.json');
      await require('fs').promises.writeFile(invalidFile, '{ invalid json', 'utf-8');

      const list = await storage.list();

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(mockWorkflow.id);
    });
  });

  describe('Additional Methods', () => {
    test('exists() should return correct boolean', async () => {
      expect(await storage.exists(mockWorkflow.id)).toBe(false);

      await storage.save(mockWorkflow);

      expect(await storage.exists(mockWorkflow.id)).toBe(true);
    });

    test('clear() should remove all workflows', async () => {
      const workflow2 = { ...mockWorkflow, id: 'workflow-2' };

      await storage.save(mockWorkflow);
      await storage.save(workflow2);

      expect((await storage.list())).toHaveLength(2);

      await storage.clear();

      expect((await storage.list())).toHaveLength(0);
    });

    test('duplicate() should create copy of workflow', async () => {
      await storage.save(mockWorkflow);

      await storage.duplicate('test-workflow-1', 'duplicated-workflow', 'Duplicated Workflow');

      const original = await storage.load('test-workflow-1');
      const duplicate = await storage.load('duplicated-workflow');

      expect(duplicate).not.toBeNull();
      expect(duplicate!.id).toBe('duplicated-workflow');
      expect(duplicate!.name).toBe('Duplicated Workflow');
      expect(duplicate!.description).toBe(original!.description);
      expect(duplicate!.steps).toEqual(original!.steps);
    });

    test('duplicate() should use default name if not provided', async () => {
      await storage.save(mockWorkflow);

      await storage.duplicate('test-workflow-1', 'duplicated-workflow');

      const duplicate = await storage.load('duplicated-workflow');

      expect(duplicate!.name).toBe('Test Workflow (Copy)');
    });

    test('duplicate() should throw error for non-existent source', async () => {
      await expect(storage.duplicate('non-existent', 'new-id')).rejects.toThrow('Source workflow non-existent not found');
    });

    test('search() should find workflows by name', async () => {
      const workflow2 = { ...mockWorkflow, id: 'workflow-2', name: 'Different Name' };

      await storage.save(mockWorkflow);
      await storage.save(workflow2);

      const results = await storage.search('Different Name');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Different Name');
    });

    test('search() should find workflows by description', async () => {
      await storage.save(mockWorkflow);

      const results = await storage.search('unit testing');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(mockWorkflow.id);
    });

    test('search() should be case insensitive', async () => {
      await storage.save(mockWorkflow);

      const results = await storage.search('TEST WORKFLOW');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(mockWorkflow.id);
    });

    test('search() should return empty array for no matches', async () => {
      await storage.save(mockWorkflow);

      const results = await storage.search('nonexistent');

      expect(results).toHaveLength(0);
    });
  });
});
