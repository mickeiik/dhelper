import { useState } from 'react';
import { useTools } from '../hooks/useTools';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useWorkflowBuilder } from '../hooks/useWorkflowBuilder';
import { useWorkflowProgress } from '../hooks/useWorkflowProgress';
import type { Tool, Workflow, WorkflowResult, WorkflowProgress } from '@app/types';
import styles from './WorkflowPage.module.css';

export function WorkflowPage() {
  // Business logic hooks (the valuable part!)
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

  // Simple error handling
  const currentError = executionError || builderError || toolsError;
  const handleClearError = () => {
    clearExecutionError();
    clearBuilderError();
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
  onRun 
}: {
  workflow: Workflow;
  newStep: any;
  tools: Tool[];
  isRunning: boolean;
  onUpdateStep: (updates: any) => void;
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
  onClear: () => void;
  onRun: () => void;
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
            value={newStep.id}
            onChange={(e) => onUpdateStep({ id: e.target.value })}
          />
          <select
            value={newStep.toolId}
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
            value={newStep.inputs}
            onChange={(e) => onUpdateStep({ inputs: e.target.value })}
            className={styles.monoInput}
          />
          <button onClick={onAddStep} className={styles.successButton}>
            Add Step
          </button>
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
          <h3>Progress</h3>
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