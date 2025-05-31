"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Generic data type for nodes that might just have a label
export interface DefaultNodeData {
  label?: string;
  [key: string]: any; // Allow other properties
}

interface DefaultNodeConfigFormProps {
  nodeType: string;
  data: DefaultNodeData;
  onChange: (updatedData: DefaultNodeData) => void;
}

const DefaultNodeConfigForm: React.FC<DefaultNodeConfigFormProps> = ({ nodeType, data, onChange }) => {
  const [formData, setFormData] = useState<DefaultNodeData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: keyof DefaultNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`node-label-${nodeType}`}>Node Label</Label>
        <Input
          id={`node-label-${nodeType}`}
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder={`e.g., ${nodeType} Label`}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Configuration options for '{nodeType}' nodes will be available here in the future.
      </p>
      {Object.keys(formData).filter(key => key !== 'label').length > 0 && (
        <div className="mt-2">
            <p className="text-xs font-semibold">Current Data (excluding label):</p>
            <pre className="text-xs bg-muted p-2 rounded-sm overflow-x-auto">
                {JSON.stringify(Object.fromEntries(Object.entries(formData).filter(([key]) => key !== 'label')), null, 2)}
            </pre>
        </div>
      )}
    </div>
  );
};

export default DefaultNodeConfigForm;
