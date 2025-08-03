import { runWorkflow, runCustomWorkflow, getTools, onWorkflowProgress } from '@app/preload'
import type { Tool } from '@app/tools'
import { useEffect, useState } from 'react'

interface WorkflowStep {
    id: string
    toolId: string
    inputs: Record<string, WorkflowResult>
}

interface CustomWorkflow {
    id: string
    name: string
    steps: WorkflowStep[]
}

interface WorkflowResult {
  workflowId: string;
  success: boolean;
  error?: string;
  startTime: Date;
  endTime?: Date;
  stepResults: Record<string, StepResult>;
}

interface StepResult {
  stepId: string;
  toolId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  startTime: Date;
  endTime: Date;
  retryCount: number;
}

function WorkflowPage() {
    const [tools, setTools] = useState<Tool[]>([])
    const [progress, setProgress] = useState(null)
    const [error, setError] = useState<string | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [isLoadingTools, setIsLoadingTools] = useState(true)
    const [lastResult, setLastResult] = useState<WorkflowResult | null>(null)

    // Workflow builder state
    const [customWorkflow, setCustomWorkflow] = useState<CustomWorkflow>({
        id: 'custom-workflow',
        name: 'My Custom Workflow',
        steps: []
    })
    const [newStep, setNewStep] = useState({
        id: '',
        toolId: '',
        inputs: '{}'
    })

    useEffect(() => {
        loadTools()
        onWorkflowProgress(setProgress)
    }, [])

    const loadTools = async () => {
        try {
            setIsLoadingTools(true)
            const toolList = await getTools()
            setTools(toolList)
            setError(null)
        } catch (err) {
            console.error('Failed to load tools:', err)
            setError('Failed to load tools')
        } finally {
            setIsLoadingTools(false)
        }
    }

    const handleRunExample = async () => {
        if (isRunning) return

        try {
            setIsRunning(true)
            setError(null)
            setProgress(null)
            setLastResult(null)

            const result = await runWorkflow('my-workflow-id')
            setLastResult(result)

            if (!result.success) {
                setError(result.error || 'Workflow failed')
            }
        } catch (err) {
            console.error('Workflow failed:', err)
            setError('Workflow execution failed')
        } finally {
            setIsRunning(false)
        }
    }

    const handleRunCustom = async () => {
        if (isRunning || customWorkflow.steps.length === 0) return

        try {
            setIsRunning(true)
            setError(null)
            setProgress(null)
            setLastResult(null)

            console.log('Running custom workflow:', customWorkflow)

            // NOW USING THE REAL FUNCTION!
            const result = await runCustomWorkflow(customWorkflow)
            setLastResult(result)

            if (!result.success) {
                setError(result.error || 'Custom workflow failed')
            }
        } catch (err) {
            console.error('Custom workflow failed:', err)
            setError('Custom workflow execution failed')
        } finally {
            setIsRunning(false)
        }
    }

    const addStep = () => {
        if (!newStep.id || !newStep.toolId) {
            setError('Step ID and Tool are required')
            return
        }

        try {
            const inputs = JSON.parse(newStep.inputs)

            const step: WorkflowStep = {
                id: newStep.id,
                toolId: newStep.toolId,
                inputs
            }

            setCustomWorkflow(prev => ({
                ...prev,
                steps: [...prev.steps, step]
            }))

            setNewStep({
                id: '',
                toolId: '',
                inputs: '{}'
            })
            setError(null)
        } catch (err) {
            setError(`Invalid JSON in inputs: ${err}`)
        }
    }

    const removeStep = (stepId: string) => {
        setCustomWorkflow(prev => ({
            ...prev,
            steps: prev.steps.filter(step => step.id !== stepId)
        }))
    }

    const clearWorkflow = () => {
        setCustomWorkflow(prev => ({
            ...prev,
            steps: []
        }))
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', fontFamily: 'system-ui', color: '#fff' }}>
            <h1 style={{ color: '#fff' }}>Workflow Manager</h1>

            {/* Error banner */}
            {error && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#4a1a1a',
                    border: '1px solid #8b4a4a',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    color: '#ff6b6b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>⚠️ {error}</span>
                    <button
                        onClick={() => setError(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            color: '#ff6b6b'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Success banner */}
            {lastResult?.success && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#1a4a1a',
                    border: '1px solid #4a8b4a',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    color: '#4ade80'
                }}>
                    ✅ Workflow completed successfully!
                </div>
            )}

            {/* Example Workflow Section */}
            <div style={{
                marginBottom: '32px',
                padding: '16px',
                border: '1px solid #444',
                borderRadius: '8px',
                backgroundColor: '#1a1a1a'
            }}>
                <h2 style={{ color: '#fff', margin: '0 0 12px 0' }}>🚀 Example Workflow</h2>
                <p style={{ color: '#ccc', margin: '8px 0' }}>
                    Run the pre-built example workflow (Screenshot → OCR → Hello World)
                </p>
                <button
                    onClick={handleRunExample}
                    disabled={isRunning || tools.length === 0 || isLoadingTools}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: isRunning ? '#555' : '#646cff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (isRunning || tools.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isRunning ? '🔄 Running...' : '▶️ Run Example Workflow'}
                </button>
            </div>

            {/* Custom Workflow Builder */}
            <div style={{
                marginBottom: '32px',
                padding: '16px',
                border: '1px solid #444',
                borderRadius: '8px',
                backgroundColor: '#1a1a1a'
            }}>
                <h2 style={{ color: '#fff', margin: '0 0 16px 0' }}>🔧 Build Custom Workflow</h2>

                {/* Current Steps */}
                <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ color: '#fff' }}>Current Steps ({customWorkflow.steps.length})</h3>
                    {customWorkflow.steps.length === 0 ? (
                        <p style={{ color: '#888', fontStyle: 'italic' }}>No steps added yet</p>
                    ) : (
                        <div style={{ border: '1px solid #444', borderRadius: '6px', overflow: 'hidden' }}>
                            {customWorkflow.steps.map((step, index) => (
                                <div key={step.id} style={{
                                    padding: '12px',
                                    borderBottom: index < customWorkflow.steps.length - 1 ? '1px solid #444' : 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#1f1f1f'
                                }}>
                                    <div>
                                        <strong style={{ color: '#fff' }}>{index + 1}. {step.id}</strong>
                                        <br />
                                        <span style={{ color: '#ccc' }}>Tool: {step.toolId}</span>
                                        <br />
                                        <span style={{ fontSize: '12px', color: '#888' }}>
                                            Inputs: {JSON.stringify(step.inputs)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeStep(step.id)}
                                        style={{
                                            background: '#dc3545',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Step Form */}
                <div style={{
                    padding: '16px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '6px',
                    marginBottom: '16px'
                }}>
                    <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>Add New Step</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#ccc' }}>
                                Step ID
                            </label>
                            <input
                                type="text"
                                value={newStep.id}
                                onChange={(e) => setNewStep(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="e.g. capture-screen"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    backgroundColor: '#333',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#ccc' }}>
                                Tool
                            </label>
                            <select
                                value={newStep.toolId}
                                onChange={(e) => setNewStep(prev => ({ ...prev, toolId: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    backgroundColor: '#333',
                                    color: '#fff'
                                }}
                            >
                                <option value="">Select tool...</option>
                                {tools.map(tool => (
                                    <option key={tool.id} value={tool.id}>{tool.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#ccc' }}>
                                Inputs (JSON)
                            </label>
                            <input
                                type="text"
                                value={newStep.inputs}
                                onChange={(e) => setNewStep(prev => ({ ...prev, inputs: e.target.value }))}
                                placeholder='{"key": "value"}'
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    fontFamily: 'monospace'
                                }}
                            />
                        </div>

                        <button
                            onClick={addStep}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Add Step
                        </button>
                    </div>
                </div>

                {/* Workflow Controls */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleRunCustom}
                        disabled={isRunning || customWorkflow.steps.length === 0}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: isRunning || customWorkflow.steps.length === 0 ? '#555' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isRunning || customWorkflow.steps.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isRunning ? '🔄 Running...' : '▶️ Run Custom Workflow'}
                    </button>

                    <button
                        onClick={clearWorkflow}
                        disabled={customWorkflow.steps.length === 0}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: customWorkflow.steps.length === 0 ? '#555' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: customWorkflow.steps.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        🗑️ Clear All Steps
                    </button>
                </div>
            </div>

            {/* Tools section */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#fff' }}>Available Tools ({tools.length})</h3>
                <button
                    onClick={loadTools}
                    disabled={isLoadingTools}
                    style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: isLoadingTools ? '#555' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isLoadingTools ? 'not-allowed' : 'pointer',
                        marginBottom: '12px'
                    }}
                >
                    {isLoadingTools ? '🔄 Loading...' : '🔄 Reload Tools'}
                </button>

                {isLoadingTools ? (
                    <p style={{ color: '#888', fontStyle: 'italic' }}>Loading tools...</p>
                ) : tools.length === 0 ? (
                    <p style={{ color: '#888', fontStyle: 'italic' }}>
                        No tools available. Try reloading tools.
                    </p>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '12px'
                    }}>
                        {tools.map((tool) => (
                            <div
                                key={tool.id}
                                style={{
                                    padding: '12px',
                                    border: '1px solid #444',
                                    borderRadius: '6px',
                                    backgroundColor: '#2a2a2a'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}>
                                    {tool.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                    {tool.id}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Progress section */}
            {progress && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#fff' }}>Progress</h3>
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#1a2332',
                        border: '1px solid #4a6fa5',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: '#ccc'
                    }}>
                        {JSON.stringify(progress, null, 2)}
                    </div>
                </div>
            )}

            {/* Last result section */}
            {lastResult && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ color: '#fff' }}>Last Result</h3>
                    <details>
                        <summary style={{ cursor: 'pointer', marginBottom: '8px', color: '#ccc' }}>
                            {lastResult.success ? '✅ Success' : '❌ Failed'} - Click to view details
                        </summary>
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#2a2a2a',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            maxHeight: '300px',
                            overflow: 'auto',
                            color: '#ccc'
                        }}>
                            <pre>{JSON.stringify(lastResult, null, 2)}</pre>
                        </div>
                    </details>
                </div>
            )}
        </div>
    )
}

export default WorkflowPage;