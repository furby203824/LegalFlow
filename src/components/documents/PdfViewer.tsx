"use client";

import { useState, useEffect, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfViewerProps {
  pdfBytes: Uint8Array;
  className?: string;
}

/**
 * PDF viewer with page-by-page navigation.
 * Extracts individual pages from the full PDF using pdf-lib
 * and displays them one at a time in an iframe, with prev/next controls.
 */
export default function PdfViewer({ pdfBytes, className }: PdfViewerProps) {
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Split the PDF into individual page blobs
  useEffect(() => {
    let cancelled = false;

    async function splitPages() {
      setLoading(true);
      try {
        const srcDoc = await PDFDocument.load(pdfBytes);

        const count = srcDoc.getPageCount();
        const urls: string[] = [];

        for (let i = 0; i < count; i++) {
          const singlePageDoc = await PDFDocument.create();
          const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [i]);
          singlePageDoc.addPage(copiedPage);
          const singleBytes = await singlePageDoc.save();
          const blob = new Blob([singleBytes as BlobPart], { type: "application/pdf" });
          urls.push(URL.createObjectURL(blob));
        }

        if (!cancelled) {
          setPageUrls(urls);
          setTotalPages(count);
          setCurrentPage(0);
        }
      } catch (err) {
        console.error("Failed to split PDF pages:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    splitPages();

    return () => {
      cancelled = true;
      // Clean up old blob URLs
      pageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBytes]);

  const goToPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(0, p - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-neutral-100 text-sm text-neutral-mid", className)}>
        Loading PDF...
      </div>
    );
  }

  if (totalPages === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-neutral-100 text-sm text-neutral-mid", className)}>
        No pages to display
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Page navigation bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b border-border">
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors",
            currentPage === 0
              ? "text-neutral-mid/40 cursor-not-allowed"
              : "text-primary hover:bg-primary/10"
          )}
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <span className="text-xs font-medium text-neutral-dark">
          Page {currentPage + 1} of {totalPages}
        </span>
        <button
          onClick={goToNext}
          disabled={currentPage === totalPages - 1}
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors",
            currentPage === totalPages - 1
              ? "text-neutral-mid/40 cursor-not-allowed"
              : "text-primary hover:bg-primary/10"
          )}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      {/* PDF page display */}
      <iframe
        src={pageUrls[currentPage]}
        className={cn("w-full bg-white", className)}
        title={`PDF Page ${currentPage + 1}`}
      />
    </div>
  );
}
