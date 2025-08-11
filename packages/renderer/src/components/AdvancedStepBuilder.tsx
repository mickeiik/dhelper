import { useState } from 'react';
import type { ToolInputField, ToolMetadata, WorkflowInputs, WorkflowStep } from '@app/types';
import type { StepBuilderData } from '../hooks/useWorkflowBuilder';
import styles from './AdvancedStepBuilder.module.css';

interface AdvancedStepBuilderProps {
    tools: ToolMetadata[];
    onAddStep: (stepData: StepBuilderData) => boolean;
    existingStepIds?: string[];
    existingSteps?: WorkflowStep[];
}

interface AdvancedStepData {
    id: string;
    toolId: string;
    inputs: Record<string, unknown>;
    delay: string; // Store as string for form input, convert to number later
    cacheEnabled: boolean;
    cacheKey: string;
    cachePersistent: boolean;
    cacheTtl: string;
    inputMode: 'form' | 'json';
    selectedExample: string;
}

interface ReferenceValue {
    $ref: string;
}

type InputValue = unknown | ReferenceValue;

export function AdvancedStepBuilder({ tools, onAddStep, existingStepIds = [] }: AdvancedStepBuilderProps) {
    const [formData, setFormData] = useState<AdvancedStepData>({
        id: '',
        toolId: '',
        inputs: {},
        delay: '',
        cacheEnabled: false,
        cacheKey: '',
        cachePersistent: true,
        cacheTtl: '',
        inputMode: 'form',
        selectedExample: ''
    });

    const [jsonInput, setJsonInput] = useState<string>('{}');
    const [error, setError] = useState<string | null>(null);

    const selectedTool = tools.find(tool => tool.id === formData.toolId);

    const updateFormData = (updates: Partial<AdvancedStepData>): void => {
        setFormData(prev => ({ ...prev, ...updates }));
        setError(null);
    };

    const updateInputField = (fieldName: string, value: InputValue): void => {
        setFormData(prev => ({
            ...prev,
            inputs: { ...prev.inputs, [fieldName]: value }
        }));
    };

    const applyExample = (exampleInputs: Record<string, unknown>): void => {
        if (formData.inputMode === 'form') {
            setFormData(prev => ({ ...prev, inputs: { ...exampleInputs } }));
        } else {
            setJsonInput(JSON.stringify(exampleInputs, null, 2));
        }
    };

    const generateStepId = (): string => {
        if (selectedTool) {
            const baseName = selectedTool.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            let counter = 1;
            let stepId = baseName;
            
            while (existingStepIds.includes(stepId)) {
                stepId = `${baseName}-${counter}`;
                counter++;
            }
            
            return stepId;
        }
        return '';
    };

    const handleSubmit = (): void => {
        if (!formData.id || !formData.toolId) {
            setError('Step ID and Tool are required');
            return;
        }

        try {
            let inputs: WorkflowInputs<unknown>;

            if (formData.inputMode === 'form') {
                inputs = { ...formData.inputs };
            } else {
                inputs = JSON.parse(jsonInput) as WorkflowInputs<unknown>;
            }

            const stepData: StepBuilderData = {
                id: formData.id,
                toolId: formData.toolId,
                inputs,
                delay: formData.delay ? parseInt(formData.delay) : undefined,
                cache: formData.cacheEnabled ? {
                    enabled: true,
                    key: formData.cacheKey || undefined,
                    persistent: formData.cachePersistent,
                    ttl: formData.cacheTtl ? parseInt(formData.cacheTtl) : undefined
                } : undefined
            };

            const success = onAddStep(stepData);

            if (success) {
                // Reset form
                setFormData({
                    id: '',
                    toolId: '',
                    inputs: {},
                    delay: '',
                    cacheEnabled: false,
                    cacheKey: '',
                    cachePersistent: true,
                    cacheTtl: '',
                    inputMode: 'form',
                    selectedExample: ''
                });
                setJsonInput('{}');
                setError(null);
            }
        } catch (err) {
            setError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    return (
        <div className={styles.advancedStepBuilder}>
            <div className={styles.header}>
                <h3>⚙️ Advanced Step Builder</h3>
                <p>Full control over step configuration, caching, and input modes</p>
            </div>

            {error && (
                <div className={styles.error}>
                    ⚠️ {error}
                </div>
            )}

            {/* Step Information */}
            <div className={styles.section}>
                <h4>Step Information</h4>
                <div className={styles.row}>
                    <div className={styles.field}>
                        <label>Step ID</label>
                        <div className={styles.inputGroup}>
                            <input
                                type="text"
                                value={formData.id}
                                onChange={(e) => updateFormData({ id: e.target.value })}
                                placeholder="unique-step-id"
                                className={styles.input}
                            />
                            <button
                                type="button"
                                onClick={() => updateFormData({ id: generateStepId() })}
                                className={styles.generateButton}
                                title="Generate ID"
                            >
                                🎯
                            </button>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label>Tool</label>
                        <select
                            value={formData.toolId}
                            onChange={(e) => {
                                updateFormData({
                                    toolId: e.target.value,
                                    inputs: {},
                                    selectedExample: ''
                                });
                                setJsonInput('{}');
                            }}
                            className={styles.select}
                        >
                            <option value="">Select a tool...</option>
                            {tools.map(tool => (
                                <option key={tool.id} value={tool.id}>
                                    {tool.name} {tool.category && `(${tool.category})`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Execution Settings */}
                <div className={styles.row}>
                    <div className={styles.field}>
                        <label>Delay Before Execution</label>
                        <input
                            type="number"
                            min="0"
                            step="100"
                            value={formData.delay}
                            onChange={(e) => updateFormData({ delay: e.target.value })}
                            placeholder="Delay in milliseconds (e.g., 2000 for 2 seconds)"
                            className={styles.input}
                        />
                        <small className={styles.fieldDescription}>
                            Optional delay in milliseconds before this step executes
                        </small>
                    </div>
                </div>

                {selectedTool?.description && (
                    <div className={styles.toolDescription}>
                        💡 {selectedTool.description}
                    </div>
                )}
            </div>

            {selectedTool && (
                <>
                    {/* Examples */}
                    {selectedTool.examples && selectedTool.examples.length > 0 && (
                        <div className={styles.section}>
                            <h4>Examples</h4>
                            <div className={styles.examples}>
                                {selectedTool.examples.map((example, index) => (
                                    <div key={index} className={styles.example}>
                                        <div className={styles.exampleHeader}>
                                            <strong>{example.name}</strong>
                                            <button
                                                type="button"
                                                onClick={() => applyExample(example.inputs as Record<string, unknown>)}
                                                className={styles.applyButton}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                        <div className={styles.exampleDescription}>
                                            {example.description}
                                        </div>
                                        <pre className={styles.exampleCode}>
                                            {JSON.stringify(example.inputs, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Configuration */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h4>Input Configuration</h4>
                            <div className={styles.inputModeToggle}>
                                <button
                                    type="button"
                                    className={formData.inputMode === 'form' ? styles.active : ''}
                                    onClick={() => updateFormData({ inputMode: 'form' })}
                                >
                                    📝 Form
                                </button>
                                <button
                                    type="button"
                                    className={formData.inputMode === 'json' ? styles.active : ''}
                                    onClick={() => updateFormData({ inputMode: 'json' })}
                                >
                                    🔧 JSON
                                </button>
                            </div>
                        </div>

                        {formData.inputMode === 'form' ? (
                            <AdvancedFormInputs
                                tool={selectedTool}
                                inputs={formData.inputs}
                                onInputChange={updateInputField}
                                existingStepIds={existingStepIds}
                            />
                        ) : (
                            <JsonInputs
                                value={jsonInput}
                                onChange={setJsonInput}
                                tool={selectedTool}
                            />
                        )}
                    </div>

                    {/* Cache Configuration */}
                    <div className={styles.section}>
                        <h4>Caching & Performance</h4>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={formData.cacheEnabled}
                                onChange={(e) => updateFormData({ cacheEnabled: e.target.checked })}
                            />
                            <span>Enable result caching</span>
                        </label>

                        {formData.cacheEnabled && (
                            <div className={styles.cacheOptions}>
                                <div className={styles.row}>
                                    <div className={styles.field}>
                                        <label>Custom Cache Key (optional)</label>
                                        <input
                                            type="text"
                                            value={formData.cacheKey}
                                            onChange={(e) => updateFormData({ cacheKey: e.target.value })}
                                            placeholder="custom-key"
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label>TTL (milliseconds)</label>
                                        <input
                                            type="number"
                                            value={formData.cacheTtl}
                                            onChange={(e) => updateFormData({ cacheTtl: e.target.value })}
                                            placeholder="86400000"
                                            className={styles.input}
                                        />
                                    </div>
                                </div>
                                <label className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        checked={formData.cachePersistent}
                                        onChange={(e) => updateFormData({ cachePersistent: e.target.checked })}
                                    />
                                    <span>Persistent (survives app restart)</span>
                                </label>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={!formData.id || !formData.toolId}
                className={styles.submitButton}
            >
                ➕ Add Step
            </button>
        </div>
    );
}

// Components below are similar to the original but cleaned up

interface AdvancedFormInputsProps {
    tool: ToolMetadata;
    inputs: Record<string, unknown>;
    onInputChange: (field: string, value: InputValue) => void;
    existingStepIds: string[];
}

function AdvancedFormInputs({ tool, inputs, onInputChange, existingStepIds }: AdvancedFormInputsProps) {
    if (!tool.inputFields || tool.inputFields.length === 0) {
        return (
            <div className={styles.noFields}>
                This tool doesn't define specific input fields. Use JSON mode or check the tool's documentation.
            </div>
        );
    }

    return (
        <div className={styles.formInputs}>
            {tool.inputFields.map(field => (
                <AdvancedFormField
                    key={field.name}
                    field={field}
                    value={inputs[field.name]}
                    onChange={(value) => onInputChange(field.name, value)}
                    existingStepIds={existingStepIds}
                />
            ))}
        </div>
    );
}

interface AdvancedFormFieldProps {
    field: ToolInputField;
    value: unknown;
    onChange: (value: InputValue) => void;
    existingStepIds: string[];
}

function AdvancedFormField({ field, value, onChange, existingStepIds }: AdvancedFormFieldProps) {
    const [refMode, setRefMode] = useState<boolean>(false);
    const [refValue, setRefValue] = useState<string>('');

    const isRef = value !== null &&
        value !== undefined &&
        typeof value === 'object' &&
        value !== null &&
        '$ref' in value;

    const handleToggleRef = (): void => {
        if (refMode) {
            onChange(field.defaultValue ?? '');
            setRefValue('');
        } else {
            onChange({ $ref: refValue });
        }
        setRefMode(!refMode);
    };

    const handleRefChange = (newRefValue: string): void => {
        setRefValue(newRefValue);
        onChange({ $ref: newRefValue });
    };

    return (
        <div className={styles.formField}>
            <div className={styles.fieldHeader}>
                <label className={field.required ? styles.required : ''}>
                    {field.name}
                    {field.required && ' *'}
                </label>
                <button
                    type="button"
                    onClick={handleToggleRef}
                    className={`${styles.refButton} ${refMode || isRef ? styles.active : ''}`}
                    title="Use reference to another step"
                >
                    🔗
                </button>
            </div>

            {field.description && (
                <div className={styles.fieldDescription}>
                    {field.description}
                </div>
            )}

            {refMode || isRef ? (
                existingStepIds.length > 0 ? (
                    <select
                        value={isRef ? (value as ReferenceValue).$ref : refValue}
                        onChange={(e) => handleRefChange(e.target.value)}
                        className={`${styles.select} ${styles.refSelect}`}
                    >
                        <option value="">Select step output...</option>
                        {existingStepIds.map(stepId => (
                            <option key={stepId} value={stepId}>
                                {stepId}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={isRef ? (value as ReferenceValue).$ref : refValue}
                        onChange={(e) => handleRefChange(e.target.value)}
                        placeholder="step-id or step-id.property"
                        className={`${styles.input} ${styles.refInput}`}
                    />
                )
            ) : (
                <FieldInput field={field} value={value} onChange={onChange} />
            )}

            {field.example && !refMode && !isRef && (
                <div className={styles.fieldExample}>
                    Example: <code>{JSON.stringify(field.example)}</code>
                </div>
            )}
        </div>
    );
}

// Reuse the existing FieldInput and JsonInputs components
function FieldInput({ field, value, onChange }: { field: ToolInputField; value: unknown; onChange: (value: InputValue) => void }) {
    const handleObjectChange = (newValue: string): void => {
        try {
            onChange(JSON.parse(newValue));
        } catch {
            onChange(newValue);
        }
    };

    const getObjectValue = (): string => {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value || '{}');
    };

    switch (field.type) {
        case 'string':
            return (
                <input
                    type="text"
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className={styles.input}
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    value={Number(value) || ''}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    placeholder={field.placeholder}
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

        case 'object':
            return (
                <textarea
                    value={getObjectValue()}
                    onChange={(e) => handleObjectChange(e.target.value)}
                    placeholder={field.placeholder || '{}'}
                    className={styles.textarea}
                    rows={4}
                />
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
                    className={styles.textarea}
                    rows={4}
                />
            );

        default:
            return (
                <input
                    type="text"
                    value={String(value || '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className={styles.input}
                />
            );
    }
}

function JsonInputs({ value, onChange, tool }: { value: string; onChange: (value: string) => void; tool: ToolMetadata }) {
    const fillDefaults = (): void => {
        const defaultInputs: Record<string, unknown> = {};
        tool.inputFields?.forEach(field => {
            if (field.defaultValue !== undefined) {
                defaultInputs[field.name] = field.defaultValue;
            }
        });
        onChange(JSON.stringify(defaultInputs, null, 2));
    };

    return (
        <div className={styles.jsonInputs}>
            <div className={styles.jsonHeader}>
                <span>JSON Configuration</span>
                {tool.inputFields && (
                    <button
                        type="button"
                        onClick={fillDefaults}
                        className={styles.defaultsButton}
                    >
                        Fill Defaults
                    </button>
                )}
            </div>

            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={styles.jsonTextarea}
                rows={10}
                placeholder='{\n  "field": "value",\n  "other": { "$ref": "step-id" }\n}'
            />

            {tool.inputFields && (
                <div className={styles.fieldReference}>
                    <h5>Available Fields:</h5>
                    <ul>
                        {tool.inputFields.map(field => (
                            <li key={field.name}>
                                <code>{field.name}</code>
                                {field.required && ' (required)'}
                                {field.type && ` - ${field.type}`}
                                {field.description && ` - ${field.description}`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}