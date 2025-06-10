"use client";

import React, { useState } from 'react';
import Image from "next/image";
import DocumentUpload from "@/components/custom/DocumentUpload";
import ProcessingConfiguration, { ProcessingConfig, PartitioningStrategy, ChunkingStrategy } from "@/components/custom/ProcessingConfiguration";
import ResultDisplay from "@/components/custom/ResultDisplay";
import ProcessingTemplates from "@/components/custom/ProcessingTemplates"; 
import DocumentPreviewModal from "@/components/custom/DocumentPreviewModal";
import ProcessingFlowCanvas from "@/components/custom/flow/ProcessingFlowCanvas";
import OllamaConfigSettings from "@/components/custom/OllamaConfigSettings"; // Import Ollama settings
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [selectedDocs, setSelectedDocs] = useState<File[]>([]);
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    // Partitioning
    strategy: "auto" as PartitioningStrategy, 
    removeExtraWhitespace: true,
    ocrLanguages: "eng",
    pdfInferTableStructure: true,
    extractImageBlockTypes: "", 
    
    // Chunking
    chunkingStrategy: "none" as ChunkingStrategy, 
    chunkMaxCharacters: 500,
    chunkNewAfterNChars: 500,
    chunkCombineTextUnderNChars: 200, 
    chunkOverlap: 0,
    chunkMultipageSections: true, 
  });
  const [processedData, setProcessedData] = useState<any | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // For form-based submission
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [fileToPreview, setFileToPreview] = useState<File | null>(null);

  // Note: isProcessing above is for the original form submission.
  // ProcessingFlowCanvas will manage its own isExecutingFlow state internally for its button.
  // We need to handle the results from ProcessingFlowCanvas here.

  const handleFilesSelected = (files: File[]) => {
    setSelectedDocs(files);
    setProcessedData(null); 
    setProcessingError(null);
  };

  // Handlers for ProcessingFlowCanvas
  const handleFlowExecutionResult = (result: any) => {
    setProcessedData(result);
    setProcessingError(null);
  };

  const handleFlowExecutionError = (error: string) => {
    setProcessingError(error);
    setProcessedData(null);
  };

  const handleConfigurationChange = (newConfig: ProcessingConfig) => {
    setProcessingConfig(newConfig);
  };

  const handleLoadTemplateConfig = (loadedConfig: ProcessingConfig) => {
    setProcessingConfig(loadedConfig);
  };

  const openPreviewModal = (file: File) => {
    setFileToPreview(file);
    setIsPreviewModalOpen(true);
  };

  const closePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setFileToPreview(null);
  };
  
  // Callback for when flow execution is successful
  const handleFlowResult = (result: any) => {
    if (result && result.processed_elements) {
      setProcessedData({ elements: result.processed_elements }); // Ensure structure matches ResultDisplay
    } else if (result && result.message) { // If no elements, but a message (e.g. input->output)
       setProcessedData({ elements: [{ type: "Info", text: result.message, metadata: { filename: result.received_filename || "" }}] });
    } else {
      setProcessedData(null); // Or some other indication of no elements
    }
    setProcessingError(null);
  };

  // Callback for when flow execution fails
  const handleFlowError = (error: string) => {
    setProcessingError(error);
    setProcessedData(null);
  };

  const handleProcessDocuments = async () => {
    if (selectedDocs.length === 0) {
      setProcessingError("No documents selected for processing.");
      return;
    }
    setIsProcessing(true);
    setProcessedData({ elements: [] }); 
    setProcessingError(null);

    let allProcessedElements: any[] = [];
    let errors: string[] = [];

    for (const doc of selectedDocs) {
      const formData = new FormData();
      formData.append('file', doc);
      
      Object.entries(processingConfig).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'boolean' || typeof value === 'number') {
            formData.append(key, String(value));
          } else {
            formData.append(key, value as string);
          }
        }
      });

      try {
        const response = await fetch('/api/v1/process-document/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          errors.push(`Error processing ${doc.name}: ${errorData.detail || response.statusText}`);
          continue; 
        }

        const result = await response.json();
        if (result.elements && Array.isArray(result.elements)) {
          const elementsWithFilename = result.elements.map((el: any) => ({
            ...el,
            metadata: {
              ...el.metadata,
              original_filename: doc.name 
            }
          }));
          allProcessedElements = [...allProcessedElements, ...elementsWithFilename];
        }
      } catch (error) {
        console.error(`Processing error for ${doc.name}:`, error);
        errors.push(`Error processing ${doc.name}: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
      }
    }

    if (allProcessedElements.length > 0) {
      setProcessedData({ elements: allProcessedElements });
    } else {
      setProcessedData(null); 
    }

    if (errors.length > 0) {
      setProcessingError(errors.join('\n'));
    }

    setIsProcessing(false);
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full">
        <div className="flex flex-col items-center gap-8 w-full">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
          />
          
          <DocumentUpload 
            onFilesSelected={handleFilesSelected} 
            onPreviewFile={openPreviewModal} // Pass the open function
          />

          {selectedDocs.length > 0 && (
            <>
              <ProcessingConfiguration 
                onConfigurationChange={handleConfigurationChange}
                initialConfig={processingConfig}
              />
              <ProcessingTemplates 
                currentConfig={processingConfig}
                onLoadTemplate={handleLoadTemplateConfig}
              />
              <Button 
                onClick={handleProcessDocuments}
                disabled={isProcessing || selectedDocs.length === 0}
                className="mt-8" 
              >
                {isProcessing ? 'Processing...' : 'Process Documents'}
              </Button>
            </>
          )}
          
          {(processedData || processingError) && (
            <ResultDisplay data={processedData} error={processingError} />
          )}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center mt-8">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
      <DocumentPreviewModal 
        isOpen={isPreviewModalOpen}
        onClose={closePreviewModal}
        file={fileToPreview}
      />
      
      {/* New Section for Node-Based UI */}
      <div className="w-full max-w-6xl px-4 md:px-6 lg:px-8 mt-12 mb-8">
        <Separator className="my-8" />
        <h2 className="text-2xl font-semibold text-center mb-6">
          Experimental: Node-Based Processing Pipeline
        </h2>
        <ProcessingFlowCanvas 
          selectedFile={selectedDocs[0] || null}
          onFlowExecutionResult={handleFlowExecutionResult}
          onFlowExecutionError={handleFlowExecutionError}
        />
      </div>

      {/* New Section for Ollama Configuration */}
      <div className="w-full max-w-2xl px-4 md:px-6 lg:px-8 mt-12 mb-8">
        <Separator className="my-8" />
        <h2 className="text-2xl font-semibold text-center mb-6">
          Ollama Configuration
        </h2>
        <OllamaConfigSettings />
      </div>
    </div>
  );
}
