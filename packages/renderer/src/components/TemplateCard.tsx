// packages/renderer/src/components/TemplateCard.tsx
import type { TemplateMetadata } from '@app/types';
import styles from './TemplateCard.module.css';
import { useEffect, useState } from 'react';
import { getTemplate } from '@app/preload';

interface TemplateCardProps {
  template: TemplateMetadata;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
}

export function TemplateCard({ template, viewMode, onEdit, onDelete }: TemplateCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    
    const loadThumbnail = async () => {
      if (template.thumbnailPath) {
        setIsLoadingThumbnail(true);
        try {
          const fullTemplate = await getTemplate(template.id);
          if (!isCancelled && fullTemplate?.thumbnailData) {
            const blob = new Blob([fullTemplate.thumbnailData.buffer as BlobPart], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
            
            return () => {
              URL.revokeObjectURL(url);
            };
          }
        } catch (error) {
          console.warn('Failed to load thumbnail for template:', template.id, error);
        } finally {
          if (!isCancelled) {
            setIsLoadingThumbnail(false);
          }
        }
      }
    };
    
    loadThumbnail();
    
    return () => {
      isCancelled = true;
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [template.id, template.thumbnailPath, thumbnailUrl]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getConfidenceColor = (threshold: number) => {
    if (threshold >= 0.8) return styles.confidenceHigh;
    if (threshold >= 0.6) return styles.confidenceMedium;
    return styles.confidenceLow;
  };

  const getSuccessRateColor = (rate?: number) => {
    if (!rate) return styles.successRateUnknown;
    if (rate >= 0.8) return styles.successRateHigh;
    if (rate >= 0.6) return styles.successRateMedium;
    return styles.successRateLow;
  };

  return (
    <div className={`${styles.templateCard} ${styles[viewMode]}`}>
      {/* Template Preview */}
      <div className={styles.preview}>
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt={template.name}
            className={styles.thumbnail}
          />
        ) : isLoadingThumbnail ? (
          <div className={styles.noPreview}>
            <span>Loading...</span>
          </div>
        ) : (
          <div className={styles.noPreview}>
            <span>No Preview</span>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className={styles.info}>
        <div className={styles.header}>
          <h3 className={styles.name}>{template.name}</h3>
          <div className={styles.actions}>
            <button 
              className={styles.editButton}
              onClick={onEdit}
              title="Edit template"
            >
              ✏️
            </button>
            <button 
              className={styles.deleteButton}
              onClick={onDelete}
              title="Delete template"
            >
              🗑️
            </button>
          </div>
        </div>

        {template.description && (
          <p className={styles.description}>{template.description}</p>
        )}

        <div className={styles.metadata}>
          <div className={styles.category}>
            <span className={styles.label}>Category:</span>
            <span className={styles.value}>{template.category}</span>
          </div>

          {template.tags.length > 0 && (
            <div className={styles.tags}>
              <span className={styles.label}>Tags:</span>
              <div className={styles.tagList}>
                {template.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.dimensions}>
            <span className={styles.label}>Size:</span>
            <span className={styles.value}>{template.width} × {template.height}</span>
          </div>

          <div className={styles.confidence}>
            <span className={styles.label}>Confidence:</span>
            <span className={`${styles.value} ${getConfidenceColor(template.matchThreshold)}`}>
              {Math.round(template.matchThreshold * 100)}%
            </span>
          </div>

          {template.successRate !== undefined && (
            <div className={styles.successRate}>
              <span className={styles.label}>Success Rate:</span>
              <span className={`${styles.value} ${getSuccessRateColor(template.successRate)}`}>
                {Math.round(template.successRate * 100)}%
              </span>
            </div>
          )}

          <div className={styles.usage}>
            <span className={styles.label}>Used:</span>
            <span className={styles.value}>{template.usageCount} times</span>
          </div>

          <div className={styles.dates}>
            <div className={styles.date}>
              <span className={styles.label}>Created:</span>
              <span className={styles.value}>{formatDate(template.createdAt)}</span>
            </div>
            <div className={styles.date}>
              <span className={styles.label}>Updated:</span>
              <span className={styles.value}>{formatDate(template.updatedAt)}</span>
            </div>
            {template.lastUsed && (
              <div className={styles.date}>
                <span className={styles.label}>Last Used:</span>
                <span className={styles.value}>{formatDate(template.lastUsed)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Color Profile Indicator */}
        {template.colorProfile && template.colorProfile !== 'auto' && (
          <div className={styles.colorProfile}>
            <span className={`${styles.colorBadge} ${styles[template.colorProfile]}`}>
              {template.colorProfile}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}