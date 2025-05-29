"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type PartitioningStrategy = "auto" | "hi_res" | "ocr_only" | "fast";

interface ProcessingConfigurationProps {
  onConfigurationChange: (config: { strategy: PartitioningStrategy; removeExtraWhitespace: boolean }) => void;
  initialStrategy?: PartitioningStrategy;
  initialRemoveExtraWhitespace?: boolean;
}

const ProcessingConfiguration: React.FC<ProcessingConfigurationProps> = ({
  onConfigurationChange,
  initialStrategy = "auto",
  initialRemoveExtraWhitespace = true,
}) => {
  const [strategy, setStrategy] = useState<PartitioningStrategy>(initialStrategy);
  const [removeExtraWhitespace, setRemoveExtraWhitespace] = useState<boolean>(initialRemoveExtraWhitespace);

  const handleStrategyChange = (value: string) => {
    const newStrategy = value as PartitioningStrategy;
    setStrategy(newStrategy);
    onConfigurationChange({ strategy: newStrategy, removeExtraWhitespace });
  };

  const handleWhitespaceChange = (checked: boolean) => {
    setRemoveExtraWhitespace(checked);
    onConfigurationChange({ strategy, removeExtraWhitespace: checked });
  };

  return (
    <Card className="w-full max-w-lg mt-6">
      <CardHeader>
        <CardTitle>Processing Configuration</CardTitle>
        <CardDescription>Select how your documents should be processed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="partitioning-strategy">Partitioning Strategy</Label>
          <Select value={strategy} onValueChange={handleStrategyChange}>
            <SelectTrigger id="partitioning-strategy">
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Default)</SelectItem>
              <SelectItem value="hi_res">Hi-Res (High-resolution PDFs/images)</SelectItem>
              <SelectItem value="ocr_only">OCR Only (Force OCR)</SelectItem>
              <SelectItem value="fast">Fast (Faster, less accurate)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-2 pt-2">
          <Label htmlFor="remove-extra-whitespace" className="flex flex-col space-y-1">
            <span>Remove Extra Whitespace</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Helps clean up text by removing redundant spaces and lines.
            </span>
          </Label>
          <Switch
            id="remove-extra-whitespace"
            checked={removeExtraWhitespace}
            onCheckedChange={handleWhitespaceChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingConfiguration;
