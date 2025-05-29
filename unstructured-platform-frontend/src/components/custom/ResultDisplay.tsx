"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ResultDisplayProps {
  data: any; // The JSON data to display (array of processed elements)
  error?: string | null; // Optional error message
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, error }) => {
  if (error) {
    return (
      <Card className="w-full max-w-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-destructive">Processing Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null; // Don't render anything if there's no data (and no error)
  }

  return (
    <Card className="w-full max-w-3xl mt-6">
      <CardHeader>
        <CardTitle>Processed Document Elements</CardTitle>
        <CardDescription>
          Below is the JSON representation of the elements extracted from your document.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto max-h-[600px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};

export default ResultDisplay;
