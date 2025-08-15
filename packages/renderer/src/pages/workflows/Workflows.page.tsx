import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, OnNodesChange, OnEdgesChange, OnConnect, Edge, Node, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ToolNode } from '@/components/workflow/tool-node';

const nodeTypes = {
    toolNode: ToolNode,
};

const initialNodes: Node[] = [
    { id: '1', data: { test: 'hello' }, position: { x: 5, y: 5 }, type: 'toolNode' },
    { id: '2', data: { label: 'Node 2' }, position: { x: 5, y: 100 } },
];
const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function WorkflowPage() {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

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

    return (
        <div className='w-full h-full'>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Background />
            </ReactFlow>
        </div>
    );
}