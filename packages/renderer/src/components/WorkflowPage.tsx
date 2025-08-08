// packages/renderer/src/components/WorkflowPage.tsx
import { useTools } from '../hooks/useTools';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useWorkflowBuilder } from '../hooks/useWorkflowBuilder';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import { clearWorkflowCache, clearAllCaches, saveWorkflow, loadWorkflow, listWorkflows, deleteWorkflow } from '@app/preload';
import { SimpleStepBuilder } from './SimpleStepBuilder';
import { AdvancedStepBuilder } from './AdvancedStepBuilder';
import type { ToolMetadata, WorkflowResult, WorkflowProgress, Workflow, WorkflowStep } from '@app/types';
import type { WorkflowListItem } from '@app/storage';
import styles from './WorkflowPage.module.css';
import React, { useState } from 'react';

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
  const [showAdvancedBuilder, setShowAdvancedBuilder] = useState<boolean>(false);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowListItem[]>([]);
  const [loadedWorkflow, setLoadedWorkflow] = useState<Workflow | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [workflowName, setWorkflowName] = useState<string>('');
  const [workflowDescription, setWorkflowDescription] = useState<string>('');
  const [showWorkflowManager, setShowWorkflowManager] = useState<boolean>(false);

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

  const loadSavedWorkflows = async (): Promise<void> => {
    try {
      const workflows = await listWorkflows();
      setSavedWorkflows(workflows);
    } catch (error) {
      console.error('Failed to load saved workflows:', error);
    }
  };

  const handleSaveWorkflow = async (): Promise<void> => {
    if (!workflowName.trim()) {
      setCacheMessage('❌ Please enter a workflow name');
      setTimeout(() => setCacheMessage(null), 3000);
      return;
    }

    try {
      const workflowToSave: Workflow = {
        ...workflow,
        name: workflowName,
        description: workflowDescription || workflow.description
      };

      await saveWorkflow(workflowToSave, {
        description: workflowDescription,
        tags: []
      });

      setCacheMessage(`✅ Workflow "${workflowName}" saved successfully`);
      setTimeout(() => setCacheMessage(null), 3000);
      setWorkflowName('');
      setWorkflowDescription('');
      await loadSavedWorkflows();
    } catch (error) {
      setCacheMessage(`❌ Failed to save workflow: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleLoadWorkflow = async (workflowId: string): Promise<void> => {
    try {
      const loaded = await loadWorkflow(workflowId);
      if (loaded) {
        setLoadedWorkflow(loaded);
        const allStepIds = new Set(loaded.steps.map(step => step.id));
        setSelectedSteps(allStepIds);
        setCacheMessage(`✅ Workflow "${loaded.name}" loaded successfully`);
      } else {
        setCacheMessage(`❌ Workflow not found: ${workflowId}`);
      }
      setTimeout(() => setCacheMessage(null), 3000);
    } catch (error) {
      setCacheMessage(`❌ Failed to load workflow: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string): Promise<void> => {
    try {
      await deleteWorkflow(workflowId);
      setCacheMessage(`✅ Workflow deleted successfully`);
      setTimeout(() => setCacheMessage(null), 3000);
      await loadSavedWorkflows();
    } catch (error) {
      setCacheMessage(`❌ Failed to delete workflow: ${error instanceof Error ? error.message : String(error)}`);
      setTimeout(() => setCacheMessage(null), 3000);
    }
  };

  const handleRunLoadedWorkflow = (): void => {
    if (!loadedWorkflow) return;

    const selectedStepsList = Array.from(selectedSteps);
    const workflowToRun = {
      ...loadedWorkflow,
      steps: loadedWorkflow.steps.filter(step => selectedStepsList.includes(step.id))
    };

    executeCustomWorkflow(workflowToRun);
  };

  const handleRefreshSteps = (stepIds: string[]): void => {
    const updatedWorkflow = {
      ...loadedWorkflow!,
      steps: loadedWorkflow!.steps.map(step =>
        stepIds.includes(step.id)
          ? { ...step, cache: { ...step.cache, enabled: false } }
          : step
      )
    };

    executeCustomWorkflow(updatedWorkflow);
  };

  React.useEffect(() => {
    if (showWorkflowManager) {
      loadSavedWorkflows();
    }
  }, [showWorkflowManager]);

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <h1>🚀 Workflow Automation</h1>
        <p className={styles.subtitle}>
          Chain tools together to automate complex tasks with intelligent caching
        </p>
      </div>

      {/* Status Messages */}
      <StatusMessages
        currentError={currentError}
        onClearError={handleClearError}
        lastResult={lastResult}
        cacheMessage={cacheMessage}
        onClearCacheMessage={() => setCacheMessage(null)}
      />

      {/* Quick Start Section */}
      <QuickStartSection
        onRunExample={executeExample}
        onClearAllCaches={handleClearAllCaches}
        isRunning={isRunning}
        canRun={tools.length > 0 && !isLoadingTools}
        toolsCount={tools.length}
      />

      {/* Workflow Manager Section */}
      <WorkflowManagerSection
        showManager={showWorkflowManager}
        onToggleManager={() => setShowWorkflowManager(!showWorkflowManager)}
        savedWorkflows={savedWorkflows}
        onLoadWorkflow={handleLoadWorkflow}
        onDeleteWorkflow={handleDeleteWorkflow}
        currentWorkflow={workflow}
        workflowName={workflowName}
        setWorkflowName={setWorkflowName}
        workflowDescription={workflowDescription}
        setWorkflowDescription={setWorkflowDescription}
        onSaveWorkflow={handleSaveWorkflow}
        isRunning={isRunning}
      />

      {/* Loaded Workflow Viewer */}
      {loadedWorkflow && (
        <LoadedWorkflowViewer
          workflow={loadedWorkflow}
          selectedSteps={selectedSteps}
          onToggleStep={(stepId) => {
            const newSelected = new Set(selectedSteps);
            if (newSelected.has(stepId)) {
              newSelected.delete(stepId);
            } else {
              newSelected.add(stepId);
            }
            setSelectedSteps(newSelected);
          }}
          onRunWorkflow={handleRunLoadedWorkflow}
          onRefreshSteps={handleRefreshSteps}
          isRunning={isRunning}
          progress={progress}
        />
      )}

      {/* Current Workflow Display */}
      {workflow.steps.length > 0 && (
        <WorkflowDisplay
          workflow={workflow}
          onRemoveStep={removeStep}
          onExecute={() => executeCustomWorkflow(workflow)}
          onExecuteFresh={handleRunWithFreshCache}
          onClear={clearWorkflow}
          onClearCache={handleClearWorkflowCache}
          onSaveWorkflow={handleSaveWorkflow}
          workflowName={workflowName}
          setWorkflowName={setWorkflowName}
          workflowDescription={workflowDescription}
          setWorkflowDescription={setWorkflowDescription}
          isRunning={isRunning}
          progress={progress}
        />
      )}

      {/* Workflow Builder */}
      <WorkflowBuilderSection
        tools={tools}
        onAddStep={addStepFromBuilder}
        showAdvanced={showAdvancedBuilder}
        onToggleAdvanced={() => setShowAdvancedBuilder(!showAdvancedBuilder)}
        hasSteps={workflow.steps.length > 0}
        existingStepIds={workflow.steps.map(step => step.id)}
        existingSteps={workflow.steps}
      />

      {/* Tools Overview */}
      <ToolsOverview
        tools={tools}
        isLoading={isLoadingTools}
        onReload={reloadTools}
      />

      {/* Results */}
      {(lastResult || progress) && (
        <ResultsSection
          result={lastResult}
          progress={progress}
        />
      )}
    </div>
  );
}

