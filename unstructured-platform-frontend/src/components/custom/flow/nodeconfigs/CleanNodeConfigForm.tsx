"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export interface CleanNodeData {
  label?: string;
  removeExtraWhitespace?: boolean;
  // Future: other cleaning options like remove_punctuation, etc.
}

interface CleanNodeConfigFormProps {
  data: CleanNodeData;
  onChange: (updatedData: CleanNodeData) => void;
}

const CleanNodeConfigForm: React.FC<CleanNodeConfigFormProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState<CleanNodeData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: keyof CleanNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label-clean">Node Label</Label>
        <Input
          id="node-label-clean"
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Clean Text"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="clean-remove-whitespace" className="flex flex-col space-y-1">
          <span>Remove Extra Whitespace</span>
        </Label>
        <Switch
          id="clean-remove-whitespace"
          checked={formData.removeExtraWhitespace === undefined ? true : formData.removeExtraWhitespace}
          onCheckedChange={(checked) => handleChange('removeExtraWhitespace', checked)}
        />
      </div>
      <p className="text-xs text-muted-foreground">More cleaning options will be available here.</p>
    </div>
  );
};

export default CleanNodeConfigForm;
