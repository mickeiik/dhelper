// packages/renderer/src/components/TemplateUpload.tsx
import React, { useState, useRef } from 'react';
import { TEMPLATE_CATEGORIES, type CreateTemplateInput } from '@app/types';
import { useTools } from '../hooks/useTools';
import styles from './TemplateUpload.module.css';

interface TemplateUploadProps {
  categories: string[];
  tags: string[];
  onSubmit: (input: CreateTemplateInput) => Promise<void>;
  onCancel: () => void;
}

export function TemplateUpload({ categories, tags, onSubmit, onCancel }: TemplateUploadProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: categories[0] || 'Custom',
    tags: [] as string[],
    matchThreshold: 0.8,
    scaleTolerance: 0.1,
    rotationTolerance: 5,
    colorProfile: 'auto' as 'light' | 'dark' | 'auto'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRunning, runToolAsync } = useTools();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleDroppedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Process the dropped file directly instead of simulating an event
      handleDroppedFile(file);
    }
  };

  const handleDroppedFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-generate name from filename if empty
    if (!formData.name) {
      const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      setFormData(prev => ({ ...prev, name }));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

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

  const handleScreenshotArea = async () => {
    try {
      setError(null);
      
      // Step 1: Run screen region selector to get coordinates
      const regionResult = await runToolAsync('screen-region-selector', {
        mode: 'rectangle',
        timeout: 30000
      });
      
      // Step 2: Use the coordinates to take a screenshot
      const screenshotDataUrl = await runToolAsync('screenshot', {
        top: regionResult.top,
        left: regionResult.left,
        width: regionResult.width,
        height: regionResult.height
      });
      
      // Step 3: Convert data URL to File object
      const response = await fetch(screenshotDataUrl);
      const blob = await response.blob();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `screenshot-${timestamp}.png`, { type: 'image/png' });
      
      // Step 4: Process the screenshot as if it was uploaded
      handleDroppedFile(file);
      
    } catch (err) {
      // Don't set error for user cancellation
      if (err instanceof Error && err.message.includes('cancelled')) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to capture screenshot';
      setError(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a template name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert file to Uint8Array (browser-compatible)
      const arrayBuffer = await selectedFile.arrayBuffer();
      const imageData = new Uint8Array(arrayBuffer);

      const input: CreateTemplateInput = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        tags: formData.tags,
        imageData,
        matchThreshold: formData.matchThreshold,
        scaleTolerance: formData.scaleTolerance || undefined,
        rotationTolerance: formData.rotationTolerance || undefined,
        colorProfile: formData.colorProfile
      };

      await onSubmit(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.templateUpload}>
      <div className={styles.header}>
        <h3>Create New Template</h3>
        <button className={styles.closeButton} onClick={onCancel}>×</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* File Upload */}
        <div className={styles.fileUpload}>
          <div 
            className={styles.dropZone}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className={styles.preview}>
                <img src={imagePreview} alt="Template preview" />
                <button 
                  type="button" 
                  className={styles.changeImage}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className={styles.uploadPrompt}>
                <div className={styles.uploadIcon}>📁</div>
                <p>Click to select an image or drag and drop</p>
                <p className={styles.fileInfo}>PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
          </div>
        </div>

        {/* Screenshot Area Button */}
        <div className={styles.screenshotSection}>
          <div className={styles.divider}>
            <span>OR</span>
          </div>
          <button 
            type="button" 
            className={styles.screenshotButton}
            onClick={handleScreenshotArea}
            disabled={isRunning || isSubmitting}
          >
            {isRunning ? (
              <>
                <span className={styles.spinner}>⏳</span>
                Selecting Area...
              </>
            ) : (
              <>
                📷 Screenshot Area
              </>
            )}
          </button>
          <p className={styles.screenshotHint}>
            Click to select a rectangular area on your screen to use as template
          </p>
        </div>

        {/* Template Details */}
        <div className={styles.details}>
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

          {/* Advanced Settings */}
          <details className={styles.advancedSettings}>
            <summary>Advanced Settings</summary>
            
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
            </div>

            <div className={styles.field}>
              <label htmlFor="scaleTolerance">
                Scale Tolerance: {Math.round((formData.scaleTolerance || 0) * 100)}%
              </label>
              <input
                id="scaleTolerance"
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={formData.scaleTolerance || 0}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  scaleTolerance: parseFloat(e.target.value) 
                }))}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rotationTolerance">
                Rotation Tolerance: {formData.rotationTolerance || 0}°
              </label>
              <input
                id="rotationTolerance"
                type="range"
                min="0"
                max="45"
                step="1"
                value={formData.rotationTolerance || 0}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  rotationTolerance: parseInt(e.target.value) 
                }))}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="colorProfile">Color Profile</label>
              <select
                id="colorProfile"
                value={formData.colorProfile}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  colorProfile: e.target.value as 'light' | 'dark' | 'auto'
                }))}
              >
                <option value="auto">Auto</option>
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
            </div>
          </details>
        </div>

        {/* Error Display */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Actions */}
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || !selectedFile}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
}