import { memo, useState } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
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
import { Rocket, Settings } from "lucide-react";
import type { ToolMetadata } from "@app/types";
import { generateInputOptionsFromSources, type InputOption } from "./input-mapping-utils";

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
}

export const ToolNode = memo(({ data, selected, id }: any) => {
  const { toolMetadata, toolId, inputs, label, connectedSources, inputMappings } = (data as ToolNodeData) || {};
  const displayName = toolMetadata?.name || label || toolId || 'Unknown Tool';
  const description = toolMetadata?.description || 'No description available';
  const inputFields = toolMetadata?.inputFields || [];
  const outputFields = toolMetadata?.outputFields || [];
  const hasConnectedSources = connectedSources && Object.keys(connectedSources).length > 0;
  
  // Generate available input options from connected sources
  const availableOptions = hasConnectedSources ? generateInputOptionsFromSources(connectedSources) : [];
  
  const { setNodes } = useReactFlow();
  
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
            {hasConnectedSources ? (
              // Show dropdowns when sources are connected
              <div className="space-y-2">
                {inputFields.slice(0, 3).map((field: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-blue-600">{field.name}</span>
                      {field.required && <span className="text-red-500 text-xs">*</span>}
                    </div>
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
                  </div>
                ))}
                {inputFields.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{inputFields.length - 3} more...</p>
                )}
              </div>
            ) : (
              // Show static list when no sources are connected
              <div>
                {inputFields.slice(0, 3).map((field: any, index: number) => (
                  <div key={index} className="text-xs">
                    <span className="font-mono text-blue-600">{field.name}</span>
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="text-muted-foreground ml-1">({field.type})</span>
                  </div>
                ))}
                {inputFields.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{inputFields.length - 3} more...</p>
                )}
              </div>
            )}
          </div>
        )}
        
        {outputFields.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium">Outputs:</p>
            {outputFields.slice(0, 3).map((field: any, index: number) => (
              <div key={index} className="text-xs">
                <span className="font-mono text-green-600">{field.name}</span>
                <span className="text-muted-foreground ml-1">({field.type})</span>
              </div>
            ))}
            {outputFields.length > 3 && (
              <p className="text-xs text-muted-foreground">+{outputFields.length - 3} more...</p>
            )}
          </div>
        )}
        
        {hasConnectedSources && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-medium mb-1">Connected Sources:</p>
            <div className="max-h-20 overflow-y-auto">
              {Object.entries(connectedSources || {}).map(([sourceNodeId, sourceInfo]) => (
                <div key={sourceNodeId} className="text-xs mb-1">
                  <span className="font-mono text-purple-600">{sourceInfo.toolId}</span>
                  <div className="ml-2 text-muted-foreground">
                    {sourceInfo.outputFields.slice(0, 2).map((field: any, index: number) => (
                      <span key={index} className="mr-2">
                        {field.name} ({field.type})
                      </span>
                    ))}
                    {sourceInfo.outputFields.length > 2 && (
                      <span>+{sourceInfo.outputFields.length - 2} more</span>
                    )}
                  </div>
                </div>
              ))}
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