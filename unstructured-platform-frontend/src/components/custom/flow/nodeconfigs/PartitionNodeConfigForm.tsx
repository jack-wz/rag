"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PartitioningStrategy } from '../../ProcessingConfiguration'; // Re-use type if applicable

export interface PartitionNodeData {
  label?: string; // From the node itself
  strategy?: PartitioningStrategy;
  ocrLanguages?: string;
  pdfInferTableStructure?: boolean;
  extractImageBlockTypes?: string; // Comma-separated
}

interface PartitionNodeConfigFormProps {
  data: PartitionNodeData;
  onChange: (updatedData: PartitionNodeData) => void;
}

const PartitionNodeConfigForm: React.FC<PartitionNodeConfigFormProps> = ({ data, onChange }) => {
  // Initialize state from props to make the form controlled
  const [formData, setFormData] = useState<PartitionNodeData>(data);

  useEffect(() => {
    setFormData(data); // Update internal state if prop data changes
  }, [data]);

  const handleChange = (field: keyof PartitionNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData); // Propagate changes up
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label">Node Label</Label>
        <Input
          id="node-label"
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Partition PDFs"
        />
      </div>
      <div>
        <Label htmlFor="partition-strategy">Strategy</Label>
        <Select
          value={formData.strategy || 'auto'}
          onValueChange={(value) => handleChange('strategy', value as PartitioningStrategy)}
        >
          <SelectTrigger id="partition-strategy">
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="hi_res">Hi-Res</SelectItem>
            <SelectItem value="ocr_only">OCR Only</SelectItem>
            <SelectItem value="fast">Fast</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="partition-ocr-languages">OCR Languages (e.g., eng+deu)</Label>
        <Input
          id="partition-ocr-languages"
          value={formData.ocrLanguages || 'eng'}
          onChange={(e) => handleChange('ocrLanguages', e.target.value)}
          placeholder="eng"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="partition-pdf-infer-table" className="flex flex-col space-y-1">
          <span>PDF Infer Table Structure</span>
          <span className="text-xs font-normal text-muted-foreground">Applies to PDF processing.</span>
        </Label>
        <Switch
          id="partition-pdf-infer-table"
          checked={formData.pdfInferTableStructure === undefined ? true : formData.pdfInferTableStructure}
          onCheckedChange={(checked) => handleChange('pdfInferTableStructure', checked)}
        />
      </div>
      <div>
        <Label htmlFor="partition-extract-images">Extract Image Block Types (comma-separated)</Label>
        <Input
          id="partition-extract-images"
          value={formData.extractImageBlockTypes || ''}
          onChange={(e) => handleChange('extractImageBlockTypes', e.target.value)}
          placeholder="Image,Table (for hi_res PDF)"
        />
      </div>
    </div>
  );
};

export default PartitionNodeConfigForm;
