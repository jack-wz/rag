import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

const PartitionNode = ({ data }: { data: { label: string } }) => {
  return (
    <Card className="w-48 bg-green-100 border-green-300 shadow-md">
      <CardHeader className="p-3">
        <CardTitle className="text-sm text-center">{data.label || 'Partition'}</CardTitle>
      </CardHeader>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </Card>
  );
};

export default PartitionNode;
