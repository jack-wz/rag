"use client"; // Required for useState and other hooks

import React, { useState } from 'react';
import Image from "next/image";
import DocumentUpload from "@/components/custom/DocumentUpload";
import ProcessingConfiguration, { ProcessingConfig, PartitioningStrategy, ChunkingStrategy } from "@/components/custom/ProcessingConfiguration";
import ResultDisplay from "@/components/custom/ResultDisplay";
import ProcessingTemplates from "@/components/custom/ProcessingTemplates"; // Import ProcessingTemplates
import { Button } from "@/components/ui/button";

export default function Home() {
  const [selectedDocs, setSelectedDocs] = useState<File[]>([]);
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    // Partitioning
    strategy: "auto" as PartitioningStrategy, // Cast for initial state
    removeExtraWhitespace: true,
    ocrLanguages: "eng",
    pdfInferTableStructure: true,
    extractImageBlockTypes: "", 
    
    // Chunking
    chunkingStrategy: "none" as ChunkingStrategy, // Cast for initial state
    chunkMaxCharacters: 500,
    chunkNewAfterNChars: 500,
    chunkCombineTextUnderNChars: 200, 
    chunkOverlap: 0,
    chunkMultipageSections: true, 
  });
  const [processedData, setProcessedData] = useState<any | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesSelected = (files: File[]) => {
    setSelectedDocs(files);
    setProcessedData(null); 
    setProcessingError(null);
  };

  const handleConfigurationChange = (newConfig: ProcessingConfig) => {
    setProcessingConfig(newConfig);
  };

  const handleLoadTemplateConfig = (loadedConfig: ProcessingConfig) => {
    setProcessingConfig(loadedConfig);
    // Optional: Add toast notification here if desired, e.g., using useToast()
    // toast({ title: "Template Loaded", description: "Configuration has been updated." });
  };

  const handleProcessDocuments = async () => {
    if (selectedDocs.length === 0) {
      setProcessingError("No documents selected for processing.");
      return;
    }
    setIsProcessing(true);
    setProcessedData(null);
    setProcessingError(null);

    const formData = new FormData();
    formData.append('file', selectedDocs[0]); 
    
    Object.entries(processingConfig).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'boolean') {
          formData.append(key, String(value));
        } else if (typeof value === 'number') {
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
        throw new Error(errorData.detail || `API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setProcessedData(result);
    } catch (error) {
      console.error("Processing error:", error);
      setProcessingError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsProcessing(false);
    }
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
          
          <DocumentUpload onFilesSelected={handleFilesSelected} />

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
                className="mt-8" // Added more margin top for spacing
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
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Deploy now
            </a>
            <a
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our docs
            </a>
          </div> */}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center mt-8"> {/* Added margin-top for spacing */}
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
    </div>
  );
}
