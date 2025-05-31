"use client";

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type Node } from 'reactflow';
import { Separator } from '@/components/ui/separator';

// Import specific config forms
import PartitionNodeConfigForm, { PartitionNodeData } from './nodeconfigs/PartitionNodeConfigForm';
import ChunkNodeConfigForm, { ChunkNodeData } from './nodeconfigs/ChunkNodeConfigForm';
import InputNodeConfigForm, { InputNodeData } from './nodeconfigs/InputNodeConfigForm';
import OutputNodeConfigForm, { OutputNodeData } from './nodeconfigs/OutputNodeConfigForm';
import CleanNodeConfigForm, { CleanNodeData } from './nodeconfigs/CleanNodeConfigForm';
import ExtractLLMNodeConfigForm, { ExtractLLMNodeData } from './nodeconfigs/ExtractLLMNodeConfigForm';
import DefaultNodeConfigForm, { DefaultNodeData } from './nodeconfigs/DefaultNodeConfigForm';


interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  // Placeholder for actual update function in the next task
  onNodeDataChange: (nodeId: string, newData: any) => void; 
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ selectedNode, onClose, onNodeDataChange }) => {
  if (!selectedNode) {
    return null;
  }

  const handleNodeConfigChange = (updatedData: any) => {
    console.log(`Configuration changed for node ${selectedNode.id}:`, updatedData);
    // In the next step, this will call onNodeDataChange(selectedNode.id, updatedData);
    onNodeDataChange(selectedNode.id, updatedData); // Call the prop for now
  };

  const renderConfigForm = () => {
    if (!selectedNode) return <p>No node selected or node data is undefined.</p>;
    
    // Ensure selectedNode.data is not undefined, provide a default if necessary
    const nodeData = selectedNode.data || {};

    switch (selectedNode.type) {
      case 'inputNode':
        return <InputNodeConfigForm data={nodeData as InputNodeData} onChange={handleNodeConfigChange} />;
      case 'partitionNode':
        return <PartitionNodeConfigForm data={nodeData as PartitionNodeData} onChange={handleNodeConfigChange} />;
      case 'cleanNode':
        return <CleanNodeConfigForm data={nodeData as CleanNodeData} onChange={handleNodeConfigChange} />;
      case 'chunkNode':
        return <ChunkNodeConfigForm data={nodeData as ChunkNodeData} onChange={handleNodeConfigChange} />;
      case 'extractLLMNode':
        return <ExtractLLMNodeConfigForm data={nodeData as ExtractLLMNodeData} onChange={handleNodeConfigChange} />;
      case 'outputNode':
        return <OutputNodeConfigForm data={nodeData as OutputNodeData} onChange={handleNodeConfigChange} />;
      default:
        return <DefaultNodeConfigForm nodeType={selectedNode.type || "Unknown"} data={nodeData as DefaultNodeData} onChange={handleNodeConfigChange} />;
    }
  };

  return (
    <Card className="w-full md:w-96 h-full shadow-lg border-l flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between py-3 px-4 border-b">
        <div className="space-y-0.5">
          <CardTitle className="text-lg">Node: {selectedNode.data?.label || selectedNode.id}</CardTitle>
          <CardDescription className="text-xs">Type: {selectedNode.type || 'N/A'}</CardDescription>
        </div>
        <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground text-2xl p-1 -mt-1 -mr-1"
            aria-label="Close panel"
        >
            &times;
        </button>
      </CardHeader>
      <CardContent className="space-y-4 py-4 px-4 overflow-y-auto flex-grow scrollbar-thin">
        {renderConfigForm()}
      </CardContent>
    </Card>
  );
};

export default NodeConfigPanel;
