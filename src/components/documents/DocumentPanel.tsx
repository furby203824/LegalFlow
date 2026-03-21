"use client";

import { useState } from "react";

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
      const res = await fetch(
        `/api/cases/${caseId}/documents?type=${type}`
      );
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

  const docTypes = [
    {
      key: "charge_sheet",
      label: "Charge Sheet",
      desc: "Pre-hearing review document",
    },
    {
      key: "navmc_10132",
      label: "NAVMC 10132 (UPB)",
      desc: "Unit Punishment Book",
    },
    {
      key: "office_hours_script",
      label: "Office Hours Script",
      desc: "Commander guidance for NJP proceedings",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Document Buttons */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Generate Documents
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {docTypes.map((dt) => (
            <button
              key={dt.key}
              onClick={() => generateDocument(dt.key)}
              disabled={loading}
              className={`p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors ${
                docType === dt.key
                  ? "border-[var(--color-navy)] bg-blue-50"
                  : "border-[var(--color-border)]"
              }`}
            >
              <div className="font-medium text-sm">{dt.label}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">
                {dt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document Preview */}
      {document && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[var(--color-navy)]">
              Document Preview
            </h3>
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
              className="btn-secondary"
            >
              Download
            </button>
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap">
            {document}
          </pre>
        </div>
      )}
    </div>
  );
}
