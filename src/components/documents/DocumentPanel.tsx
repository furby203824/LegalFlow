"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Download, RefreshCw } from "lucide-react";

export default function DocumentPanel({
  caseId,
  component,
  commanderGradeCategory,
}: {
  caseId: string;
  component: string;
  commanderGradeCategory: string;
}) {
  const [document, setDocument] = useState("");
  const [docType, setDocType] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateDocument(type: string) {
    setLoading(true);
    setDocType(type);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
      }
    } catch {
      setDocument("Error generating document");
    } finally {
      setLoading(false);
    }
  }

  const docs = [
    { key: "navmc_10132", label: "NAVMC 10132", desc: "Unit Punishment Book" },
    { key: "charge_sheet", label: "Charge Sheet", desc: "Pre-hearing review" },
    { key: "office_hours_script", label: "Office Hours Script", desc: "Commander guidance" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {docs.map((d) => (
          <button
            key={d.key}
            onClick={() => generateDocument(d.key)}
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

      {document && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
            <span className="text-sm font-medium">Document Preview</span>
            <div className="flex gap-2">
              <button
                onClick={() => generateDocument(docType)}
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
                  a.download = `${docType}.txt`;
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
