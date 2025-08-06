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
  createNewTemplate: (input: CreateTemplateInput) => Promise<Template>;
  updateExistingTemplate: (input: UpdateTemplateInput) => Promise<Template | null>;
  removeTemplate: (templateId: string) => Promise<boolean>;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [stats, setStats] = useState<TemplateStorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [templatesList, categoriesList, tagsList] = await Promise.all([
        listTemplates(),
        getTemplateCategories(),
        getAllTemplateTags()
      ]);
      
      setTemplates(templatesList);
      setCategories(categoriesList);
      setTags(tagsList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchTemplate = useCallback(async (query: string): Promise<TemplateMetadata[]> => {
    try {
      setError(null);
      return await searchTemplates(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search templates';
      setError(message);
      return [];
    }
  }, []);

  const filterByCategory = useCallback(async (category: string): Promise<TemplateMetadata[]> => {
    try {
      setError(null);
      return await getTemplatesByCategory(category);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to filter templates by category';
      setError(message);
      return [];
    }
  }, []);

  const filterByTags = useCallback(async (tags: string[]): Promise<TemplateMetadata[]> => {
    try {
      setError(null);
      return await getTemplatesByTags(tags);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to filter templates by tags';
      setError(message);
      return [];
    }
  }, []);

  const getTemplateDetail = useCallback(async (templateId: string): Promise<Template | null> => {
    try {
      setError(null);
      return await getTemplate(templateId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get template details';
      setError(message);
      return null;
    }
  }, []);

  const createNewTemplate = useCallback(async (input: CreateTemplateInput): Promise<Template> => {
    try {
      setError(null);
      const template = await createTemplate(input);
      
      // Reload templates to update the list
      await loadTemplates();
      
      return template;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
      throw err;
    }
  }, [loadTemplates]);

  const updateExistingTemplate = useCallback(async (input: UpdateTemplateInput): Promise<Template | null> => {
    try {
      setError(null);
      const template = await updateTemplate(input);
      
      // Reload templates to update the list
      await loadTemplates();
      
      return template;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      setError(message);
      return null;
    }
  }, [loadTemplates]);

  const removeTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await deleteTemplate(templateId);
      
      if (success) {
        // Reload templates to update the list
        await loadTemplates();
      }
      
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      setError(message);
      return false;
    }
  }, [loadTemplates]);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const templateStats = await getTemplateStats();
      setStats(templateStats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load template statistics';
      setError(message);
    }
  }, []);

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