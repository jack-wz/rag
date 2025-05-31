"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast"; // Assuming Toaster is set up in layout
import { ProcessingConfig } from './ProcessingConfiguration'; // Import the type

const LOCAL_STORAGE_KEY = "processingTemplates";

interface Template {
  name: string;
  config: ProcessingConfig;
}

interface ProcessingTemplatesProps {
  currentConfig: ProcessingConfig;
  onLoadTemplate: (config: ProcessingConfig) => void;
}

const ProcessingTemplates: React.FC<ProcessingTemplatesProps> = ({ currentConfig, onLoadTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const { toast } = useToast();

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const storedTemplates = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedTemplates) {
        setTemplates(JSON.parse(storedTemplates));
      }
    } catch (error) {
      console.error("Failed to load templates from localStorage:", error);
      toast({
        title: "Error",
        description: "Could not load templates from local storage.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error("Failed to save templates to localStorage:", error);
      // Potentially show a toast error here if saving is critical and fails
    }
  }, [templates]);

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({ title: "Error", description: "Template name cannot be empty.", variant: "destructive" });
      return;
    }
    if (templates.find(t => t.name.toLowerCase() === newTemplateName.trim().toLowerCase())) {
      toast({ title: "Error", description: "A template with this name already exists.", variant: "destructive" });
      return;
    }

    const newTemplate: Template = { name: newTemplateName.trim(), config: currentConfig };
    setTemplates(prevTemplates => [...prevTemplates, newTemplate]);
    setNewTemplateName(""); // Clear input
    toast({ title: "Success", description: `Template "${newTemplate.name}" saved.` });
  };

  const handleLoadTemplate = (templateName: string) => {
    const templateToLoad = templates.find(t => t.name === templateName);
    if (templateToLoad) {
      onLoadTemplate(templateToLoad.config);
      setSelectedTemplateName(templateName);
      toast({ title: "Template Loaded", description: `Settings from "${templateName}" applied.` });
    }
  };

  const handleDeleteTemplate = () => {
    if (!selectedTemplateName) {
      toast({ title: "Error", description: "Please select a template to delete.", variant: "destructive" });
      return;
    }
    setTemplates(prevTemplates => prevTemplates.filter(t => t.name !== selectedTemplateName));
    toast({ title: "Template Deleted", description: `Template "${selectedTemplateName}" deleted.` });
    setSelectedTemplateName(""); // Clear selection
  };

  return (
    <Card className="w-full max-w-2xl mt-6">
      <CardHeader>
        <CardTitle>Processing Templates</CardTitle>
        <CardDescription>Save, load, or delete processing configurations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Save Template Section */}
        <div className="space-y-2">
          <Label htmlFor="new-template-name">New Template Name</Label>
          <div className="flex space-x-2">
            <Input
              id="new-template-name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g., My PDF Settings"
            />
            <Button onClick={handleSaveTemplate}>Save Current Settings</Button>
          </div>
        </div>

        {/* Load and Delete Template Section */}
        {templates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="load-template-select">Load or Delete Template</Label>
            <div className="flex space-x-2">
              <Select
                value={selectedTemplateName}
                onValueChange={(value) => {
                  setSelectedTemplateName(value); // Keep track of selection for delete
                  handleLoadTemplate(value);      // Load on select
                }}
              >
                <SelectTrigger id="load-template-select" className="flex-grow">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDeleteTemplate} 
                variant="destructive"
                disabled={!selectedTemplateName}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        )}
        {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">No saved templates yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessingTemplates;
