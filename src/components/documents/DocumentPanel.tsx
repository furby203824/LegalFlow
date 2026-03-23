"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Download, RefreshCw } from "lucide-react";
import PdfViewer from "@/components/documents/PdfViewer";
import { generateDocumentContent, generatePdfDocument } from "@/services/documents";
import type { PdfDocType } from "@/services/documents";

type Navmc10132Version = "PARTIAL" | "HEARING" | "FINAL";

interface DocDef {
  key: string;
  label: string;
  desc: string;
  hasVersions?: boolean;
  requiresVacation?: boolean;
  requiresRemedial?: boolean;
  finalOnly?: boolean;
  isPdf?: boolean;
  pdfType?: PdfDocType;
}

const DOCS: DocDef[] = [
  { key: "navmc_10132", label: "NAVMC 10132", desc: "Unit Punishment Book (PDF form-fill)", hasVersions: true, isPdf: true, pdfType: "navmc_10132_pdf" },
  { key: "navmc_10132_text", label: "NAVMC 10132 (Text)", desc: "Unit Punishment Book (text export)", hasVersions: true },
  { key: "charge_sheet", label: "DD 458", desc: "Charge Sheet" },
  { key: "notification_election_rights", label: "A-1-c/d Rights", desc: "Notification & Election of Rights (PDF)", isPdf: true, pdfType: "notification_election_rights" },
  { key: "appeal_rights_ack", label: "A-1-g Appeal", desc: "Acknowledgement of Appeal Rights (PDF)", isPdf: true, pdfType: "appeal_rights_ack" },
  { key: "office_hours_script", label: "Office Hours Script", desc: "Commander hearing guidance" },
  { key: "figure_14_1", label: "Figure 14-1", desc: "Vacation notice", requiresVacation: true },
  { key: "mmrp_notification", label: "MMRP Notification", desc: "Set-aside email", requiresRemedial: true },
];

const VERSION_OPTIONS: { key: Navmc10132Version; label: string }[] = [
  { key: "PARTIAL", label: "Partial (Pre-hearing)" },
  { key: "HEARING", label: "Hearing (Post-hearing)" },
  { key: "FINAL", label: "Final (Case closed)" },
];

export default function DocumentPanel({
  caseId,
  component,
  commanderGradeCategory,
  currentPhase,
  hasVacationRecords,
  hasMmrpPending,
}: {
  caseId: string;
  component: string;
  commanderGradeCategory: string;
  currentPhase?: string;
  hasVacationRecords?: boolean;
  hasMmrpPending?: boolean;
}) {
  const [document, setDocument] = useState("");
  const [docType, setDocType] = useState("");
  const [docVersion, setDocVersion] = useState<Navmc10132Version | null>(null);
  const [loading, setLoading] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");

  async function generateDocument(type: string, version?: Navmc10132Version) {
    setLoading(true);
    setDocType(type);
    setDocVersion(version || null);
    setShowVersionSelector(false);
    setPdfUrl(null);
    setPdfBytes(null);
    try {
      const data = await generateDocumentContent(caseId, type, version);
      setDocument(data.document);
      if (data.caseNumber) setCaseNumber(data.caseNumber);
    } catch (err) {
      setDocument(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function generatePdf(pdfType: PdfDocType) {
    setLoading(true);
    setDocType(pdfType);
    setDocVersion(null);
    setShowVersionSelector(false);
    setDocument("");
    try {
      const result = await generatePdfDocument(caseId, pdfType);
      setPdfBytes(result.pdfBytes);
      const blob = new Blob([result.pdfBytes as BlobPart], { type: "application/pdf" });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(result.filename);
      if (result.caseNumber) setCaseNumber(result.caseNumber);
    } catch (err) {
      setDocument(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setPdfBytes(null);
      setPdfUrl(null);
    } finally {
      setLoading(false);
    }
  }

  function handleDocClick(doc: DocDef) {
    if (doc.isPdf && doc.pdfType && !doc.hasVersions) {
      generatePdf(doc.pdfType);
      return;
    }
    if (doc.isPdf && doc.pdfType && doc.hasVersions) {
      // NAVMC 10132 PDF — auto-detects version from case state
      generatePdf(doc.pdfType);
      return;
    }
    if (doc.hasVersions) {
      setShowVersionSelector(showVersionSelector && docType === doc.key ? false : true);
      setDocType(doc.key);
      return;
    }
    generateDocument(doc.key);
  }

  // Filter visible docs based on case state
  const visibleDocs = DOCS.filter((d) => {
    if (d.requiresVacation && !hasVacationRecords) return false;
    if (d.requiresRemedial && !hasMmrpPending) return false;
    return true;
  });

  const downloadFilename = caseNumber
    ? `${caseNumber}_${docType}${docVersion ? `_${docVersion}` : ""}.txt`
    : `${docType}.txt`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {visibleDocs.map((d) => (
          <button
            key={d.key}
            onClick={() => handleDocClick(d)}
            disabled={loading}
            className={cn(
              "card p-4 text-left hover:shadow-md transition-shadow",
              docType === d.key && "ring-2 ring-primary"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-primary" />
              <span className="text-sm font-medium">{d.label}</span>
            </div>
            <p className="text-xs text-neutral-mid">{d.desc}</p>
          </button>
        ))}
      </div>

      {/* NAVMC 10132 text version selector */}
      {showVersionSelector && docType === "navmc_10132_text" && (
        <div className="card p-3">
          <p className="text-xs font-medium mb-2">Select NAVMC 10132 text version:</p>
          <div className="flex gap-2">
            {VERSION_OPTIONS.map((v) => {
              const disabled =
                v.key === "FINAL" &&
                currentPhase !== "ADMIN_COMPLETION" &&
                currentPhase !== "CLOSED";
              return (
                <button
                  key={v.key}
                  onClick={() => generateDocument("navmc_10132", v.key)}
                  disabled={loading || disabled}
                  className={cn(
                    "btn-ghost text-xs px-3 py-1.5 rounded border",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  title={disabled ? "Only available in ADMIN_COMPLETION or CLOSED phase" : ""}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PDF preview */}
      {pdfUrl && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
            <span className="text-sm font-medium">{pdfFilename}</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const docDef = DOCS.find((d) => d.key === docType || d.pdfType === docType);
                  if (docDef?.pdfType) generatePdf(docDef.pdfType);
                }}
                className="btn-ghost text-xs gap-1"
              >
                <RefreshCw size={12} /> Regenerate
              </button>
              <button
                onClick={() => {
                  const a = window.document.createElement("a");
                  a.href = pdfUrl;
                  a.download = pdfFilename;
                  a.click();
                }}
                className="btn-primary text-xs gap-1"
              >
                <Download size={12} /> Download PDF
              </button>
            </div>
          </div>
          {pdfBytes && <PdfViewer pdfBytes={pdfBytes} className="h-[600px]" />}
        </div>
      )}

      {/* Text document preview */}
      {document && !pdfUrl && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
            <span className="text-sm font-medium">
              Document Preview
              {docVersion && <span className="text-xs text-neutral-mid ml-2">({docVersion})</span>}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => generateDocument(docType, docVersion || undefined)}
                className="btn-ghost text-xs gap-1"
              >
                <RefreshCw size={12} /> Regenerate
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([document], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement("a");
                  a.href = url;
                  a.download = downloadFilename;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn-primary text-xs gap-1"
              >
                <Download size={12} /> Download
              </button>
            </div>
          </div>
          <pre className="p-4 text-xs font-mono overflow-auto max-h-[500px] whitespace-pre-wrap bg-bg">
            {document}
          </pre>
        </div>
      )}
    </div>
  );
}
