"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button'; // Import Button

interface ElementMetadata {
  text_as_html?: string;
  page_number?: number;
  filename?: string;
  source_url?: string; // For CSV export
  parent_id?: string;  // For CSV export
  [key: string]: any; 
}

interface ProcessedElement {
  type: string;
  text: string;
  metadata: ElementMetadata;
  id?: string; // Element ID, sometimes available
  [key: string]: any; 
}

interface ResultDisplayProps {
  data: { elements: ProcessedElement[] } | null;
  error?: string | null;
}

// Helper function to export data to JSON
const exportToJson = (elements: ProcessedElement[], filename: string = "results.json") => {
  const jsonString = JSON.stringify(elements, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Helper function to escape CSV fields
const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const stringField = String(field);
  // If the field contains a comma, newline, or double quote, wrap it in double quotes
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    // Escape double quotes within the field by doubling them
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

// Helper function to export data to CSV
const exportToCsv = (elements: ProcessedElement[], filename: string = "results.csv") => {
  if (!elements || elements.length === 0) return;

  const headers = ['ID', 'Type', 'Text', 'Filename', 'Page Number', 'Source URL', 'Parent ID'];
  const csvRows = [headers.join(',')]; // Header row

  elements.forEach(el => {
    const row = [
      escapeCsvField(el.id || ''), // Use element ID if available
      escapeCsvField(el.type),
      escapeCsvField(el.text),
      escapeCsvField(el.metadata?.filename || ''),
      escapeCsvField(el.metadata?.page_number || ''),
      escapeCsvField(el.metadata?.source_url || ''), // Assuming source_url might be a metadata field
      escapeCsvField(el.metadata?.parent_id || ''),  // Assuming parent_id might be a metadata field
    ];
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};


const ElementDisplay: React.FC<{ element: ProcessedElement }> = ({ element }) => {
  const { type, text, metadata, id } = element;

  const renderMetadata = () => (
    <div className="mt-2 text-xs text-muted-foreground space-y-1"> {/* Changed to space-y-1 for better layout with multiple lines */}
      <div>
        <Badge variant="outline" className="mr-2">{type}</Badge>
        {id && <span className="mr-2">ID: {id.substring(0,8)}...</span>}
        {/* Display original_filename if available, otherwise fallback to filename */}
        {(metadata.original_filename || metadata.filename) && (
          <span className="mr-2">
            Source: {metadata.original_filename || metadata.filename}
          </span>
        )}
        {metadata.page_number && <span>Page: {metadata.page_number}</span>}
      </div>
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
    <div className="w-full max-w-3xl mt-6 space-y-4">
      <CardHeader className="p-0 mb-2 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 flex flex-row justify-between items-center">
        <div>
          <CardTitle>Processed Document Elements</CardTitle>
          <CardDescription>
            Below are the elements extracted from your document, rendered by type.
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => exportToJson(data.elements, `results-${new Date().toISOString()}.json`)}
            disabled={!data || !data.elements || data.elements.length === 0}
            variant="outline"
            size="sm"
          >
            Export as JSON
          </Button>
          <Button
            onClick={() => exportToCsv(data.elements, `results-${new Date().toISOString()}.csv`)}
            disabled={!data || !data.elements || data.elements.length === 0}
            variant="outline"
            size="sm"
          >
            Export as CSV
          </Button>
        </div>
      </CardHeader>
      <div className="max-h-[calc(70vh-50px)] overflow-y-auto p-1">
        {data.elements.map((element, index) => (
          <ElementDisplay key={element.id || index} element={element} />
        ))}
      </div>
    </div>
  );
};

export default ResultDisplay;
