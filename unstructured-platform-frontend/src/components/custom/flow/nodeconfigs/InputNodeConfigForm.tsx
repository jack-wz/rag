"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface InputNodeData {
  label?: string;
  // Future: source type (e.g., upload, URL), specific file if pre-selected
}

interface InputNodeConfigFormProps {
  data: InputNodeData;
  onChange: (updatedData: InputNodeData) => void;
}

const InputNodeConfigForm: React.FC<InputNodeConfigFormProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState<InputNodeData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: keyof InputNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label-input">Node Label</Label>
        <Input
          id="node-label-input"
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Document Input"
        />
      </div>
      <p className="text-xs text-muted-foreground">Input node configuration (e.g., select source type) will be available here.</p>
    </div>
  );
};

export default InputNodeConfigForm;
