"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // For fallback table display

interface ElementMetadata {
  text_as_html?: string;
  page_number?: number;
  filename?: string;
  [key: string]: any; // Allow other metadata properties
}

interface ProcessedElement {
  type: string;
  text: string;
  metadata: ElementMetadata;
  // Potentially other fields depending on the element type
  [key: string]: any; 
}

interface ResultDisplayProps {
  data: { elements: ProcessedElement[] } | null;
  error?: string | null;
}

const ElementDisplay: React.FC<{ element: ProcessedElement }> = ({ element }) => {
  const { type, text, metadata } = element;

  const renderMetadata = () => (
    <div className="mt-2 text-xs text-muted-foreground space-x-2">
      <Badge variant="outline">{type}</Badge>
      {metadata.filename && <span>File: {metadata.filename}</span>}
      {metadata.page_number && <span>Page: {metadata.page_number}</span>}
    </div>
  );

  switch (type) {
    case 'Title':
    case 'SectionBreak': // Assuming SectionBreak might be similar to a Title
      return (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">{text}</CardTitle>
            {renderMetadata()}
          </CardHeader>
        </Card>
      );
    case 'NarrativeText':
    case 'Text':
    case 'Address':
    case 'Abstract':
      return (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p>{text}</p>
            {renderMetadata()}
          </CardContent>
        </Card>
      );
    case 'ListItem':
      // For simplicity, rendering as individual items. Grouping would require more logic.
      return (
        <Card className="mb-2 ml-4">
          <CardContent className="pt-4 pb-2 flex items-start">
            <span className="mr-2 text-primary">&#8226;</span> {/* Bullet point */}
            <div className="flex-1">
              <p>{text}</p>
              {renderMetadata()}
            </div>
          </CardContent>
        </Card>
      );
    case 'Table':
      return (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Table</CardTitle>
            {renderMetadata()}
          </CardHeader>
          <CardContent>
            {metadata.text_as_html ? (
              <>
                <Alert variant="default" className="mb-2">
                  <AlertDescription>
                    Displaying table HTML. Ensure content is trusted.
                  </AlertDescription>
                </Alert>
                <div 
                  className="prose dark:prose-invert max-w-none overflow-x-auto border rounded-md p-2" 
                  dangerouslySetInnerHTML={{ __html: metadata.text_as_html }} 
                />
              </>
            ) : text ? (
              <pre className="p-2 bg-muted rounded-md text-xs overflow-x-auto">{text}</pre>
            ) : (
              <p className="text-muted-foreground">[Table content not available in specified format]</p>
            )}
          </CardContent>
        </Card>
      );
    case 'Image':
    case 'Figure':
      return (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">[Image: (type: {type}, text: {text || 'N/A'})]</p>
            {renderMetadata()}
          </CardContent>
        </Card>
      );
    case 'CodeSnippet':
      return (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-mono">Code Snippet</CardTitle>
            {renderMetadata()}
          </CardHeader>
          <CardContent>
            <pre className="p-2 bg-muted rounded-md text-xs overflow-x-auto">{text}</pre>
          </CardContent>
        </Card>
      );
    case 'Header':
    case 'Footer':
      return (
        <Card className="mb-4 bg-slate-50 dark:bg-slate-800">
          <CardContent className="pt-4 pb-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">{text}</p>
            {renderMetadata()}
          </CardContent>
        </Card>
      );
    default:
      return (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p>{text || "[No text content]"}</p>
            {renderMetadata()}
          </CardContent>
        </Card>
      );
  }
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, error }) => {
  if (error) {
    return (
      <Card className="w-full max-w-3xl mt-6">
        <CardHeader>
          <CardTitle className="text-destructive">Processing Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.elements || data.elements.length === 0) {
    return (
      <Card className="w-full max-w-3xl mt-6">
        <CardHeader>
          <CardTitle>No Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No elements were processed or found in the document.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mt-6 space-y-4 max-h-[70vh] overflow-y-auto p-1">
      <CardHeader className="p-0 mb-2 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <CardTitle>Processed Document Elements</CardTitle>
        <CardDescription>
          Below are the elements extracted from your document, rendered by type.
        </CardDescription>
      </CardHeader>
      {data.elements.map((element, index) => (
        <ElementDisplay key={element.id || index} element={element} />
      ))}
    </div>
  );
};

export default ResultDisplay;
