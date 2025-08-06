// packages/renderer/src/components/TemplateManager.tsx
import React, { useState, useCallback } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { TemplateCard } from './TemplateCard';
import { TemplateUpload } from './TemplateUpload';
import { TemplateEditor } from './TemplateEditor';
import type { TemplateMetadata, Template, CreateTemplateInput, UpdateTemplateInput } from '@app/types';
import styles from './TemplateManager.module.css';

export function TemplateManager() {
  const {
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
  } = useTemplates();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateMetadata[]>(templates);
  const [showUpload, setShowUpload] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  React.useEffect(() => {
    setFilteredTemplates(templates);
  }, [templates]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    
    const results = await searchTemplate(query);
    setFilteredTemplates(results);
  }, [templates, searchTemplate]);

  const handleCategoryFilter = useCallback(async (category: string) => {
    setSelectedCategory(category);
    if (!category) {
      setFilteredTemplates(templates);
      return;
    }
    
    const results = await filterByCategory(category);
    setFilteredTemplates(results);
  }, [templates, filterByCategory]);

  const handleTagFilter = useCallback(async (selectedTags: string[]) => {
    setSelectedTags(selectedTags);
    if (selectedTags.length === 0) {
      setFilteredTemplates(templates);
      return;
    }
    
    const results = await filterByTags(selectedTags);
    setFilteredTemplates(results);
  }, [templates, filterByTags]);

  const handleCreateTemplate = useCallback(async (input: CreateTemplateInput) => {
    try {
      await createNewTemplate(input);
      setShowUpload(false);
    } catch {
      // Error is handled by the hook
    }
  }, [createNewTemplate]);

  const handleUpdateTemplate = useCallback(async (input: UpdateTemplateInput) => {
    try {
      await updateExistingTemplate(input);
      setEditingTemplate(null);
    } catch {
      // Error is handled by the hook
    }
  }, [updateExistingTemplate]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await removeTemplate(templateId);
    }
  }, [removeTemplate]);

  const handleEditTemplate = useCallback(async (templateId: string) => {
    const template = await getTemplateDetail(templateId);
    setEditingTemplate(template);
  }, [getTemplateDetail]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
    setFilteredTemplates(templates);
  }, [templates]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading && templates.length === 0) {
    return <div className={styles.loading}>Loading templates...</div>;
  }

  return (
    <div className={styles.templateManager}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Template Manager</h2>
        <div className={styles.headerActions}>
          <button 
            className={styles.uploadButton}
            onClick={() => setShowUpload(true)}
          >
            + Create Template
          </button>
          <button 
            className={styles.refreshButton}
            onClick={loadTemplates}
            disabled={isLoading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.totalTemplates}</span>
            <span className={styles.statLabel}>Templates</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{Object.keys(stats.categoryCounts).length}</span>
            <span className={styles.statLabel}>Categories</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{Math.round(stats.imageSize / 1024)} KB</span>
            <span className={styles.statLabel}>Images</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterRow}>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className={styles.categoryFilter}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <div className={styles.tagFilter}>
            {tags.map(tag => (
              <label key={tag} className={styles.tagCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleTagFilter([...selectedTags, tag]);
                    } else {
                      handleTagFilter(selectedTags.filter(t => t !== tag));
                    }
                  }}
                />
                {tag}
              </label>
            ))}
          </div>

          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'grid' ? styles.active : ''}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>

          {(searchQuery || selectedCategory || selectedTags.length > 0) && (
            <button className={styles.clearFilters} onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={clearError} className={styles.errorClose}>×</button>
        </div>
      )}

      {/* Template Grid/List */}
      <div className={`${styles.templateGrid} ${styles[viewMode]}`}>
        {filteredTemplates.length === 0 ? (
          <div className={styles.empty}>
            {searchQuery || selectedCategory || selectedTags.length > 0
              ? 'No templates match your filters.'
              : 'No templates yet. Create your first template!'
            }
          </div>
        ) : (
          filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode={viewMode}
              onEdit={() => handleEditTemplate(template.id)}
              onDelete={() => handleDeleteTemplate(template.id)}
            />
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <TemplateUpload
              categories={categories}
              tags={tags}
              onSubmit={handleCreateTemplate}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <TemplateEditor
              template={editingTemplate}
              categories={categories}
              tags={tags}
              onSubmit={handleUpdateTemplate}
              onCancel={() => setEditingTemplate(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}