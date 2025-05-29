"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Example: data structure for LLM extraction configuration
export interface ExtractLLMNodeData {
  label?: string;
  extractionPrompt?: string;
  modelName?: string; // Could be from Ollama config or specific here
}

interface ExtractLLMNodeConfigFormProps {
  data: ExtractLLMNodeData;
  onChange: (updatedData: ExtractLLMNodeData) => void;
}

const ExtractLLMNodeConfigForm: React.FC<ExtractLLMNodeConfigFormProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState<ExtractLLMNodeData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: keyof ExtractLLMNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label-llm">Node Label</Label>
        <Input
          id="node-label-llm"
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Extract Entities"
        />
      </div>
      <div>
        <Label htmlFor="llm-model-name">Model Name (from Ollama or specific)</Label>
        <Input
          id="llm-model-name"
          value={formData.modelName || ''}
          onChange={(e) => handleChange('modelName', e.target.value)}
          placeholder="e.g., llama3:latest"
        />
      </div>
      <div>
        <Label htmlFor="llm-extraction-prompt">Extraction Prompt</Label>
        <Textarea
          id="llm-extraction-prompt"
          value={formData.extractionPrompt || ''}
          onChange={(e) => handleChange('extractionPrompt', e.target.value)}
          placeholder="e.g., Extract all names of people and organizations..."
          rows={4}
        />
      </div>
      <p className="text-xs text-muted-foreground">Configure LLM-based extraction parameters.</p>
    </div>
  );
};

export default ExtractLLMNodeConfigForm;
