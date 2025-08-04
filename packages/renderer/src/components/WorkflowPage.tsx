// packages/renderer/src/components/WorkflowPage.tsx
import { useTools } from '../hooks/useTools';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useWorkflowBuilder, type NewStepForm } from '../hooks/useWorkflowBuilder';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { clearWorkflowCache, clearAllCaches } from '@app/preload';
import type { Tool, Workflow, WorkflowResult, WorkflowProgress } from '@app/types';
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
    newStep,
    error: builderError,
    updateNewStep,
    addStep,
    removeStep,
    clearWorkflow,
    clearError: clearBuilderError
  } = useWorkflowBuilder();
  const { progress } = useWorkflowProgress();

  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // Simple error handling
  const currentError = executionError || builderError || toolsError;
  const handleClearError = () => {
    clearExecutionError();
    clearBuilderError();
  };

  const handleClearWorkflowCache = async () => {
    try {
      await clearWorkflowCache(workflow.id);
      setCacheMessage(`✅ Cache cleared for workflow: ${workflow.id}`);
      setTimeout(() => setCacheMessage(null), 3000);
    } catch (error) {
      setCacheMessage(`❌ Failed to clear cache: ${error}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleClearAllCaches = async () => {
    try {
      await clearAllCaches();
      setCacheMessage('✅ All caches cleared');
      setTimeout(() => setCacheMessage(null), 3000);
    } catch (error) {
      setCacheMessage(`❌ Failed to clear all caches: ${error}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleRunWithFreshCache = () => {
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
      <BuilderSection
        workflow={workflow}
        newStep={newStep}
        tools={tools}
        isRunning={isRunning}
        onUpdateStep={updateNewStep}
        onAddStep={addStep}
        onRemoveStep={removeStep}
        onClear={clearWorkflow}
        onRun={() => executeCustomWorkflow(workflow)}
        onRunFresh={handleRunWithFreshCache}
        onClearCache={handleClearWorkflowCache}
      />

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
function ExampleSection({ onRun, isRunning, canRun }: {
  onRun: () => void;
  isRunning: boolean;
  canRun: boolean;
}) {
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

function BuilderSection({
  workflow,
  newStep,
  tools,
  isRunning,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onClear,
  onRun,
  onRunFresh,
  // onClearCache
}: {
  workflow: Workflow;
  newStep: Partial<NewStepForm>;
  tools: Tool[];
  isRunning: boolean;
  onUpdateStep: (updates: Partial<NewStepForm>) => void;
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
  onClear: () => void;
  onRun: () => void;
  onRunFresh: () => void;
  onClearCache: () => void;
}) {
  return (
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
                  onClick={() => onRemoveStep(step.id)}
                  className={styles.dangerButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Step Form */}
      <div className={styles.addStepForm}>
        <h4>Add New Step</h4>
        <div className={styles.formGrid}>
          <input
            type="text"
            placeholder="Step ID"
            value={newStep.id || ''}
            onChange={(e) => onUpdateStep({ id: e.target.value })}
          />
          <select
            value={newStep.toolId || ''}
            onChange={(e) => onUpdateStep({ toolId: e.target.value })}
          >
            <option value="">Select tool...</option>
            {tools.map(tool => (
              <option key={tool.id} value={tool.id}>{tool.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder='{"key": "value"}'
            value={newStep.inputs || '{}'}
            onChange={(e) => onUpdateStep({ inputs: e.target.value })}
            className={styles.monoInput}
          />
          <button onClick={onAddStep} className={styles.successButton}>
            Add Step
          </button>
        </div>

        {/* Cache Configuration */}
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={newStep.cacheEnabled || false}
              onChange={(e) => onUpdateStep({ cacheEnabled: e.target.checked })}
            />
            <span>Enable caching for this step</span>
          </label>

          {newStep.cacheEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Custom cache key (optional)"
                value={newStep.cacheKey || ''}
                onChange={(e) => onUpdateStep({ cacheKey: e.target.value })}
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }}
              />
              <input
                type="number"
                placeholder="TTL (ms, optional)"
                value={newStep.cacheTtl || ''}
                onChange={(e) => onUpdateStep({ cacheTtl: e.target.value })}
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={newStep.cachePersistent !== false}
                  onChange={(e) => onUpdateStep({ cachePersistent: e.target.checked })}
                />
                <span style={{ fontSize: '12px' }}>Persistent</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          onClick={onRun}
          disabled={isRunning || workflow.steps.length === 0}
          className={styles.primaryButton}
        >
          {isRunning ? '🔄 Running...' : '▶️ Run Custom Workflow'}
        </button>
        <button
          onClick={onRunFresh}
          disabled={isRunning || workflow.steps.length === 0}
          className={styles.secondaryButton}
        >
          🔥 Run Fresh (Clear Cache)
        </button>
        <button
          onClick={onClear}
          disabled={workflow.steps.length === 0}
          className={styles.secondaryButton}
        >
          🗑️ Clear All Steps
        </button>
      </div>
    </section>
  );
}

function CacheSection({
  onClearWorkflowCache,
  onClearAllCaches,
  workflowId
}: {
  onClearWorkflowCache: () => void;
  onClearAllCaches: () => void;
  workflowId: string;
}) {
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

function ResultsSection({
  tools,
  isLoadingTools,
  onReloadTools,
  progress,
  result
}: {
  tools: Tool[];
  isLoadingTools: boolean;
  onReloadTools: () => void;
  progress: WorkflowProgress | null;
  result: WorkflowResult | null;
}) {
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