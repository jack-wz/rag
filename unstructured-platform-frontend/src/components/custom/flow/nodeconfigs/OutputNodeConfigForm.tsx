"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface OutputNodeData {
  label?: string;
  // Future: output format (e.g., JSON, CSV), destination (e.g., download, API)
}

interface OutputNodeConfigFormProps {
  data: OutputNodeData;
  onChange: (updatedData: OutputNodeData) => void;
}

const OutputNodeConfigForm: React.FC<OutputNodeConfigFormProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState<OutputNodeData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: keyof OutputNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label-output">Node Label</Label>
        <Input
          id="node-label-output"
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Processed Output"
        />
      </div>
      <p className="text-xs text-muted-foreground">Output node configuration (e.g., select output format) will be available here.</p>
    </div>
  );
};

export default OutputNodeConfigForm;