// Component interfaces and implementations
interface StatusMessagesProps {
  currentError: string | null;
  onClearError: () => void;
  lastResult: WorkflowResult | null;
  cacheMessage: string | null;
  onClearCacheMessage: () => void;
}

function StatusMessages({
  currentError,
  onClearError,
  lastResult,
  cacheMessage,
  onClearCacheMessage
}: StatusMessagesProps) {
  return (
    <>
      {currentError && (
        <div className={styles.errorBanner}>
          <span>⚠️ {currentError}</span>
          <button onClick={onClearError} className={styles.closeButton}>×</button>
        </div>
      )}

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

      {cacheMessage && (
        <div className={styles.successBanner}>
          {cacheMessage}
          <button onClick={onClearCacheMessage} className={styles.closeButton}>×</button>
        </div>
      )}
    </>
  );
}

interface QuickStartSectionProps {
  onRunExample: () => void;
  onClearAllCaches: () => Promise<void>;
  isRunning: boolean;
  canRun: boolean;
  toolsCount: number;
}

function QuickStartSection({
  onRunExample,
  onClearAllCaches,
  isRunning,
  canRun,
  toolsCount
}: QuickStartSectionProps) {
  return (
    <section className={styles.quickStart}>
      <h2>✨ Quick Start</h2>
      <div className={styles.quickStartGrid}>
        <div className={styles.featureCard}>
          <h3>🎯 Example Workflow</h3>
          <p>Screenshot → OCR → Display Result</p>
          <p className={styles.muted}>Intelligent caching remembers your screen selection!</p>
          <button
            onClick={onRunExample}
            disabled={isRunning || !canRun}
            className={styles.primaryButton}
          >
            {isRunning ? '🔄 Running...' : '▶️ Try Demo'}
          </button>
        </div>

        <div className={styles.featureCard}>
          <h3>🛠️ Available Tools</h3>
          <p>{toolsCount} tools ready to use</p>
          <p className={styles.muted}>Screenshots, OCR, debugging, and more</p>
          <div className={styles.toolCategories}>
            <span className={styles.toolBadge}>📸 Image</span>
            <span className={styles.toolBadge}>🔍 OCR</span>
            <span className={styles.toolBadge}>🐛 Debug</span>
          </div>
        </div>

        <div className={styles.featureCard}>
          <h3>🗄️ Smart Caching</h3>
          <p>Steps cache automatically</p>
          <p className={styles.muted}>Persistent across app restarts</p>
          <button
            onClick={onClearAllCaches}
            className={styles.secondaryButton}
          >
            🗑️ Clear All Cache
          </button>
        </div>
      </div>
    </section>
  );
}

