"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import PhaseTracker from "@/components/cases/PhaseTracker";
import PhaseActions from "@/components/cases/PhaseActions";
import CaseInfo from "@/components/cases/CaseInfo";
import DocumentPanel from "@/components/documents/DocumentPanel";
import RemarksPanel from "@/components/cases/RemarksPanel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseDetail = any;

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"actions" | "documents" | "remarks" | "info">(
    "actions"
  );
  const router = useRouter();

  function loadCase() {
    fetch(`/api/cases/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load case");
        return res.json();
      })
      .then((data) => setCaseData(data.case))
      .catch((err) => {
        console.error(err);
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCase();
  }, [id]);

  if (loading || !caseData) {
    return (
      <AppShell>
        <div className="text-center py-8">Loading case...</div>
      </AppShell>
    );
  }

  const accused = caseData.accused;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Case Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-navy)]">
              {caseData.caseNumber}
            </h1>
            <p className="text-[var(--color-text-muted)]">
              {accused.rank} {accused.lastName},{" "}
              {accused.firstName} {accused.middleName || ""} (
              {accused.grade}) &middot; EDIPI: {accused.edipi}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              caseData.status.startsWith("CLOSED")
                ? "bg-gray-100 text-gray-800"
                : caseData.status === "DESTROYED"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {caseData.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Warnings */}
        {caseData.statuteWarningAcknowledged && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800">
            Offense may be outside NJP statute of limitations per MCO 5800.16
            para 010702.
          </div>
        )}
        {caseData.doublePunishmentChecked && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800">
            Prior NJP action detected for this offense. Double punishment is
            prohibited under Article 15, UCMJ.
          </div>
        )}

        {/* Phase Tracker */}
        <PhaseTracker
          currentPhase={caseData.currentPhase}
          status={caseData.status}
        />

        {/* Tabs */}
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex gap-6">
            {(
              [
                { key: "actions", label: "Phase Actions" },
                { key: "documents", label: "Documents" },
                { key: "remarks", label: "Item 21 Remarks" },
                { key: "info", label: "Case Info" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "actions" && (
            <PhaseActions caseData={caseData} onUpdate={loadCase} />
          )}
          {activeTab === "documents" && (
            <DocumentPanel caseId={caseData.id} component={caseData.component} commanderGradeCategory={caseData.commanderGradeLevel} />
          )}
          {activeTab === "remarks" && (
            <RemarksPanel
              caseId={caseData.id}
              remarks={(caseData.item21Entries || []).map((e: { id: string; entryDate: string; entryType: string; entryText: string; confirmedAt: string | null }) => ({
                id: e.id,
                date: e.entryDate,
                itemReference: e.entryType,
                text: e.entryText,
                confirmed: !!e.confirmedAt,
              }))}
              onUpdate={loadCase}
            />
          )}
          {activeTab === "info" && <CaseInfo caseData={caseData} />}
        </div>
      </div>
    </AppShell>
  );
}
