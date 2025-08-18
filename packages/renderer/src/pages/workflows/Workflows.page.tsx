import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, OnNodesChange, OnEdgesChange, OnConnect, Edge, Node, Background, Controls, MiniMap, useReactFlow, XYPosition, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ToolNode, ToolNodeData } from '@/components/workflow/tool-node';
import type { ComponentType } from 'react';
import { ToolPalette } from '@/components/workflow/tool-palette';
import { useTools } from '@/hooks/useElectronAPI';

const nodeTypes: Record<string, ComponentType<any>> = {
    toolNode: ToolNode,
};

function WorkflowPage() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const { screenToFlowPosition } = useReactFlow();
    const { tools } = useTools();

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

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, [])

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        try {
            const data = event.dataTransfer.getData('application/reactflow');
            if (!data) return;

            const { toolId } = JSON.parse(data);
            const tool = tools.find(t => t.id === toolId);
            if (!tool) return;

            const newNode: Node = {
                id: `${toolId}-${Date.now()}`,
                type: 'toolNode',
                position,
                data: {
                    toolId: tool.id,
                    toolMetadata: tool,
                    inputs: {},
                } as ToolNodeData,
            };

            setNodes((nds) => [...nds, newNode]);
        } catch (error) {
            console.error('Failed to parse drop data:', error);
        }
    }, [screenToFlowPosition, tools])

    return (
        <div className='flex h-full'>
            {/* Tool Palette Sidebar */}
            <ToolPalette tools={tools} />

            {/* Workflow Canvas */}
            <div className="flex-1 h-full">
                <ReactFlow
                    nodeTypes={nodeTypes}
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    // onDragStart={onDragStart}
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


// wrapping with ReactFlowProvider is done outside of the component
export default function WorkflowPageWithProvider() {
    return (
        <ReactFlowProvider>
            <WorkflowPage />
        </ReactFlowProvider>
    );
}