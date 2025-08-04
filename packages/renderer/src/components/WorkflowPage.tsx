// packages/renderer/src/components/WorkflowPage.tsx
import { useTools } from '../hooks/useTools';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useWorkflowBuilder } from '../hooks/useWorkflowBuilder';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { clearWorkflowCache, clearAllCaches } from '@app/preload';
import { StepBuilder } from './StepBuilder';
import type { Tool, WorkflowResult, WorkflowProgress } from '@app/types';
import styles from './WorkflowPage.module.css';
import { useState } from 'react';

export function WorkflowPage() {
  const { tools, isLoading: isLoadingTools, error: toolsError, reloadTools } = useTools();
  const {
    isRunning,
    lastResult,
    error: executionError,
    executeExample,
    executeCustomWorkflow,
    clearError: clearExecutionError
  } = useWorkflowExecution();
  const {
    workflow,
    error: builderError,
    addStepFromBuilder,
    removeStep,
    clearWorkflow,
    clearError: clearBuilderError
  } = useWorkflowBuilder();
  const { progress } = useWorkflowProgress();

  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // Simple error handling
  const currentError = executionError || builderError || toolsError;
  const handleClearError = (): void => {
    clearExecutionError();
    clearBuilderError();
  };

  const handleClearWorkflowCache = async (): Promise<void> => {
    try {
      await clearWorkflowCache(workflow.id);
      setCacheMessage(`✅ Cache cleared for workflow: ${workflow.id}`);
      setTimeout(() => setCacheMessage(null), 3000);
    } catch (error) {
      setCacheMessage(`❌ Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleClearAllCaches = async (): Promise<void> => {
    try {
      await clearAllCaches();
      setCacheMessage('✅ All caches cleared');
      setTimeout(() => setCacheMessage(null), 3000);
    } catch (error) {
      setCacheMessage(`❌ Failed to clear all caches: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleRunWithFreshCache = (): void => {
    executeCustomWorkflow({ ...workflow, clearCache: true });
  };

  return (
    <div className={styles.container}>
      <h1>Workflow Manager</h1>

      {/* Error Banner */}
      {currentError && (
        <div className={styles.errorBanner}>
          <span>⚠️ {currentError}</span>
          <button onClick={handleClearError} className={styles.closeButton}>×</button>
        </div>
      )}

      {/* Success Banner */}
      {lastResult?.success && (
        <div className={styles.successBanner}>
          ✅ Workflow completed successfully!
          {lastResult.cacheStats && (
            <div className={styles.small} style={{ marginTop: '8px' }}>
              Cache: {lastResult.cacheStats.cacheHits} hits, {lastResult.cacheStats.cacheMisses} misses
              {lastResult.cacheStats.stepsCached.length > 0 && (
                <span> | Cached steps: {lastResult.cacheStats.stepsCached.join(', ')}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cache Message */}
      {cacheMessage && (
        <div className={styles.successBanner}>
          {cacheMessage}
          <button onClick={() => setCacheMessage(null)} className={styles.closeButton}>×</button>
        </div>
      )}

      {/* Example Workflow Section */}
      <ExampleSection
        onRun={executeExample}
        isRunning={isRunning}
        canRun={tools.length > 0 && !isLoadingTools}
      />

      {/* Custom Workflow Builder */}
      <section className={styles.section}>
        <h2>🔧 Build Custom Workflow</h2>

        {/* Current Steps */}
        <div className={styles.stepsContainer}>
          <h3>Current Steps ({workflow.steps.length})</h3>
          {workflow.steps.length === 0 ? (
            <p className={styles.muted}>No steps added yet</p>
          ) : (
            <div className={styles.stepsList}>
              {workflow.steps.map((step, index) => (
                <div key={step.id} className={styles.stepItem}>
                  <div>
                    <strong>{index + 1}. {step.id}</strong><br />
                    <span className={styles.muted}>Tool: {step.toolId}</span><br />
                    <span className={styles.small}>Inputs: {JSON.stringify(step.inputs)}</span>
                    {step.cache?.enabled && (
                      <div className={styles.small} style={{ color: '#4ade80' }}>
                        📦 Cached (persistent: {step.cache.persistent ? 'yes' : 'no'}
                        {step.cache.ttl && `, ttl: ${step.cache.ttl}ms`})
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeStep(step.id)}
                    className={styles.dangerButton}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Step Builder */}
        <StepBuilder
          tools={tools}
          onAddStep={addStepFromBuilder}
        />

        {/* Controls */}
        <div className={styles.controls}>
          <button
            onClick={() => executeCustomWorkflow(workflow)}
            disabled={isRunning || workflow.steps.length === 0}
            className={styles.primaryButton}
          >
            {isRunning ? '🔄 Running...' : '▶️ Run Custom Workflow'}
          </button>
          <button
            onClick={handleRunWithFreshCache}
            disabled={isRunning || workflow.steps.length === 0}
            className={styles.secondaryButton}
          >
            🔥 Run Fresh (Clear Cache)
          </button>
          <button
            onClick={clearWorkflow}
            disabled={workflow.steps.length === 0}
            className={styles.secondaryButton}
          >
            🗑️ Clear All Steps
          </button>
        </div>
      </section>

      {/* Cache Management */}
      <CacheSection
        onClearWorkflowCache={handleClearWorkflowCache}
        onClearAllCaches={handleClearAllCaches}
        workflowId={workflow.id}
      />

      {/* Tools & Results */}
      <ResultsSection
        tools={tools}
        isLoadingTools={isLoadingTools}
        onReloadTools={reloadTools}
        progress={progress}
        result={lastResult}
      />
    </div>
  );
}

// Simple section components (not over-engineered!)
interface ExampleSectionProps {
  onRun: () => void;
  isRunning: boolean;
  canRun: boolean;
}

function ExampleSection({ onRun, isRunning, canRun }: ExampleSectionProps) {
  return (
    <section className={styles.section}>
      <h2>🚀 Example Workflow</h2>
      <p>Run the pre-built example workflow (Screenshot → OCR → Hello World)</p>
      <p className={styles.muted}>
        💡 The screen selection step is cached - you'll only need to select the region once!
      </p>
      <button
        onClick={onRun}
        disabled={isRunning || !canRun}
        className={styles.primaryButton}
      >
        {isRunning ? '🔄 Running...' : '▶️ Run Example Workflow'}
      </button>
    </section>
  );
}

interface CacheSectionProps {
  onClearWorkflowCache: () => Promise<void>;
  onClearAllCaches: () => Promise<void>;
  workflowId: string;
}

function CacheSection({
  onClearWorkflowCache,
  onClearAllCaches,
  workflowId
}: CacheSectionProps) {
  return (
    <section className={styles.section}>
      <h3>🗄️ Cache Management</h3>
      <p className={styles.muted}>
        Cached steps (like screen selections) will reuse previous results until cleared.
      </p>
      <div className={styles.controls}>
        <button
          onClick={onClearWorkflowCache}
          className={styles.secondaryButton}
        >
          🗑️ Clear Cache for "{workflowId}"
        </button>
        <button
          onClick={onClearAllCaches}
          className={styles.secondaryButton}
        >
          🗑️ Clear All Caches
        </button>
      </div>
    </section>
  );
}

interface ResultsSectionProps {
  tools: Tool[];
  isLoadingTools: boolean;
  onReloadTools: () => void;
  progress: WorkflowProgress | null;
  result: WorkflowResult | null;
}

function ResultsSection({
  tools,
  isLoadingTools,
  onReloadTools,
  progress,
  result
}: ResultsSectionProps) {
  return (
    <>
      {/* Tools */}
      <section className={styles.section}>
        <h3>Available Tools ({tools.length})</h3>
        <button
          onClick={onReloadTools}
          disabled={isLoadingTools}
          className={styles.secondaryButton}
        >
          {isLoadingTools ? '🔄 Loading...' : '🔄 Reload Tools'}
        </button>

        {isLoadingTools ? (
          <p className={styles.muted}>Loading tools...</p>
        ) : (
          <div className={styles.toolsGrid}>
            {tools.map(tool => (
              <div key={tool.id} className={styles.toolCard}>
                <strong>{tool.name}</strong>
                <small>{tool.id}</small>
                {tool.category && (
                  <div className={styles.toolCategory}>
                    📂 {tool.category}
                  </div>
                )}
                {tool.description && (
                  <div className={styles.toolDescription}>
                    {tool.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Progress */}
      {progress && (
        <section className={styles.section}>
          <h3>Progress {progress.fromCache && '📦'}</h3>
          <pre className={styles.codeBlock}>
            {JSON.stringify(progress, null, 2)}
          </pre>
        </section>
      )}

      {/* Results */}
      {result && (
        <section className={styles.section}>
          <h3>Last Result</h3>
          <details>
            <summary className={styles.resultSummary}>
              {result.success ? '✅ Success' : '❌ Failed'} - Click to view details
            </summary>
            <pre className={styles.codeBlock}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </>
  );
}