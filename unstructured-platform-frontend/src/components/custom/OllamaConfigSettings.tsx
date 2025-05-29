"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";

const LOCAL_STORAGE_KEY_OLLAMA = "ollamaConfigSettings";

export interface OllamaConfig {
  serverUrl: string;
  modelName: string;
  temperature: number;
}

const OllamaConfigSettings: React.FC = () => {
  const [config, setConfig] = useState<OllamaConfig>({
    serverUrl: 'http://localhost:11434',
    modelName: 'llama3:latest',
    temperature: 0.7,
  });
  const { toast } = useToast();

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem(LOCAL_STORAGE_KEY_OLLAMA);
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        // Ensure all keys are present, merge with defaults if not
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.error("Failed to load Ollama config from localStorage:", error);
      toast({
        title: "Error Loading Config",
        description: "Could not load Ollama settings from local storage.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: name === 'temperature' ? parseFloat(value) : value,
    }));
  };
  
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for user input, but store as number or default
    if (value === "") {
        setConfig(prevConfig => ({ ...prevConfig, temperature: 0.7 })); // Or some other default/NaN handling
    } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setConfig(prevConfig => ({ ...prevConfig, temperature: numValue }));
        }
    }
  };


  const handleSaveSettings = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_OLLAMA, JSON.stringify(config));
      toast({
        title: "Settings Saved",
        description: "Ollama configuration saved to local storage.",
      });
    } catch (error) {
      console.error("Failed to save Ollama config to localStorage:", error);
      toast({
        title: "Error Saving Config",
        description: "Could not save Ollama settings to local storage.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Ollama Configuration</CardTitle>
        <CardDescription>Configure settings for connecting to your Ollama instance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ollama-server-url">Ollama Server URL</Label>
          <Input
            id="ollama-server-url"
            name="serverUrl"
            value={config.serverUrl}
            onChange={handleInputChange}
            placeholder="http://localhost:11434"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ollama-model-name">Model Name</Label>
          <Input
            id="ollama-model-name"
            name="modelName"
            value={config.modelName}
            onChange={handleInputChange}
            placeholder="llama3:latest or mistral"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ollama-temperature">Temperature</Label>
          <Input
            id="ollama-temperature"
            name="temperature"
            type="number"
            value={config.temperature}
            onChange={handleTemperatureChange}
            placeholder="e.g., 0.7"
            step="0.1"
            min="0"
            max="2" // Common range, adjust as needed
          />
        </div>
        <Button onClick={handleSaveSettings} className="w-full">Save Settings</Button>
      </CardContent>
    </Card>
  );
};

export default OllamaConfigSettings;
