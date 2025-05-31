"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";

const OLLAMA_SETTINGS_LOCAL_STORAGE_KEY = "ollamaConfigSettings";

// Updated data structure for LLM extraction configuration
export interface ExtractLLMNodeData {
  label?: string;
  extractionPrompt?: string;
  ollamaServerUrl?: string;
  ollamaModelName?: string;
  ollamaTemperature?: number;
}

interface GlobalOllamaConfig {
  serverUrl: string;
  modelName: string;
  temperature: number;
}

interface ExtractLLMNodeConfigFormProps {
  data: ExtractLLMNodeData;
  onChange: (updatedData: ExtractLLMNodeData) => void;
}

const ExtractLLMNodeConfigForm: React.FC<ExtractLLMNodeConfigFormProps> = ({ data, onChange }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ExtractLLMNodeData>({
    label: data.label || '',
    extractionPrompt: data.extractionPrompt || '',
    ollamaServerUrl: data.ollamaServerUrl, // Will be defaulted in useEffect
    ollamaModelName: data.ollamaModelName, // Will be defaulted in useEffect
    ollamaTemperature: data.ollamaTemperature, // Will be defaulted in useEffect
  });

  useEffect(() => {
    let globalDefaults: Partial<GlobalOllamaConfig> = {
      serverUrl: 'http://localhost:11434', // Hardcoded fallback default
      modelName: 'llama3:latest',        // Hardcoded fallback default
      temperature: 0.7,                  // Hardcoded fallback default
    };

    try {
      const storedGlobalConfig = localStorage.getItem(OLLAMA_SETTINGS_LOCAL_STORAGE_KEY);
      if (storedGlobalConfig) {
        const parsedGlobalConfig = JSON.parse(storedGlobalConfig) as GlobalOllamaConfig;
        globalDefaults = { ...globalDefaults, ...parsedGlobalConfig };
      }
    } catch (error) {
      console.error("Failed to load global Ollama config from localStorage:", error);
      toast({
        title: "Error Loading Global Config",
        description: "Could not load global Ollama settings. Using defaults.",
        variant: "destructive",
      });
    }

    // Initialize formData with data from props, then apply global defaults if properties are missing
    setFormData({
      label: data.label || `LLM Extract ${Math.random().toString(36).substring(2, 5)}`,
      extractionPrompt: data.extractionPrompt || '',
      ollamaServerUrl: data.ollamaServerUrl ?? globalDefaults.serverUrl,
      ollamaModelName: data.ollamaModelName ?? globalDefaults.modelName,
      ollamaTemperature: data.ollamaTemperature ?? globalDefaults.temperature,
    });
  }, [data, toast]); // Rerun if `data` (from selected node) changes

  const handleChange = (field: keyof ExtractLLMNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };
  
  const handleNumericChange = (field: keyof ExtractLLMNodeData, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
     if (value === "" || (numValue !== undefined && !isNaN(numValue))) {
        handleChange(field, numValue);
    }
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
        <Label htmlFor="llm-extraction-prompt">Extraction Prompt</Label>
        <Textarea
          id="llm-extraction-prompt"
          value={formData.extractionPrompt || ''}
          onChange={(e) => handleChange('extractionPrompt', e.target.value)}
          placeholder="e.g., Extract all names of people and organizations..."
          rows={4}
        />
      </div>
      <hr/>
      <p className="text-sm font-medium text-muted-foreground">Ollama Settings (Overrides global if set)</p>
      <div>
        <Label htmlFor="ollama-server-url-node">Ollama Server URL</Label>
        <Input
          id="ollama-server-url-node"
          value={formData.ollamaServerUrl || ''}
          onChange={(e) => handleChange('ollamaServerUrl', e.target.value)}
          placeholder="Global default or http://localhost:11434"
        />
      </div>
      <div>
        <Label htmlFor="ollama-model-name-node">Model Name</Label>
        <Input
          id="ollama-model-name-node"
          value={formData.ollamaModelName || ''}
          onChange={(e) => handleChange('ollamaModelName', e.target.value)}
          placeholder="Global default or llama3:latest"
        />
      </div>
      <div>
        <Label htmlFor="ollama-temperature-node">Temperature</Label>
        <Input
          id="ollama-temperature-node"
          type="number"
          value={formData.ollamaTemperature === undefined ? '' : formData.ollamaTemperature}
          onChange={(e) => handleNumericChange('ollamaTemperature', e.target.value)}
          placeholder="Global default or 0.7"
          step="0.1"
          min="0"
        />
      </div>
    </div>
  );
};

export default ExtractLLMNodeConfigForm;
