"use client"; // Required for useState and other hooks

import React, { useState } from 'react';
import Image from "next/image";
import DocumentUpload from "@/components/custom/DocumentUpload";
import ProcessingConfiguration from "@/components/custom/ProcessingConfiguration";
import ResultDisplay from "@/components/custom/ResultDisplay"; // Import ResultDisplay
import { Button } from "@/components/ui/button"; // For the process button

// Define types for configuration state
type PartitioningStrategy = "auto" | "hi_res" | "ocr_only" | "fast";
interface ProcessingConfig {
  strategy: PartitioningStrategy;
  removeExtraWhitespace: boolean;
}

export default function Home() {
  const [selectedDocs, setSelectedDocs] = useState<File[]>([]);
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    strategy: "auto",
    removeExtraWhitespace: true,
  });
  const [processedData, setProcessedData] = useState<any | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFilesSelected = (files: File[]) => {
    setSelectedDocs(files);
    setProcessedData(null); // Clear previous results when new files are selected
    setProcessingError(null);
  };

  const handleConfigurationChange = (newConfig: ProcessingConfig) => {
    setProcessingConfig(newConfig);
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
    formData.append('file', selectedDocs[0]); // Assuming one file for now
    formData.append('strategy', processingConfig.strategy);
    formData.append('remove_extra_whitespace', String(processingConfig.removeExtraWhitespace));

    try {
      // Assuming backend is running on port 8000 relative to the frontend's host
      // In a real deployment, this URL should be configurable.
      const response = await fetch('/api/v1/process-document/', { // Using relative path for proxy
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
                initialStrategy={processingConfig.strategy}
                initialRemoveExtraWhitespace={processingConfig.removeExtraWhitespace}
              />
              <Button 
                onClick={handleProcessDocuments}
                disabled={isProcessing || selectedDocs.length === 0}
                className="mt-6"
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
