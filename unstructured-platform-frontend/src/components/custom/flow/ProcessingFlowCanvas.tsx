"use client";

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css'; // Main React Flow styles
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        type: 'smoothstep', // Or 'default', 'straight', 'step'
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed } 
    }, eds)),
    [setEdges]
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
    <Card className="w-full h-[70vh] mt-6"> {/* Ensure height for the canvas */}
      <CardHeader>
        <CardTitle>Document Processing Flow</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] p-0"> {/* Adjust height calculation based on CardHeader */}
        <div className="flex mb-2 p-2 space-x-2 border-b">
            <Button size="sm" onClick={() => addNode('inputNode', 'Input')}>Add Input</Button>
            <Button size="sm" onClick={() => addNode('partitionNode', 'Partition')}>Add Partition</Button>
            <Button size="sm" onClick={() => addNode('cleanNode', 'Clean')}>Add Clean</Button>
            <Button size="sm" onClick={() => addNode('chunkNode', 'Chunk')}>Add Chunk</Button>
            <Button size="sm" onClick={() => addNode('extractLLMNode', 'LLM Extract')}>Add LLM Extract</Button>
            <Button size="sm" onClick={() => addNode('outputNode', 'Output')}>Add Output</Button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
  );
};

export default ProcessingFlowCanvas;
