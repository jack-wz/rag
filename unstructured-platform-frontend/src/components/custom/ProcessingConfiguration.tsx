"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export type PartitioningStrategy = "auto" | "hi_res" | "ocr_only" | "fast";
export type ChunkingStrategy = "none" | "basic" | "by_title";

export interface ProcessingConfig {
  strategy: PartitioningStrategy;
  removeExtraWhitespace: boolean;
  ocrLanguages: string; // e.g., "eng+deu"
  pdfInferTableStructure: boolean;
  extractImageBlockTypes: string; // Comma-separated, e.g., "Image,Table"
  
  chunkingStrategy: ChunkingStrategy;
  chunkMaxCharacters?: number;
  chunkNewAfterNChars?: number;
  chunkCombineTextUnderNChars?: number; // Specific to by_title but can be grouped
  chunkOverlap?: number;
  chunkMultipageSections?: boolean; // Specific to by_title
}

interface ProcessingConfigurationProps {
  onConfigurationChange: (config: ProcessingConfig) => void;
  initialConfig: ProcessingConfig;
}

const ProcessingConfiguration: React.FC<ProcessingConfigurationProps> = ({
  onConfigurationChange,
  initialConfig,
}) => {
  const [config, setConfig] = useState<ProcessingConfig>(initialConfig);

  useEffect(() => {
    onConfigurationChange(config);
  }, [config, onConfigurationChange]);

  const handleValueChange = (key: keyof ProcessingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleNumberValueChange = (key: keyof ProcessingConfig, value: string) => {
    const numValue = value === "" ? undefined : parseInt(value, 10);
    if (value === "" || (numValue !== undefined && !isNaN(numValue))) {
      setConfig(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const showChunkingParams = useMemo(() => config.chunkingStrategy !== "none", [config.chunkingStrategy]);

  return (
    <Card className="w-full max-w-2xl mt-6">
      <CardHeader>
        <CardTitle>Processing Configuration</CardTitle>
        <CardDescription>Fine-tune how your documents are partitioned and chunked.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Partitioning Section */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Partitioning</h3>
            <Separator className="mb-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="partitioning-strategy">Strategy</Label>
              <Select
                value={config.strategy}
                onValueChange={(value) => handleValueChange('strategy', value as PartitioningStrategy)}
              >
                <SelectTrigger id="partitioning-strategy">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Default)</SelectItem>
                  <SelectItem value="hi_res">Hi-Res (PDFs/images)</SelectItem>
                  <SelectItem value="ocr_only">OCR Only</SelectItem>
                  <SelectItem value="fast">Fast (Text-based)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ocr-languages">OCR Languages (e.g., eng+deu)</Label>
              <Input
                id="ocr-languages"
                value={config.ocrLanguages}
                onChange={(e) => handleValueChange('ocrLanguages', e.target.value)}
                placeholder="eng"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex items-center justify-between space-x-2 pt-2">
                <Label htmlFor="remove-extra-whitespace" className="flex flex-col space-y-1">
                    <span>Remove Extra Whitespace</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Cleans text by removing redundant spaces and lines.
                    </span>
                </Label>
                <Switch
                    id="remove-extra-whitespace"
                    checked={config.removeExtraWhitespace}
                    onCheckedChange={(checked) => handleValueChange('removeExtraWhitespace', checked)}
                    className="mt-1"
                />
            </div>
            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="pdf-infer-table-structure" className="flex flex-col space-y-1">
                <span>PDF Infer Table Structure</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  Relevant for PDFs to identify table structures.
                </span>
              </Label>
              <Switch
                id="pdf-infer-table-structure"
                checked={config.pdfInferTableStructure}
                onCheckedChange={(checked) => handleValueChange('pdfInferTableStructure', checked)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extract-image-block-types">Extract Image Block Types (comma-separated)</Label>
            <Input
              id="extract-image-block-types"
              value={config.extractImageBlockTypes}
              onChange={(e) => handleValueChange('extractImageBlockTypes', e.target.value)}
              placeholder="Image,Table (relevant for hi_res PDF strategy)"
            />
             <p className="text-xs text-muted-foreground">
                E.g., "Image,Table". Relevant for 'hi_res' PDF strategy. Leave empty for none.
            </p>
          </div>
        </div>

        {/* Chunking Section */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Chunking</h3>
            <Separator className="mb-4" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chunking-strategy">Chunking Strategy</Label>
            <Select
              value={config.chunkingStrategy}
              onValueChange={(value) => handleValueChange('chunkingStrategy', value as ChunkingStrategy)}
            >
              <SelectTrigger id="chunking-strategy">
                <SelectValue placeholder="Select chunking strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="by_title">By Title</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showChunkingParams && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="chunk-max-characters">Max Characters per Chunk</Label>
                <Input
                  id="chunk-max-characters"
                  type="number"
                  value={config.chunkMaxCharacters ?? ''}
                  onChange={(e) => handleNumberValueChange('chunkMaxCharacters', e.target.value)}
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chunk-new-after-n-chars">New Chunk After N Chars (Soft Max)</Label>
                <Input
                  id="chunk-new-after-n-chars"
                  type="number"
                  value={config.chunkNewAfterNChars ?? ''}
                  onChange={(e) => handleNumberValueChange('chunkNewAfterNChars', e.target.value)}
                  placeholder="e.g., 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chunk-overlap">Overlap Between Chunks</Label>
                <Input
                  id="chunk-overlap"
                  type="number"
                  value={config.chunkOverlap ?? ''}
                  onChange={(e) => handleNumberValueChange('chunkOverlap', e.target.value)}
                  placeholder="e.g., 0"
                />
              </div>
              {config.chunkingStrategy === 'by_title' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="chunk-combine-text">Combine Text Under N Chars (for by_title)</Label>
                    <Input
                      id="chunk-combine-text"
                      type="number"
                      value={config.chunkCombineTextUnderNChars ?? ''}
                      onChange={(e) => handleNumberValueChange('chunkCombineTextUnderNChars', e.target.value)}
                      placeholder="e.g., 200"
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 pt-2 md:col-span-2">
                    <Label htmlFor="chunk-multipage-sections" className="flex flex-col space-y-1">
                        <span>Multipage Sections (for by_title)</span>
                        <span className="font-normal leading-snug text-muted-foreground text-xs">
                        If true (default), sections can span multiple pages. If false, page breaks also start new chunks.
                        </span>
                    </Label>
                    <Switch
                        id="chunk-multipage-sections"
                        checked={config.chunkMultipageSections ?? true}
                        onCheckedChange={(checked) => handleValueChange('chunkMultipageSections', checked)}
                        className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingConfiguration;
