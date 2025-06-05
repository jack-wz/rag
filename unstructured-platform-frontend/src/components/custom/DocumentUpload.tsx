"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button'; // Import Button

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
  onPreviewFile: (file: File) => void; // New prop for triggering preview
}

const acceptedFileTypes: Accept = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/html': ['.html', '.htm'],
};

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFilesSelected,
  onPreviewFile,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false); // Placeholder for upload state

  useEffect(() => {
    onFilesSelected(selectedFiles);
  }, [selectedFiles, onFilesSelected]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setSelectedFiles(prevFiles => {
      const newAndUniqueFiles = acceptedFiles.filter(newFile => 
        !prevFiles.some(existingFile => 
          existingFile.name === newFile.name && existingFile.size === newFile.size
        )
      );
      return [...prevFiles, ...newAndUniqueFiles];
    });
    setRejectedFiles(prevRejected => [...prevRejected, ...fileRejections]); // Append new rejections

    // Simulate upload start for newly added unique files
    if (acceptedFiles.length > 0) { // Keep simulation logic, or adjust based on newAndUniqueFiles.length
      setIsUploading(true);
      // Simulate upload completion after a delay
      setTimeout(() => {
        setIsUploading(false);
        // Here you would typically call an actual upload function
        // Consider logging only for newAndUniqueFiles if that's desired
        console.log('Simulated upload finished for accepted files:', acceptedFiles.map(f => f.name));
      }, 3000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: true, // Explicitly set, though it's default
    maxSize: 10 * 1024 * 1024, // 10MB limit example
  });

  const removeFile = (fileName: string) => {
    setSelectedFiles(prevFiles => 
      prevFiles.filter(file => file.name !== fileName)
    );
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>Drag & drop files here, or click to select files. Multiple files are supported.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`p-6 border-2 border-dashed rounded-md cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/70'}
            transition-colors`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-center text-primary">Drop the files here ...</p>
          ) : (
            <p className="text-center text-muted-foreground">Drag 'n' drop files here, or click to select files</p>
          )}
        </div>

        {rejectedFiles.length > 0 && (
          <Alert variant="destructive" className="mt-4 max-h-40 overflow-y-auto">
            <AlertDescription>
              Some files were rejected:
              <ul className="list-disc list-inside text-xs">
                {rejectedFiles.map(({ file, errors }, index) => (
                  // Using index for key as file.name might not be unique among rejected if retrying
                  <li key={`${file.name}-${index}`}> 
                    {file.name} - {errors.map(e => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold">Selected Files ({selectedFiles.length}):</h4>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 mt-1 space-y-1">
              {selectedFiles.map(file => (
                <div key={`${file.name}-${file.lastModified}`} className="flex justify-between items-center p-1.5 bg-muted/50 rounded text-sm">
                  <div>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({Math.round(file.size / 1024)} KB) - {file.type || 'unknown type'}
                    </span>
                  </div>
                  <div className="space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreviewFile(file)} // Call onPreviewFile prop
                      className="h-auto px-2 py-1 text-xs"
                      aria-label={`Preview ${file.name}`}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.name)}
                      className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 h-auto px-2 py-1 text-xs"
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isUploading && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-md text-center">
            <p className="text-sm text-blue-700">Uploading files... (Placeholder)</p>
            {/* Basic non-functional progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: "50%" }}></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