interface WorkflowDisplayProps {
  workflow: any;
  onRemoveStep: (stepId: string) => void;
  onExecute: () => void;
  onExecuteFresh: () => void;
  onClear: () => void;
  onClearCache: () => Promise<void>;
  onSaveWorkflow: () => Promise<void>;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  workflowDescription: string;
  setWorkflowDescription: (desc: string) => void;
  isRunning: boolean;
  progress: WorkflowProgress | null;
}

function WorkflowDisplay({
  workflow,
  onRemoveStep,
  onExecute,
  onExecuteFresh,
  onClear,
  onClearCache,
  isRunning,
  progress
}: WorkflowDisplayProps) {
  return (
    <section className={styles.workflowDisplay}>
      <div className={styles.sectionHeader}>
        <h2>⚡ Current Workflow</h2>
        <div className={styles.controls}>
          <button
            onClick={onExecute}
            disabled={isRunning || workflow.steps.length === 0}
            className={styles.primaryButton}
          >
            {isRunning ? '🔄 Running...' : '▶️ Execute'}
          </button>
          <button
            onClick={onExecuteFresh}
            disabled={isRunning || workflow.steps.length === 0}
            className={styles.secondaryButton}
          >
            🔥 Fresh Run
          </button>
          <button
            onClick={onClear}
            disabled={workflow.steps.length === 0}
            className={styles.dangerButton}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {progress && (
        <div className={styles.progressBar}>
          <div className={styles.progressText}>
            Running step: {progress.stepId} {progress.fromCache ? '📦' : ''}
          </div>
        </div>
      )}

      <div className={styles.stepsFlow}>
        {workflow.steps.map((step: any, index: number) => (
          <div key={step.id} className={styles.stepCard}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <div>
                <strong>{step.id}</strong>
                <span className={styles.toolName}>{step.toolId}</span>
              </div>
              <button
                onClick={() => onRemoveStep(step.id)}
                className={styles.removeButton}
              >
                ×
              </button>
            </div>

            {step.cache?.enabled && (
              <div className={styles.cacheInfo}>
                📦 Cached {step.cache.persistent ? '(persistent)' : '(session)'}
              </div>
            )}

            {step.delay && step.delay > 0 && (
              <div className={styles.cacheInfo}>
                ⏱️ Delay: {step.delay}ms ({(step.delay / 1000).toFixed(1)}s)
              </div>
            )}

            <div className={styles.stepInputs}>
              {Object.keys(step.inputs).length > 0 ? (
                <details>
                  <summary>View inputs</summary>
                  <pre>{JSON.stringify(step.inputs, null, 2)}</pre>
                </details>
              ) : (
                <span className={styles.muted}>No inputs</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.cacheControls}>
        <button onClick={onClearCache} className={styles.secondaryButton}>
          🗑️ Clear Workflow Cache
        </button>
      </div>

    </section>
  );
}

interface WorkflowBuilderSectionProps {
  tools: ToolMetadata[];
  onAddStep: any;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  hasSteps: boolean;
  existingStepIds: string[];
  existingSteps: WorkflowStep[];
}

function WorkflowBuilderSection({
  tools,
  onAddStep,
  showAdvanced,
  onToggleAdvanced,
  hasSteps,
  existingStepIds,
  existingSteps
}: WorkflowBuilderSectionProps) {
  return (
    <section className={styles.builderSection}>
      <div className={styles.sectionHeader}>
        <h2>🔧 Build Workflow</h2>
        <button
          onClick={onToggleAdvanced}
          className={styles.toggleButton}
        >
          {showAdvanced ? '📝 Simple' : '⚙️ Advanced'} Builder
        </button>
      </div>

      {!hasSteps && (
        <div className={styles.builderPrompt}>
          <p>Add your first step to get started</p>
          <div className={styles.quickAddButtons}>
            <button className={styles.quickAddButton}>📸 Screenshot</button>
            <button className={styles.quickAddButton}>🔍 OCR</button>
            <button className={styles.quickAddButton}>👋 Hello World</button>
          </div>
        </div>
      )}

      {!showAdvanced ? (
        <div className={styles.simpleBuilder}>
          <SimpleStepBuilder 
            tools={tools} 
            onAddStep={onAddStep}
            existingStepIds={existingStepIds}
            existingSteps={existingSteps}
          />
        </div>
      ) : (
        <div className={styles.advancedBuilder}>
          <AdvancedStepBuilder 
            tools={tools} 
            onAddStep={onAddStep}
            existingStepIds={existingStepIds}
            existingSteps={existingSteps}
          />
        </div>
      )}
    </section>
  );
}

interface ToolsOverviewProps {
  tools: ToolMetadata[];
  isLoading: boolean;
  onReload: () => void;
}

function ToolsOverview({ tools, isLoading, onReload }: ToolsOverviewProps) {
  const toolsByCategory = tools.reduce((acc, tool) => {
    const category = tool.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, ToolMetadata[]>);

  return (
    <section className={styles.toolsOverview}>
      <div className={styles.sectionHeader}>
        <h2>🛠️ Available Tools ({tools.length})</h2>
        <button
          onClick={onReload}
          disabled={isLoading}
          className={styles.secondaryButton}
        >
          {isLoading ? '🔄 Loading...' : '🔄 Reload'}
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading tools...</div>
      ) : (
        <div className={styles.toolCategories}>
          {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
            <div key={category} className={styles.toolCategory}>
              <h3>{category}</h3>
              <div className={styles.toolsGrid}>
                {categoryTools.map(tool => (
                  <div key={tool.id} className={styles.toolCard}>
                    <strong>{tool.name}</strong>
                    <small>{tool.id}</small>
                    {tool.description && (
                      <p className={styles.toolDescription}>{tool.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface ResultsSectionProps {
  result: WorkflowResult | null;
  progress: WorkflowProgress | null;
}

function ResultsSection({ result, progress }: ResultsSectionProps) {
  return (
    <section className={styles.resultsSection}>
      <h2>📊 Results</h2>

      {progress && (
        <div className={styles.progressDetail}>
          <h3>Current Progress</h3>
          <div className={styles.progressInfo}>
            <strong>Step:</strong> {progress.stepId}
            {progress.fromCache && <span className={styles.cacheIndicator}>📦 From Cache</span>}
          </div>
          <details>
            <summary>View details</summary>
            <pre className={styles.codeBlock}>{JSON.stringify(progress, null, 2)}</pre>
          </details>
        </div>
      )}

      {result && (
        <div className={styles.resultDetail}>
          <div className={styles.resultHeader}>
            <h3>
              {result.success ? '✅ Success' : '❌ Failed'}
            </h3>
            {result.cacheStats && (
              <div className={styles.cacheStats}>
                📊 {result.cacheStats.cacheHits} hits, {result.cacheStats.cacheMisses} misses
              </div>
            )}
          </div>
          <details>
            <summary>View full result</summary>
            <pre className={styles.codeBlock}>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}

interface WorkflowManagerSectionProps {
  showManager: boolean;
  onToggleManager: () => void;
  savedWorkflows: WorkflowListItem[];
  onLoadWorkflow: (workflowId: string) => Promise<void>;
  onDeleteWorkflow: (workflowId: string) => Promise<void>;
  currentWorkflow: any;
  workflowName: string;
  setWorkflowName: (name: string) => void;
  workflowDescription: string;
  setWorkflowDescription: (desc: string) => void;
  onSaveWorkflow: () => Promise<void>;
  isRunning: boolean;
}

function WorkflowManagerSection({
  showManager,
  onToggleManager,
  savedWorkflows,
  onLoadWorkflow,
  onDeleteWorkflow,
  currentWorkflow,
  workflowName,
  setWorkflowName,
  workflowDescription,
  setWorkflowDescription,
  onSaveWorkflow,
  isRunning
}: WorkflowManagerSectionProps) {
  return (
    <section className={styles.workflowManager}>
      <div className={styles.sectionHeader}>
        <h2>📁 Workflow Manager</h2>
        <button
          onClick={onToggleManager}
          className={styles.toggleButton}
        >
          {showManager ? '🔼 Hide' : '🔽 Show'} Manager
        </button>
      </div>

      {showManager && (
        <div className={styles.managerContent}>
          {/* Save Current Workflow */}
          {currentWorkflow.steps.length > 0 && (
            <div className={styles.saveSection}>
              <h3>💾 Save Current Workflow</h3>
              <div className={styles.saveForm}>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    placeholder="Workflow name..."
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className={styles.textInput}
                  />
                  <button
                    onClick={onSaveWorkflow}
                    disabled={!workflowName.trim() || isRunning}
                    className={styles.primaryButton}
                  >
                    💾 Save
                  </button>
                </div>
                <textarea
                  placeholder="Optional description..."
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  className={styles.textArea}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Saved Workflows List */}
          <div className={styles.savedWorkflowsList}>
            <h3>📋 Saved Workflows ({savedWorkflows.length})</h3>
            {savedWorkflows.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No saved workflows yet</p>
                <p className={styles.muted}>Create a workflow and save it to get started</p>
              </div>
            ) : (
              <div className={styles.workflowsList}>
                {savedWorkflows.map((workflow) => (
                  <div key={workflow.id} className={styles.workflowItem}>
                    <div className={styles.workflowInfo}>
                      <strong>{workflow.name}</strong>
                      {workflow.description && (
                        <p className={styles.workflowDescription}>{workflow.description}</p>
                      )}
                      <div className={styles.workflowMeta}>
                        <span className={styles.muted}>
                          {workflow.stepCount} steps • Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.workflowActions}>
                      <button
                        onClick={() => onLoadWorkflow(workflow.id)}
                        className={styles.secondaryButton}
                        disabled={isRunning}
                      >
                        📂 Load
                      </button>
                      <button
                        onClick={() => onDeleteWorkflow(workflow.id)}
                        className={styles.dangerButton}
                        disabled={isRunning}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

interface LoadedWorkflowViewerProps {
  workflow: Workflow;
  selectedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
  onRunWorkflow: () => void;
  onRefreshSteps: (stepIds: string[]) => void;
  isRunning: boolean;
  progress: WorkflowProgress | null;
}

function LoadedWorkflowViewer({
  workflow,
  selectedSteps,
  onToggleStep,
  onRunWorkflow,
  onRefreshSteps,
  isRunning,
  progress
}: LoadedWorkflowViewerProps) {
  const selectedStepsList = Array.from(selectedSteps);
  const allSelected = selectedSteps.size === workflow.steps.length;
  const noneSelected = selectedSteps.size === 0;

  const toggleAllSteps = () => {
    if (allSelected) {
      selectedSteps.clear();
      onToggleStep(''); // Force update
    } else {
      workflow.steps.forEach(step => onToggleStep(step.id));
    }
  };

  return (
    <section className={styles.loadedWorkflowViewer}>
      <div className={styles.sectionHeader}>
        <h2>🔍 Loaded Workflow: {workflow.name}</h2>
        <div className={styles.controls}>
          <button
            onClick={toggleAllSteps}
            className={styles.secondaryButton}
          >
            {allSelected ? '☐ Deselect All' : '☑️ Select All'}
          </button>
          <button
            onClick={() => onRefreshSteps(selectedStepsList)}
            disabled={noneSelected || isRunning}
            className={styles.secondaryButton}
          >
            🔄 Refresh Selected
          </button>
          <button
            onClick={onRunWorkflow}
            disabled={noneSelected || isRunning}
            className={styles.primaryButton}
          >
            {isRunning ? '🔄 Running...' : `▶️ Run (${selectedSteps.size})`}
          </button>
        </div>
      </div>

      {workflow.description && (
        <div className={styles.workflowDescription}>
          <p>{workflow.description}</p>
        </div>
      )}

      {progress && (
        <div className={styles.progressBar}>
          <div className={styles.progressText}>
            Running step: {progress.stepId} {progress.fromCache ? '📦' : ''}
          </div>
        </div>
      )}

      <div className={styles.stepsFlow}>
        {workflow.steps.map((step: any, index: number) => {
          const isSelected = selectedSteps.has(step.id);
          const isRunning = progress?.stepId === step.id;

          return (
            <div
              key={step.id}
              className={`${styles.stepCard} ${isSelected ? styles.stepSelected : styles.stepUnselected} ${isRunning ? styles.stepRunning : ''}`}
            >
              <div className={styles.stepHeader}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleStep(step.id)}
                  className={styles.stepCheckbox}
                />
                <span className={styles.stepNumber}>{index + 1}</span>
                <div>
                  <strong>{step.id}</strong>
                  <span className={styles.toolName}>{step.toolId}</span>
                </div>
                {isRunning && <span className={styles.runningIndicator}>🔄</span>}
              </div>

              {step.cache?.enabled && (
                <div className={styles.cacheInfo}>
                  📦 Cached {step.cache.persistent ? '(persistent)' : '(session)'}
                </div>
              )}

              {step.delay && step.delay > 0 && (
                <div className={styles.cacheInfo}>
                  ⏱️ Delay: {step.delay}ms ({(step.delay / 1000).toFixed(1)}s)
                </div>
              )}

              <div className={styles.stepInputs}>
                {Object.keys(step.inputs).length > 0 ? (
                  <details>
                    <summary>View inputs</summary>
                    <pre>{JSON.stringify(step.inputs, null, 2)}</pre>
                  </details>
                ) : (
                  <span className={styles.muted}>No inputs</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}