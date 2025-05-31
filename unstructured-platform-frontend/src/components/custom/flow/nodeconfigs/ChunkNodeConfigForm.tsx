"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChunkingStrategy } from '../../ProcessingConfiguration'; // Re-use type

export interface ChunkNodeData {
  label?: string; // From the node itself
  chunkingStrategy?: ChunkingStrategy;
  chunkMaxCharacters?: number;
  chunkNewAfterNChars?: number;
  chunkCombineTextUnderNChars?: number;
  chunkOverlap?: number;
  chunkMultipageSections?: boolean;
}

interface ChunkNodeConfigFormProps {
  data: ChunkNodeData;
  onChange: (updatedData: ChunkNodeData) => void;
}

const ChunkNodeConfigForm: React.FC<ChunkNodeConfigFormProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState<ChunkNodeData>(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (field: keyof ChunkNodeData, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    onChange(updatedFormData);
  };

  const handleNumberChange = (field: keyof ChunkNodeData, value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    handleChange(field, num);
  };
  
  const showByTitleParams = formData.chunkingStrategy === 'by_title';

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="node-label-chunk">Node Label</Label>
        <Input
          id="node-label-chunk"
          value={formData.label || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Chunk by Title"
        />
      </div>
      <div>
        <Label htmlFor="chunking-strategy">Chunking Strategy</Label>
        <Select
          value={formData.chunkingStrategy || 'none'}
          onValueChange={(value) => handleChange('chunkingStrategy', value as ChunkingStrategy)}
        >
          <SelectTrigger id="chunking-strategy">
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="by_title">By Title</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.chunkingStrategy !== 'none' && (
        <>
          <div>
            <Label htmlFor="chunk-max-chars">Max Characters</Label>
            <Input
              id="chunk-max-chars"
              type="number"
              value={formData.chunkMaxCharacters === undefined ? '' : formData.chunkMaxCharacters}
              onChange={(e) => handleNumberChange('chunkMaxCharacters', e.target.value)}
              placeholder="e.g., 500"
            />
          </div>
          <div>
            <Label htmlFor="chunk-new-after-n-chars">New After N Chars (Soft Max)</Label>
            <Input
              id="chunk-new-after-n-chars"
              type="number"
              value={formData.chunkNewAfterNChars === undefined ? '' : formData.chunkNewAfterNChars}
              onChange={(e) => handleNumberChange('chunkNewAfterNChars', e.target.value)}
              placeholder="e.g., 500"
            />
          </div>
          <div>
            <Label htmlFor="chunk-overlap">Overlap</Label>
            <Input
              id="chunk-overlap"
              type="number"
              value={formData.chunkOverlap === undefined ? '' : formData.chunkOverlap}
              onChange={(e) => handleNumberChange('chunkOverlap', e.target.value)}
              placeholder="e.g., 0"
            />
          </div>
          {showByTitleParams && (
            <>
              <div>
                <Label htmlFor="chunk-combine-text">Combine Text Under N Chars (for by_title)</Label>
                <Input
                  id="chunk-combine-text"
                  type="number"
                  value={formData.chunkCombineTextUnderNChars === undefined ? '' : formData.chunkCombineTextUnderNChars}
                  onChange={(e) => handleNumberChange('chunkCombineTextUnderNChars', e.target.value)}
                  placeholder="e.g., 200"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="chunk-multipage" className="flex flex-col space-y-1">
                  <span>Multipage Sections (for by_title)</span>
                   <span className="text-xs font-normal text-muted-foreground">If true, sections can span pages.</span>
                </Label>
                <Switch
                  id="chunk-multipage"
                  checked={formData.chunkMultipageSections === undefined ? true : formData.chunkMultipageSections}
                  onCheckedChange={(checked) => handleChange('chunkMultipageSections', checked)}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChunkNodeConfigForm;
