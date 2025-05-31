"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // Recommended for react-pdf
import 'react-pdf/dist/esm/Page/TextLayer.css'; // Recommended for react-pdf
// @ts-ignore (mammoth doesn't have readily available types for all import styles)
import mammoth from 'mammoth'; 

// Configure pdfjs worker
// Try to use the version from pdfjs-dist
try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs', // Using .mjs for ES module compatibility
    import.meta.url,
  ).toString();
} catch (error) {
  console.error("Failed to set pdfjs.GlobalWorkerOptions.workerSrc from pdfjs-dist:", error);
  // Fallback if the above fails (e.g. in certain bundler setups or older pdfjs-dist versions)
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}


interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, onClose, file }) => {
  const [previewContent, setPreviewContent] = useState<string | React.ReactNode>('');
  const [previewType, setPreviewType] = useState<'text' | 'pdf' | 'html' | 'unsupported' | 'loading'>('loading');
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setPreviewType('loading');
      setPdfError(null);
      setCurrentPage(1); // Reset page for new file
      setNumPages(0);

      const reader = new FileReader();

      if (file.type === 'text/plain') {
        reader.onload = (e) => {
          setPreviewContent(e.target?.result as string);
          setPreviewType('text');
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        setPreviewType('pdf');
        // PDF content is handled directly by react-pdf's Document component using the file object
        // No need to use FileReader for the PDF document itself, but you might if you were passing a URL or base64
        setPreviewContent(null); // Clear previous content
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setPreviewContent(result.value);
            setPreviewType('html');
          } catch (error) {
            console.error('Error converting DOCX to HTML:', error);
            setPreviewContent('Error converting DOCX file to HTML.');
            setPreviewType('unsupported');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setPreviewContent(`Preview not available for file type: ${file.type || 'unknown'}`);
        setPreviewType('unsupported');
      }
    }
  }, [isOpen, file]);

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }): void {
    setNumPages(nextNumPages);
    setPdfError(null);
  }

  function onDocumentLoadError(error: Error): void {
    console.error("Error loading PDF:", error);
    setPdfError(`Failed to load PDF: ${error.message}. Ensure the PDF worker is correctly configured.`);
    setPreviewType('unsupported');
  }

  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));

  const renderContent = () => {
    switch (previewType) {
      case 'loading':
        return <p>Loading preview...</p>;
      case 'text':
        return <pre className="whitespace-pre-wrap p-4 bg-muted rounded-md text-sm">{previewContent}</pre>;
      case 'pdf':
        return (
          <div className="flex flex-col items-center">
            {pdfError && <p className="text-red-500">{pdfError}</p>}
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={{ workerSrc: pdfjs.GlobalWorkerOptions.workerSrc }}
              className="max-h-[60vh] overflow-auto"
            >
              <Page pageNumber={currentPage} width={550} /> {/* Adjust width as needed */}
            </Document>
            {numPages > 0 && (
              <div className="flex items-center justify-center space-x-4 mt-4">
                <Button onClick={goToPrevPage} disabled={currentPage <= 1} variant="outline">Previous</Button>
                <span>Page {currentPage} of {numPages}</span>
                <Button onClick={goToNextPage} disabled={currentPage >= numPages} variant="outline">Next</Button>
              </div>
            )}
          </div>
        );
      case 'html':
        return (
          <div 
            className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-md" 
            dangerouslySetInnerHTML={{ __html: previewContent as string }} 
          />
        );
      case 'unsupported':
        return <p className="p-4 text-destructive-foreground">{previewContent}</p>;
      default:
        return <p>No file selected or unknown preview type.</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{file ? `Preview: ${file.name}` : 'Document Preview'}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-1 pr-3  scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-muted/50">
          {renderContent()}
        </div>
        <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
