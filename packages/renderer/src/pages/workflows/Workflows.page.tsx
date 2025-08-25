import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, OnNodesChange, OnEdgesChange, OnConnect, Edge, Node, Background, Controls, MiniMap, useReactFlow, XYPosition, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ToolNode, ToolNodeData } from '@/components/workflow/tool-node';
import type { ComponentType } from 'react';
import type { Workflow, WorkflowStep } from '@app/types';

const nodeTypes: Record<string, ComponentType<any>> = {
    toolNode: ToolNode,
};

function WorkflowPage() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const { screenToFlowPosition } = useReactFlow();

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [setNodes],
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            let currentEdges: Edge[];
            setEdges((edgesSnapshot) => {
                currentEdges = applyEdgeChanges(changes, edgesSnapshot);
                return currentEdges;
            });
            
            // Handle edge removal to clean up connected sources
            const removedEdges = changes.filter(change => change.type === 'remove');
            if (removedEdges.length > 0) {
                setNodes((nodesSnapshot) => {
                    return nodesSnapshot.map(node => {
                        const nodeData = node.data as ToolNodeData;
                        if (nodeData.connectedSources) {
                            let updatedSources = { ...nodeData.connectedSources };
                            let hasChanges = false;
                            
                            removedEdges.forEach((change: any) => {
                                if (updatedSources[change.id]) {
                                    delete updatedSources[change.id];
                                    hasChanges = true;
                                }
                            });
                            
                            if (hasChanges) {
                                return {
                                    ...node,
                                    data: {
                                        ...nodeData,
                                        connectedSources: Object.keys(updatedSources).length > 0 ? updatedSources : undefined
                                    }
                                };
                            }
                        }
                        return node;
                    });
                });
            }
        },
        [setEdges, setNodes],
    );

    const onConnect: OnConnect = useCallback(
        (params) => {
            // Add the edge
            setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
            
            // Update target node with source tool information
            if (params.source && params.target) {
                setNodes((nodesSnapshot) => {
                    const sourceNode = nodesSnapshot.find(n => n.id === params.source);
                    const sourceToolData = sourceNode?.data as ToolNodeData;
                    
                    if (sourceToolData?.toolMetadata && sourceToolData?.toolId) {
                        return nodesSnapshot.map(node => {
                            if (node.id === params.target) {
                                const currentData = node.data as ToolNodeData;
                                return {
                                    ...node,
                                    data: {
                                        ...currentData,
                                        connectedSources: {
                                            ...currentData.connectedSources,
                                            [params.source!]: {
                                                toolId: sourceToolData.toolId,
                                                outputFields: sourceToolData.toolMetadata?.outputFields || []
                                            }
                                        }
                                    }
                                };
                            }
                            return node;
                        });
                    }
                    return nodesSnapshot;
                });
            }
        },
        [setEdges, setNodes],
    );

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, [])

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        // const position = screenToFlowPosition({
        //     x: event.clientX,
        //     y: event.clientY,
        // });

        try {
            const data = event.dataTransfer.getData('application/reactflow');
            if (!data) return;

            // const { toolId } = JSON.parse(data);
            // const tool = tools.find((t:Record<string, string>) => t.id === toolId);
            // if (!tool) return;

            // const newNode: Node = {
            //     id: `${toolId}-${Date.now()}`,
            //     type: 'toolNode',
            //     position,
            //     data: {
            //         toolId: tool.id,
            //         toolMetadata: tool,
            //         inputs: {},
            //     } as ToolNodeData,
            // };

            // setNodes((nds) => [...nds, newNode]);
        } catch (error) {
            console.error('Failed to parse drop data:', error);
        }
    }, [screenToFlowPosition])

    const getWorkflowFromNodes = (nodes: Node[], edges: Edge[]): Workflow => {
        // Only include nodes that are connected (have at least one edge)
        const connectedNodeIds = new Set<string>();
        edges.forEach(edge => {
            if (edge.source) connectedNodeIds.add(edge.source);
            if (edge.target) connectedNodeIds.add(edge.target);
        });
        
        const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
        
        // Sort nodes by dependency order: nodes with no dependencies first
        const sortedNodes = [...connectedNodes].sort((a, b) => {
            const aHasInputs = (a.data as ToolNodeData).inputMappings && Object.keys((a.data as ToolNodeData).inputMappings || {}).length > 0;
            const bHasInputs = (b.data as ToolNodeData).inputMappings && Object.keys((b.data as ToolNodeData).inputMappings || {}).length > 0;
            
            // Nodes without inputs come first
            if (!aHasInputs && bHasInputs) return -1;
            if (aHasInputs && !bHasInputs) return 1;
            return 0;
        });
        
        const steps: WorkflowStep[] = sortedNodes.map(node => {
            const nodeData = node.data as ToolNodeData;
            const inputFields = nodeData.toolMetadata?.inputFields || [];
            
            // Convert inputs: manual inputs as values, mappings as $ref
            const inputs: any = {};
            
            // Add manual inputs
            if (nodeData.inputs) {
                Object.entries(nodeData.inputs).forEach(([fieldName, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        inputs[fieldName] = value;
                    }
                });
            }
            
            // Add input mappings as $ref (overrides manual inputs for same field)
            if (nodeData.inputMappings) {
                Object.entries(nodeData.inputMappings).forEach(([fieldName, sourceRef]) => {
                    if (sourceRef) {
                        let finalRef = sourceRef;
                        
                        // Apply array indexing if this reference uses [] placeholder and we have an array index
                        if (sourceRef.includes('[]') && nodeData.arrayIndexes) {
                            // Extract sourceNodeId from the reference (before . or [])
                            const sourceNodeId = sourceRef.split(/[.\[]/, 1)[0];
                            const selectedIndex = nodeData.arrayIndexes[sourceNodeId];
                            
                            if (selectedIndex !== undefined) {
                                // Replace [] with the selected index
                                finalRef = sourceRef.replace('[]', `[${selectedIndex}]`);
                            }
                        }
                        
                        inputs[fieldName] = { $ref: finalRef };
                    }
                });
            }
            
            // For tools with a single input field, pass the value directly instead of an object
            const finalInputs = inputFields.length === 1 && Object.keys(inputs).length === 1
                ? inputs[inputFields[0].name]  // Extract the single field value
                : inputs;  // Use the object as-is for multiple fields
            
            return {
                id: node.id,
                toolId: nodeData.toolId as any,
                inputs: finalInputs
            };
        });
        
        return {
            id: `workflow-${Date.now()}`,
            name: 'Generated Workflow',
            steps
        };
    };

    const test = async() => {
        //For testing, do not remove.
        console.log('Workflow:', getWorkflowFromNodes(nodes, edges));
    }

    return (
        <div className='flex h-full'>
            <button onClick={test}>Test</button> {/* Do Not Remove */}
            {/* Tool Palette Sidebar */}
            {/* <ToolPalette tools={tools} /> */}

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