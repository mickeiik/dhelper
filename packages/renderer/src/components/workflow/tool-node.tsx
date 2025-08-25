import { memo, useEffect, useState } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Rocket, Settings, Edit3, Link } from "lucide-react";
import type { ToolMetadata, TemplateMetadata } from "@app/types";
import { generateInputOptionsFromSources, type InputOption } from "./input-mapping-utils";
import { listTemplates, getTemplateCategories, getAllTemplateTags } from '@app/preload';

export interface ToolNodeData extends Record<string, unknown> {
  toolId?: string;
  toolMetadata?: ToolMetadata;
  inputs?: Record<string, unknown>;
  label?: string;
  connectedSources?: Record<string, {
    toolId: string;
    outputFields: any[];
  }>;
  inputMappings?: Record<string, string>; // inputFieldName -> sourceReference
  manualInputMode?: Record<string, boolean>; // inputFieldName -> true if manual input mode
  arrayIndexes?: Record<string, number>; // sourceNodeId -> selected array index (for array sources)
}

export const ToolNode = memo(({ data, selected, id }: any) => {
  const { toolMetadata, toolId, inputs, label, connectedSources, inputMappings, manualInputMode, arrayIndexes } = (data as ToolNodeData) || {};
  const displayName = toolMetadata?.name || label || toolId || 'Unknown Tool';
  const description = toolMetadata?.description || 'No description available';
  const inputFields = toolMetadata?.inputFields || [];
  const outputFields = toolMetadata?.outputFields || [];
  const hasConnectedSources = connectedSources && Object.keys(connectedSources).length > 0;
  
  // Template data for template-matcher tool
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Generate available input options from connected sources
  const availableOptions = hasConnectedSources ? generateInputOptionsFromSources(connectedSources) : [];
  
  const { setNodes } = useReactFlow();
  
  // Load template data when component mounts and toolId is template-matcher
  useEffect(() => {
    if (toolId === 'template-matcher') {
      const loadTemplateData = async () => {
        setLoadingTemplates(true);
        try {
          const [templatesData, categoriesData, tagsData] = await Promise.all([
            listTemplates(),
            getTemplateCategories(),
            getAllTemplateTags()
          ]);
          setTemplates(templatesData);
          setCategories(categoriesData);
          setTags(tagsData);
        } catch (error) {
          console.error('Failed to load template data:', error);
        } finally {
          setLoadingTemplates(false);
        }
      };
      loadTemplateData();
    }
  }, [toolId]);
  
  const handleInputMappingChange = (inputFieldName: string, sourceReference: string) => {
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === id) {
          const currentData = node.data as ToolNodeData;
          return {
            ...node,
            data: {
              ...currentData,
              inputMappings: {
                ...currentData.inputMappings,
                [inputFieldName]: sourceReference
              }
            }
          };
        }
        return node;
      })
    );
  };
  
  const handleManualInputChange = (inputFieldName: string, value: string) => {
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === id) {
          const currentData = node.data as ToolNodeData;
          return {
            ...node,
            data: {
              ...currentData,
              inputs: {
                ...currentData.inputs,
                [inputFieldName]: value
              }
            }
          };
        }
        return node;
      })
    );
  };
  
  const handleArrayInputChange = (inputFieldName: string, values: string[]) => {
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === id) {
          const currentData = node.data as ToolNodeData;
          return {
            ...node,
            data: {
              ...currentData,
              inputs: {
                ...currentData.inputs,
                [inputFieldName]: values
              }
            }
          };
        }
        return node;
      })
    );
  };
  
  const addToArrayInput = (inputFieldName: string, value: string) => {
    const currentArray = (inputs?.[inputFieldName] as string[]) || [];
    if (!currentArray.includes(value)) {
      handleArrayInputChange(inputFieldName, [...currentArray, value]);
    }
  };
  
  const removeFromArrayInput = (inputFieldName: string, value: string) => {
    const currentArray = (inputs?.[inputFieldName] as string[]) || [];
    handleArrayInputChange(inputFieldName, currentArray.filter(v => v !== value));
  };
  
  const handleArrayIndexChange = (sourceNodeId: string, newIndex: number) => {
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === id) {
          const currentData = node.data as ToolNodeData;
          return {
            ...node,
            data: {
              ...currentData,
              arrayIndexes: {
                ...currentData.arrayIndexes,
                [sourceNodeId]: newIndex
              }
            }
          };
        }
        return node;
      })
    );
  };
  
  const toggleInputMode = (inputFieldName: string) => {
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === id) {
          const currentData = node.data as ToolNodeData;
          const isManualMode = currentData.manualInputMode?.[inputFieldName];
          return {
            ...node,
            data: {
              ...currentData,
              manualInputMode: {
                ...currentData.manualInputMode,
                [inputFieldName]: !isManualMode
              },
              // Clear the opposite mode's data
              ...(isManualMode 
                ? { inputMappings: { ...currentData.inputMappings, [inputFieldName]: undefined }}
                : { inputs: { ...currentData.inputs, [inputFieldName]: undefined }}
              )
            }
          };
        }
        return node;
      })
    );
  };
  
  return (
    <BaseNode className="w-80">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      
      <BaseNodeHeader className="border-b">
        <Rocket className="size-4" />
        <BaseNodeHeaderTitle>{displayName as string}</BaseNodeHeaderTitle>
        {selected && (
          <Button variant="ghost" size="sm" className="nodrag ml-auto">
            <Settings className="size-3" />
          </Button>
        )}
      </BaseNodeHeader>
      
      <BaseNodeContent>
        <p className="text-xs text-muted-foreground mb-2">
          {description}
        </p>
        
        {inputFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Inputs:</p>
            <div className="space-y-2">
              {inputFields.map((field: any, index: number) => {
                const isManualMode = manualInputMode?.[field.name];
                const hasAvailableOptions = hasConnectedSources && availableOptions.length > 0;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-blue-600">{field.name}</span>
                      <div className="flex items-center gap-1">
                        {field.required && <span className="text-red-500 text-xs">*</span>}
                        {hasAvailableOptions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-gray-100"
                            onClick={() => toggleInputMode(field.name)}
                          >
                            {isManualMode ? <Link className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {isManualMode || !hasAvailableOptions ? (
                      // Manual input mode - check if this is a template field
                      toolId === 'template-matcher' && ['templateIds', 'templateNames', 'categories', 'tags'].includes(field.name) ? (
                        <div className="space-y-1">
                          {/* Template selection dropdown */}
                          
                          
                          {/* Show selected values */}
                          
                        </div>
                      ) : (
                        // Regular manual input
                        <Input
                          className="h-7 text-xs"
                          placeholder={field.placeholder || `Enter ${field.name}...`}
                          value={(inputs?.[field.name] as string) || ""}
                          onChange={(e) => handleManualInputChange(field.name, e.target.value)}
                        />
                      )
                    ) : (
                      // Dropdown mode for connected sources
                      <Select
                        value={inputMappings?.[field.name] || ""}
                        onValueChange={(value) => handleInputMappingChange(field.name, value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder={`Select source for ${field.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOptions.map((option: InputOption, optionIndex: number) => (
                            <SelectItem 
                              key={optionIndex} 
                              value={option.value}
                              className="text-xs"
                            >
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                                <span className="text-muted-foreground">({option.type})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {outputFields.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium">Outputs:</p>
            {outputFields.map((field: any, index: number) => (
              <div key={index} className="text-xs">
                <span className="font-mono text-green-600">{field.name}</span>
                <span className="text-muted-foreground ml-1">({field.type})</span>
              </div>
            ))}
          </div>
        )}
        
        {hasConnectedSources && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">Connected Sources:</p>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {Object.entries(connectedSources || {}).map(([sourceNodeId, sourceInfo]) => {
                const isArraySource = sourceInfo.outputFields.some(field => field.type === 'array');
                const selectedArrayIndex = arrayIndexes?.[sourceNodeId] ?? 0;
                
                return (
                  <div key={sourceNodeId} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-purple-600">{sourceInfo.toolId}</span>
                      {isArraySource && (
                        <Select
                          value={selectedArrayIndex.toString()}
                          onValueChange={(value) => handleArrayIndexChange(sourceNodeId, parseInt(value))}
                        >
                          <SelectTrigger className="h-6 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()} className="text-xs">
                                [{i}]
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="ml-2 text-muted-foreground">
                      {sourceInfo.outputFields.map((field: any, index: number) => (
                        <span key={index} className="mr-2">
                          {field.name} ({field.type})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {Object.keys(inputs || {}).length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">Configured:</p>
            <div className="max-h-16 overflow-y-auto">
              {Object.entries(inputs || {}).map(([key, value]) => (
                <div key={key} className="text-xs truncate">
                  <span className="font-mono text-green-600">{key}</span>:
                  <span className="ml-1 text-muted-foreground">
                    {typeof value === 'string' ? `"${value}"` : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </BaseNodeContent>
      
      <BaseNodeFooter>
        <Button variant="outline" size="sm" className="nodrag w-full">
          Configure
        </Button>
      </BaseNodeFooter>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-green-500 border-2 border-white"
      />
    </BaseNode>
  );
});

ToolNode.displayName = "ToolNode";