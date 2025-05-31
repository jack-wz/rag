import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

const OutputNode = ({ data }: { data: { label: string } }) => {
  return (
    <Card className="w-48 bg-red-100 border-red-300 shadow-md">
      <CardHeader className="p-3">
        <CardTitle className="text-sm text-center">{data.label || 'Output'}</CardTitle>
      </CardHeader>
      {/* Input handle only */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-500" />
    </Card>
  );
};

export default OutputNode;
