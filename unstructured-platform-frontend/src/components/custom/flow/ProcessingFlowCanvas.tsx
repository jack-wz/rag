"use client";

import React, { useState, useCallback, useMemo, MouseEvent as ReactMouseEvent } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  NodeTypes,
  Position,
  MarkerType,
  NodeMouseHandler,
  ReactFlowInstance, // For onInit
  ReactFlowInstance,
  Viewport, // Import Viewport type
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NodeConfigPanel from './NodeConfigPanel';
import { useToast } from "@/components/ui/use-toast"; // Import useToast

// Import custom nodes
import InputNode from './nodes/InputNode';
import PartitionNode from './nodes/PartitionNode';
import CleanNode from './nodes/CleanNode';
import ChunkNode from './nodes/ChunkNode';
import ExtractLLMNode from './nodes/ExtractLLMNode';
import OutputNode from './nodes/OutputNode';

let id = 0;
const getId = () => `dndnode_${id++}`;

const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'inputNode',
    position: { x: 50, y: 150 },
    data: { label: 'Document Input' },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 650, y: 150 },
    data: { label: 'Processed Output' },
  },
];

const ProcessingFlowCanvas: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { toast } = useToast(); // Initialize toast

  const FLOW_STATE_KEY = "processingFlowState";

  const nodeTypes: NodeTypes = useMemo(() => ({
    inputNode: InputNode,
    partitionNode: PartitionNode,
    cleanNode: CleanNode,
    chunkNode: ChunkNode,
    extractLLMNode: ExtractLLMNode,
    outputNode: OutputNode,
  }), []);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ 
        ...params, 
        type: 'smoothstep', 
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed } 
    }, eds)),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback((event: ReactMouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null); 
    if (reactFlowInstance) {
        // Optional: reactFlowInstance.setNodesSelection({ nodes: [], edges: [] });
    }
  }, [reactFlowInstance]);
  
  const closeConfigPanel = () => {
    setSelectedNode(null);
  };

  const handleNodeDataChange = useCallback(
    (nodeId: string, newData: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } } // Merge new data with existing data
            : node
        )
      );
      // If the currently selected node is the one being updated, refresh its state in the panel
      setSelectedNode((currentNode) => 
        currentNode && currentNode.id === nodeId 
          ? { ...currentNode, data: { ...currentNode.data, ...newData } } 
          : currentNode
      );
    },
    [setNodes, setSelectedNode]
  );

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: getId(),
      type,
      position: {
        x: Math.random() * 400 + 100, // Random position for new nodes
        y: Math.random() * 200 + 50,
      },
      data: { label },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex flex-row w-full h-[70vh] mt-6 border rounded-lg shadow">
      <div className="flex-grow h-full relative"> 
        <Card className="w-full h-full rounded-none rounded-l-lg border-0 border-r">
          <CardHeader className="pb-2 pt-3 px-3"> 
            <CardTitle className="text-base">Processing Flow Canvas</CardTitle> 
          </CardHeader>
          <CardContent className="h-[calc(100%-3.5rem)] p-0 relative"> 
            <div className="absolute top-0 left-0 z-10 p-2 flex flex-wrap gap-1 bg-background/80 backdrop-blur-sm rounded-bl-lg items-center">
                <span className="text-xs font-semibold mr-2">Add Node:</span>
                <Button size="xs" variant="outline" onClick={() => addNode('inputNode', 'Input')}>Input</Button>
                <Button size="xs" variant="outline" onClick={() => addNode('partitionNode', 'Partition')}>Partition</Button>
                <Button size="xs" variant="outline" onClick={() => addNode('cleanNode', 'Clean')}>Clean</Button>
                <Button size="xs" variant="outline" onClick={() => addNode('chunkNode', 'Chunk')}>Chunk</Button>
                <Button size="xs" variant="outline" onClick={() => addNode('extractLLMNode', 'LLM Extract')}>LLM Extract</Button>
                <Button size="xs" variant="outline" onClick={() => addNode('outputNode', 'Output')}>Output</Button>
                <div className="border-l h-5 mx-2"></div> {/* Vertical Separator */}
                <Button size="xs" variant="outline" onClick={saveFlow}>Save Flow</Button>
                <Button size="xs" variant="outline" onClick={loadFlow}>Load Flow</Button>
            </div>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onInit={setReactFlowInstance} // Already correctly capturing instance
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
            >
              <Controls />
              <MiniMap />
              <Background gap={16} />
            </ReactFlow>
          </CardContent>
        </Card>
      </div>
      {selectedNode && (
        <div className="w-96 h-full border-l bg-card"> 
          <NodeConfigPanel 
            selectedNode={selectedNode} 
            onClose={closeConfigPanel} 
            onNodeDataChange={handleNodeDataChange} 
          />
        </div>
      )}
    </div>
  );
};

// Add saveFlow and loadFlow functions here

const saveFlow = (rfInstance: ReactFlowInstance | null, nodesToSave: Node[], edgesToSave: Edge[], toastFn: Function, key: string) => {
  if (!rfInstance) {
    toastFn({ title: "Error", description: "React Flow instance not available.", variant: "destructive" });
    return;
  }

  const viewport = rfInstance.getViewport();
  const flowState = {
    nodes: nodesToSave,
    edges: edgesToSave,
    viewport: viewport,
  };

  try {
    localStorage.setItem(key, JSON.stringify(flowState));
    toastFn({ title: "Flow Saved", description: "Current flow state saved to local storage." });
  } catch (error) {
    console.error("Error saving flow to localStorage:", error);
    toastFn({ title: "Error Saving Flow", description: "Could not save flow to local storage.", variant: "destructive" });
  }
};

const loadFlow = (
    setNodesFn: (nodes: Node[]) => void, 
    setEdgesFn: (edges: Edge[]) => void, 
    rfInstance: ReactFlowInstance | null, 
    toastFn: Function, 
    key: string
  ) => {
  try {
    const storedFlow = localStorage.getItem(key);
    if (!storedFlow) {
      toastFn({ title: "No Saved Flow", description: "No flow state found in local storage." });
      return;
    }

    const parsedFlow = JSON.parse(storedFlow);

    if (parsedFlow && parsedFlow.nodes && parsedFlow.edges && parsedFlow.viewport) {
      setNodesFn(parsedFlow.nodes);
      setEdgesFn(parsedFlow.edges);
      if (rfInstance) {
        rfInstance.setViewport(parsedFlow.viewport);
      }
      toastFn({ title: "Flow Loaded", description: "Flow state restored from local storage." });
    } else {
      throw new Error("Invalid flow data structure.");
    }
  } catch (error) {
    console.error("Error loading flow from localStorage:", error);
    toastFn({ title: "Error Loading Flow", description: "Could not load flow. Data may be corrupted.", variant: "destructive" });
  }
};


export default ProcessingFlowCanvas;
