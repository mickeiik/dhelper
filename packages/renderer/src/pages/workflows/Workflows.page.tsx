import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, OnNodesChange, OnEdgesChange, OnConnect, Edge, Node, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ToolNode } from '@/components/workflow/tool-node';
import type { ComponentType } from 'react';
import { ToolPalette } from '@/components/workflow/tool-palette';

const nodeTypes: Record<string, ComponentType<any>> = {
    toolNode: ToolNode,
};

export default function WorkflowPage() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [setNodes],
    );
    
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [setEdges],
    );
    
    const onConnect: OnConnect = useCallback(
        (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
        [setEdges],
    );

    const onNodeAdd = useCallback((node: Node) => {
        setNodes((nds) => [...nds, node]);
    }, []);

    return (
        <div className='flex h-full'>
            {/* Tool Palette Sidebar */}
            <ToolPalette onNodeAdd={onNodeAdd} />
            
            {/* Workflow Canvas */}
            <div className="flex-1 h-full">
                <ReactFlow
                    nodeTypes={nodeTypes}
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                    <Controls className='text-primary-inverse' />
                    <MiniMap 
                        nodeColor='oklch(0.696 0.17 162.48)'
                    />
                </ReactFlow>
            </div>
        </div>
    );
}