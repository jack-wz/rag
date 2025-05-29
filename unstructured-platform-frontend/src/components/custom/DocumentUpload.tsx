"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentUploadProps {
  onFilesSelected: (files: File[]) => void;
}

const acceptedFileTypes: Accept = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/html': ['.html', '.htm'],
};

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onFilesSelected }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false); // Placeholder for upload state

  useEffect(() => {
    onFilesSelected(selectedFiles);
  }, [selectedFiles, onFilesSelected]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setSelectedFiles(prevFiles => {
      const newFiles = [...prevFiles, ...acceptedFiles];
      // onFilesSelected(newFiles); // Call onFilesSelected here as well if immediate update is needed
      return newFiles;
    });
    setRejectedFiles(fileRejections);

    // Simulate upload start
    if (acceptedFiles.length > 0) {
      setIsUploading(true);
      // Simulate upload completion after a delay
      setTimeout(() => {
        setIsUploading(false);
        // Here you would typically call an actual upload function
        console.log('Simulated upload finished for:', acceptedFiles.map(f => f.name));
      }, 3000);
    }
  }, []); // Removed onFilesSelected from dependencies as it's stable if wrapped in useCallback on parent

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 10 * 1024 * 1024, // 10MB limit example
  });

  const removeFile = (fileName: string) => {
    setSelectedFiles(prevFiles => {
      const newFiles = prevFiles.filter(file => file.name !== fileName);
      // onFilesSelected(newFiles); // Call onFilesSelected here
      return newFiles;
    });
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>Drag & drop files here, or click to select files.</CardDescription>
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
            <p className="text-center text-muted-foreground">Drag 'n' drop some files here, or click to select files</p>
          )}
        </div>

        {rejectedFiles.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              Some files were rejected:
              <ul className="list-disc list-inside text-xs">
                {rejectedFiles.map(({ file, errors }) => (
                  <li key={file.name}>
                    {file.name} - {errors.map(e => e.message).join(', ')}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold">Selected Files:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              {selectedFiles.map(file => (
                <li key={file.name} className="flex justify-between items-center">
                  <span>
                    {file.name} ({Math.round(file.size / 1024)} KB) - {file.type}
                  </span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="text-xs text-red-500 hover:text-red-700"
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
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
