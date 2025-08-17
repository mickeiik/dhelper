import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Rocket, Settings } from "lucide-react";
import type { ToolMetadata } from "@app/types";

export interface ToolNodeData extends Record<string, unknown> {
  toolId?: string;
  toolMetadata?: ToolMetadata;
  inputs?: Record<string, unknown>;
  label?: string;
}

export const ToolNode = memo(({ data, selected }: any) => {
  const { toolMetadata, toolId, inputs, label } = (data as ToolNodeData) || {};
  const displayName = toolMetadata?.name || label || toolId || 'Unknown Tool';
  const description = toolMetadata?.description || 'No description available';
  const inputFields = toolMetadata?.inputFields || [];
  const outputFields = toolMetadata?.outputFields || [];
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
          <div className="space-y-1">
            <p className="text-xs font-medium">Inputs:</p>
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