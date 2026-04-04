"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PdfViewerProps {
  pdfBytes: Uint8Array;
  className?: string;
}

/**
 * PDF viewer that preserves fillable AcroForm fields.
 * Displays the full PDF in an iframe, relying on the browser's
 * built-in PDF viewer for pagination and form interaction.
 */
export default function PdfViewer({ pdfBytes, className }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfBytes]);

  if (!pdfUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-neutral-100 text-sm text-neutral-mid", className)}>
        Loading PDF...
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      className={cn("w-full bg-white", className)}
      title="PDF Document"
    />
  );
}
