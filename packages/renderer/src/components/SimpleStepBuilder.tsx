import { useState, useEffect } from 'react';
import type { ToolInputField, ToolMetadata, WorkflowStep } from '@app/types';
import type { StepBuilderData } from '../hooks/useWorkflowBuilder';
import { validateSemanticReferences, resolveSemanticReferences } from '@app/preload';
import styles from './SimpleStepBuilder.module.css';

interface SimpleStepBuilderProps {
    tools: ToolMetadata[];
    onAddStep: (stepData: StepBuilderData) => boolean;
    existingStepIds?: string[];
    existingSteps?: WorkflowStep[];
}

interface SimpleStepData {
    toolId: string;
    inputs: Record<string, unknown>;
    showAdvanced: boolean;
    cacheEnabled: boolean;
}

export function SimpleStepBuilder({ tools, onAddStep, existingStepIds = [], existingSteps = [] }: SimpleStepBuilderProps) {
    const [stepData, setStepData] = useState<SimpleStepData>({
        toolId: '',
        inputs: {},
        showAdvanced: false,
        cacheEnabled: false
    });

    const [error, setError] = useState<string | null>(null);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

    const selectedTool = tools.find(tool => tool.id === stepData.toolId);

    // Auto-generate unique step ID
    const generateStepId = (toolId: string): string => {
        const tool = tools.find(t => t.id === toolId);
        if (!tool) return '';
        
        const baseName = tool.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        let counter = 1;
        let stepId = baseName;
        
        while (existingStepIds.includes(stepId)) {
            stepId = `${baseName}-${counter}`;
            counter++;
        }
        
        return stepId;
    };

    const updateStepData = (updates: Partial<SimpleStepData>) => {
        setStepData(prev => ({ ...prev, ...updates }));
        setError(null);
        setValidationWarnings([]);
    };

    const updateInput = (fieldName: string, value: unknown) => {
        setStepData(prev => ({
            ...prev,
            inputs: { ...prev.inputs, [fieldName]: value }
        }));
    };

    const applyExample = async (exampleInputs: Record<string, unknown>) => {
        try {
            // Validate semantic references before applying
            const currentStepIndex = existingSteps.length; // This will be the index of the new step
            const validation = await validateSemanticReferences(exampleInputs, existingSteps, currentStepIndex);
            
            if (!validation.isValid) {
                setValidationWarnings(validation.errors);
                setError(`Cannot apply example: ${validation.errors[0]}`);
                return;
            }

            // Try to resolve semantic references to show user what will happen
            try {
                const context = {
                    currentStepIndex,
                    workflowSteps: existingSteps,
                    previousResults: {} // Empty for UI preview
                };
                
                const resolvedInputs = await resolveSemanticReferences(exampleInputs, context);
                setStepData(prev => ({ ...prev, inputs: resolvedInputs as Record<string, unknown> }));
                setValidationWarnings([]);
                setError(null);
            } catch (resolveError) {
                // If we can't resolve now, apply anyway but show warning
                setStepData(prev => ({ ...prev, inputs: { ...exampleInputs } }));
                setValidationWarnings([`Note: ${resolveError instanceof Error ? resolveError.message : String(resolveError)}`]);
                setError(null);
            }
        } catch (validationError) {
            setError(`Validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        }
    };

    const handleSubmit = () => {
        if (!stepData.toolId) {
            setError('Please select a tool');
            return;
        }

        try {
            const stepId = generateStepId(stepData.toolId);
            
            const builderData: StepBuilderData = {
                id: stepId,
                toolId: stepData.toolId,
                inputs: stepData.inputs,
                cache: stepData.cacheEnabled ? { enabled: true } : undefined
            };

            const success = onAddStep(builderData);

            if (success) {
                // Reset form
                setStepData({
                    toolId: '',
                    inputs: {},
                    showAdvanced: false,
                    cacheEnabled: false
                });
                setError(null);
            }
        } catch (err) {
            setError(`Error creating step: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    return (
        <div className={styles.simpleStepBuilder}>
            {error && (
                <div className={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            {validationWarnings.length > 0 && (
                <div className={styles.warnings}>
                    {validationWarnings.map((warning, index) => (
                        <div key={index} className={styles.warning}>
                            💡 {warning}
                        </div>
                    ))}
                </div>
            )}

            {/* Tool Selection */}
            <div className={styles.section}>
                <label className={styles.label}>Choose Tool</label>
                <select
                    value={stepData.toolId}
                    onChange={(e) => {
                        updateStepData({
                            toolId: e.target.value,
                            inputs: {}
                        });
                    }}
                    className={styles.toolSelect}
                >
                    <option value="">Select a tool...</option>
                    {tools.map(tool => (
                        <option key={tool.id} value={tool.id}>
                            {tool.name} {tool.category && `(${tool.category})`}
                        </option>
                    ))}
                </select>

                {selectedTool?.description && (
                    <div className={styles.toolDescription}>
                        💡 {selectedTool.description}
                    </div>
                )}
            </div>

            {selectedTool && (
                <>
                    {/* Quick Examples */}
                    {selectedTool.examples && selectedTool.examples.length > 0 && (
                        <div className={styles.section}>
                            <label className={styles.label}>Quick Start</label>
                            <div className={styles.examples}>
                                {selectedTool.examples.map((example, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => applyExample(example.inputs as Record<string, unknown>)}
                                        className={styles.exampleButton}
                                        title={example.description}
                                    >
                                        {example.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Simple Inputs */}
                    <SimpleInputs
                        tool={selectedTool}
                        inputs={stepData.inputs}
                        onInputChange={updateInput}
                        existingStepIds={existingStepIds}
                    />

                    {/* Advanced Options Toggle */}
                    <div className={styles.section}>
                        <button
                            type="button"
                            onClick={() => updateStepData({ showAdvanced: !stepData.showAdvanced })}
                            className={styles.advancedToggle}
                        >
                            {stepData.showAdvanced ? '▼' : '▶'} Advanced Options
                        </button>

                        {stepData.showAdvanced && (
                            <div className={styles.advancedOptions}>
                                <label className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        checked={stepData.cacheEnabled}
                                        onChange={(e) => updateStepData({ cacheEnabled: e.target.checked })}
                                    />
                                    <span>Cache results</span>
                                </label>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add Step Button */}
            <button
                onClick={handleSubmit}
                disabled={!stepData.toolId}
                className={styles.addButton}
            >
                ➕ Add Step
            </button>
        </div>
    );
}

interface SimpleInputsProps {
    tool: ToolMetadata;
    inputs: Record<string, unknown>;
    onInputChange: (field: string, value: unknown) => void;
    existingStepIds: string[];
}

function SimpleInputs({ tool, inputs, onInputChange, existingStepIds }: SimpleInputsProps) {
    if (!tool.inputFields || tool.inputFields.length === 0) {
        return (
            <div className={styles.section}>
                <div className={styles.noInputs}>
                    This tool is ready to use - no configuration needed.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <label className={styles.label}>Configuration</label>
            <div className={styles.inputs}>
                {tool.inputFields.map(field => (
                    <SimpleField
                        key={field.name}
                        field={field}
                        value={inputs[field.name]}
                        onChange={(value) => onInputChange(field.name, value)}
                        existingStepIds={existingStepIds}
                    />
                ))}
            </div>
        </div>
    );
}

interface SimpleFieldProps {
    field: ToolInputField;
    value: unknown;
    onChange: (value: unknown) => void;
    existingStepIds: string[];
}

function SimpleField({ field, value, onChange, existingStepIds }: SimpleFieldProps) {
    const [useReference, setUseReference] = useState(false);

    const isRef = value !== null && 
        value !== undefined && 
        typeof value === 'object' && 
        value !== null && 
        '$ref' in value;

    useEffect(() => {
        setUseReference(isRef);
    }, [isRef]);

    const toggleReference = () => {
        if (useReference) {
            onChange(field.defaultValue ?? '');
        } else {
            onChange({ $ref: '' });
        }
        setUseReference(!useReference);
    };

    return (
        <div className={styles.field}>
            <div className={styles.fieldHeader}>
                <label className={field.required ? styles.required : ''}>
                    {field.name}{field.required && ' *'}
                </label>
                {existingStepIds.length > 0 && (
                    <button
                        type="button"
                        onClick={toggleReference}
                        className={`${styles.refToggle} ${useReference ? styles.active : ''}`}
                        title="Use output from another step"
                    >
                        🔗
                    </button>
                )}
            </div>

            {field.description && (
                <div className={styles.fieldDescription}>
                    {field.description}
                </div>
            )}

            {useReference ? (
                <ReferenceSelector
                    value={isRef ? (value as { $ref: string }).$ref : ''}
                    onChange={(ref) => onChange({ $ref: ref })}
                    existingStepIds={existingStepIds}
                />
            ) : (
                <SimpleFieldInput field={field} value={value} onChange={onChange} />
            )}
        </div>
    );
}

interface ReferenceSelectorProps {
    value: string;
    onChange: (ref: string) => void;
    existingStepIds: string[];
}

function ReferenceSelector({ value, onChange, existingStepIds }: ReferenceSelectorProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={styles.referenceSelect}
        >
            <option value="">Select step output...</option>
            {existingStepIds.map(stepId => (
                <option key={stepId} value={stepId}>
                    {stepId}
                </option>
            ))}
        </select>
    );
}

interface SimpleFieldInputProps {
    field: ToolInputField;
    value: unknown;
    onChange: (value: unknown) => void;
}

function SimpleFieldInput({ field, value, onChange }: SimpleFieldInputProps) {
    switch (field.type) {
        case 'string':
            return (
                <input
                    type="text"
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || field.example ? String(field.example) : ''}
                    className={styles.input}
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    value={Number(value) || ''}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    placeholder={field.placeholder || field.example ? String(field.example) : ''}
                    className={styles.input}
                />
            );

        case 'boolean':
            return (
                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span>Enabled</span>
                </label>
            );

        case 'select':
            return (
                <select
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    className={styles.select}
                >
                    <option value="">Select...</option>
                    {field.options?.map(option => (
                        <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                        </option>
                    ))}
                </select>
            );

        case 'array':
            return (
                <textarea
                    value={Array.isArray(value) ? value.join('\n') : String(value || '')}
                    onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                        onChange(lines);
                    }}
                    placeholder={field.placeholder || field.example ? 
                        (Array.isArray(field.example) ? field.example.join('\n') : String(field.example)) : 
                        'Enter items, one per line'}
                    className={styles.input}
                    rows={4}
                />
            );

        default:
            return (
                <input
                    type="text"
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || field.example ? String(field.example) : ''}
                    className={styles.input}
                />
            );
    }
}