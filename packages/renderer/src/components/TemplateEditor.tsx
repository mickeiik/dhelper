// packages/renderer/src/components/TemplateEditor.tsx
import React, { useState } from 'react';
import type { Template, UpdateTemplateInput } from '@app/types';
import { TEMPLATE_CATEGORIES } from '@app/types';
import styles from './TemplateEditor.module.css';

interface TemplateEditorProps {
  template: Template;
  categories: string[];
  tags: string[];
  onSubmit: (input: UpdateTemplateInput) => Promise<void>;
  onCancel: () => void;
}

export function TemplateEditor({ template, categories, tags, onSubmit, onCancel }: TemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || '',
    category: template.category,
    tags: [...template.tags],
    matchThreshold: template.matchThreshold
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState('');

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag) {
      addTag(tag);
      setCustomTag('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter a template name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: UpdateTemplateInput = {
        id: template.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        tags: formData.tags,
        matchThreshold: formData.matchThreshold
      };

      await onSubmit(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className={styles.templateEditor}>
      <div className={styles.header}>
        <h3>Edit Template</h3>
        <button className={styles.closeButton} onClick={onCancel}>×</button>
      </div>

      <div className={styles.content}>
        {/* Template Preview */}
        <div className={styles.preview}>
          {template.imageData ? (
            <img 
              src={`data:image/png;base64,${btoa(String.fromCharCode.apply(null, Array.from(template.imageData)))}`}
              alt={template.name}
              className={styles.image}
            />
          ) : (
            <div className={styles.noPreview}>
              No Preview Available
            </div>
          )}
          
          <div className={styles.imageInfo}>
            <p><strong>Dimensions:</strong> {template.width} × {template.height}</p>
            <p><strong>Created:</strong> {formatDate(template.createdAt)}</p>
            <p><strong>Last Updated:</strong> {formatDate(template.updatedAt)}</p>
            {template.lastUsed && (
              <p><strong>Last Used:</strong> {formatDate(template.lastUsed)}</p>
            )}
            <p><strong>Usage Count:</strong> {template.usageCount}</p>
            {template.successRate !== undefined && (
              <p><strong>Success Rate:</strong> {Math.round(template.successRate * 100)}%</p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">Template Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              {Object.values(TEMPLATE_CATEGORIES).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
              {categories
                .filter(cat => !Object.values(TEMPLATE_CATEGORIES).includes(cat as any))
                .map(category => (
                  <option key={category} value={category}>{category}</option>
                ))
              }
            </select>
          </div>

          {/* Tags */}
          <div className={styles.field}>
            <label>Tags</label>
            <div className={styles.tagSection}>
              <div className={styles.selectedTags}>
                {formData.tags.map(tag => (
                  <span key={tag} className={styles.selectedTag}>
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => removeTag(tag)}
                      className={styles.removeTag}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className={styles.availableTags}>
                {tags
                  .filter(tag => !formData.tags.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className={styles.availableTag}
                    >
                      + {tag}
                    </button>
                  ))
                }
              </div>

              <div className={styles.customTag}>
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add custom tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                />
                <button type="button" onClick={addCustomTag}>Add</button>
              </div>
            </div>
          </div>

          {/* Matching Settings */}
          <fieldset className={styles.matchingSettings}>
            <legend>Matching Settings</legend>
            
            <div className={styles.field}>
              <label htmlFor="matchThreshold">
                Match Threshold: {Math.round(formData.matchThreshold * 100)}%
              </label>
              <input
                id="matchThreshold"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={formData.matchThreshold}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  matchThreshold: parseFloat(e.target.value) 
                }))}
              />
              <small>Higher values require more exact matches</small>
            </div>

            <div className={styles.info}>
              <small>Multi-scale matching is automatically enabled for all templates. Templates will be matched at different resolutions (1080p, 1440p, 4K) without additional configuration.</small>
            </div>
          </fieldset>

          {/* Error Display */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? 'Updating...' : 'Update Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}