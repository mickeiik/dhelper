// packages/renderer/src/hooks/useTemplates.ts
import { useState, useEffect, useCallback } from 'react';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  searchTemplates,
  getTemplatesByCategory,
  getTemplatesByTags,
  getTemplateCategories,
  getAllTemplateTags,
  getTemplateStats
} from '@app/preload';
import type {
  TemplateMetadata,
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateStorageStats
} from '@app/types';
import { useErrorHandler } from './useErrorHandler.js';

export interface UseTemplatesReturn {
  // Data
  templates: TemplateMetadata[];
  categories: string[];
  tags: string[];
  stats: TemplateStorageStats | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTemplates: () => Promise<void>;
  searchTemplate: (query: string) => Promise<TemplateMetadata[]>;
  filterByCategory: (category: string) => Promise<TemplateMetadata[]>;
  filterByTags: (tags: string[]) => Promise<TemplateMetadata[]>;
  getTemplateDetail: (templateId: string) => Promise<Template | null>;
  createNewTemplate: (input: CreateTemplateInput) => Promise<Template | null>;
  updateExistingTemplate: (input: UpdateTemplateInput) => Promise<Template | null>;
  removeTemplate: (templateId: string) => Promise<boolean>;
  loadStats: () => Promise<TemplateStorageStats | null>;
  clearError: () => void;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [stats, setStats] = useState<TemplateStorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { error, clearError, handleAsync } = useErrorHandler();

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    await handleAsync(async () => {
      const [templatesList, categoriesList, tagsList] = await Promise.all([
        listTemplates(),
        getTemplateCategories(),
        getAllTemplateTags()
      ]);

      setTemplates(templatesList);
      setCategories(categoriesList);
      setTags(tagsList);
    });
    setIsLoading(false);
  }, [handleAsync]);

  const searchTemplate = useCallback(async (query: string): Promise<TemplateMetadata[]> => {
    return await handleAsync(() => searchTemplates(query), []) || [];
  }, [handleAsync]);

  const filterByCategory = useCallback(async (category: string): Promise<TemplateMetadata[]> => {
    return await handleAsync(() => getTemplatesByCategory(category), []) || []
  }, [handleAsync]);

  const filterByTags = useCallback(async (tags: string[]): Promise<TemplateMetadata[]> => {
    return await handleAsync(() => getTemplatesByTags(tags), []) || []
  }, [handleAsync]);

  const getTemplateDetail = useCallback(async (templateId: string): Promise<Template | null> => {
    return await handleAsync(() => getTemplate(templateId), null) || null;
  }, [handleAsync]);

  const createNewTemplate = useCallback(async (input: CreateTemplateInput): Promise<Template | null> => {
    return await handleAsync(async () => {
      const template = await createTemplate(input);
      // Reload templates to update the list
      await loadTemplates();
      return template;
    }, null) || null;
  }, [loadTemplates, handleAsync]);

  const updateExistingTemplate = useCallback(async (input: UpdateTemplateInput): Promise<Template | null> => {
    return await handleAsync(async () => {
      const template = await updateTemplate(input);
      // Reload templates to update the list
      await loadTemplates();
      return template;
    }, null) || null;
  }, [loadTemplates, handleAsync]);

  const removeTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    return await handleAsync(async () => {
      const success = await deleteTemplate(templateId);
      // Reload templates to update the list
      await loadTemplates();
      return success;
    }, false) || false;
  }, [loadTemplates, handleAsync]);

  const loadStats = useCallback(async (): Promise<TemplateStorageStats | null> => {
    return await handleAsync(async () => {
      const templateStats = await getTemplateStats();
      // Reload templates to update the list
      await loadTemplates();
      setStats(templateStats);
      return templateStats;
    }, null) || null;
  }, [loadTemplates, handleAsync]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    categories,
    tags,
    stats,
    isLoading,
    error,
    loadTemplates,
    searchTemplate,
    filterByCategory,
    filterByTags,
    getTemplateDetail,
    createNewTemplate,
    updateExistingTemplate,
    removeTemplate,
    loadStats,
    clearError
  };
}