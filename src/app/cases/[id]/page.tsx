"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import PhaseTracker from "@/components/cases/PhaseTracker";
import UPBItemsPanel from "@/components/cases/UPBItemsPanel";
import ActionsPanel from "@/components/cases/ActionsPanel";
import RemarksPanel from "@/components/cases/RemarksPanel";
import DocumentPanel from "@/components/documents/DocumentPanel";
import AuditLogPanel from "@/components/cases/AuditLogPanel";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"remarks" | "documents" | "audit">("remarks");
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
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const accused = caseData.accused;
  const isClosed = caseData.status.startsWith("CLOSED") || caseData.status === "DESTROYED";

  const STATUS_COLORS: Record<string, string> = {
    INITIATED: "bg-gray-100 text-gray-700",
    REFERRED_COURT_MARTIAL: "bg-purple-100 text-purple-700",
    RIGHTS_ADVISED: "bg-blue-100 text-blue-700",
    PUNISHMENT_IMPOSED: "bg-orange-100 text-orange-700",
    NOTIFICATION_COMPLETE: "bg-blue-100 text-blue-700",
    APPEAL_PENDING: "bg-yellow-100 text-yellow-700",
    APPEAL_COMPLETE: "bg-green-100 text-green-700",
    CLOSED: "bg-gray-200 text-gray-600",
    CLOSED_SUSPENSION_ACTIVE: "bg-orange-100 text-orange-700",
    DESTROYED: "bg-red-100 text-red-600",
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Case Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-dark">
              Case <span className="font-mono">{caseData.caseNumber}</span>
            </h1>
            <p className="text-sm text-neutral-mid mt-0.5">
              {accused.rank} {accused.lastName}, {accused.firstName} {accused.middleName || ""} ({accused.grade}) &middot; EDIPI: <span className="font-mono">{accused.edipi}</span>
            </p>
            <p className="text-xs text-neutral-mid mt-0.5">
              {accused.unitFullString}
            </p>
          </div>
          <span className={cn("badge text-xs px-3 py-1", STATUS_COLORS[caseData.status] || "bg-gray-100")}>
            {caseData.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Flag Badges */}
        <div className="flex flex-wrap gap-2">
          {caseData.jaReviewRequired && !caseData.jaReviewComplete && (
            <span className="badge bg-warning/10 text-warning gap-1">
              <AlertTriangle size={12} /> JA REVIEW REQUIRED
            </span>
          )}
          {caseData.punishmentRecord?.suspensionStatus === "ACTIVE" && (
            <span className="badge bg-orange-100 text-orange-700 gap-1">
              <Info size={12} /> SUSPENSION ACTIVE
            </span>
          )}
          {caseData.statuteWarningAcknowledged && (
            <span className="badge bg-warning/10 text-warning gap-1">
              <AlertTriangle size={12} /> STATUTE WARNING
            </span>
          )}
          {caseData.doublePunishmentChecked && (
            <span className="badge bg-error/10 text-error gap-1">
              <AlertOctagon size={12} /> DOUBLE PUNISHMENT FLAG
            </span>
          )}
        </div>

        {/* Phase Progress */}
        <PhaseTracker currentPhase={caseData.currentPhase} status={caseData.status} />

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: UPB Form Items */}
          <div className="lg:col-span-2">
            <UPBItemsPanel caseData={caseData} onUpdate={loadCase} />
          </div>

          {/* Right: Actions Panel */}
          <div>
            <ActionsPanel caseData={caseData} onUpdate={loadCase} />
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="card overflow-hidden">
          <div className="border-b border-border">
            <nav className="flex">
              {([
                { key: "remarks" as const, label: "Item 21 Remarks" },
                { key: "documents" as const, label: "Documents" },
                { key: "audit" as const, label: "Audit Log" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-neutral-mid hover:text-neutral-dark"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-5">
            {activeTab === "remarks" && (
              <RemarksPanel
                caseId={caseData.id}
                remarks={(caseData.item21Entries || []).map((e: { id: string; entryDate: string; entryType: string; entryText: string; confirmedAt: string | null; systemGenerated: boolean }) => ({
                  id: e.id,
                  date: e.entryDate,
                  itemReference: e.entryType,
                  text: e.entryText,
                  confirmed: !!e.confirmedAt,
                  systemGenerated: e.systemGenerated,
                }))}
                onUpdate={loadCase}
                locked={caseData.formLocked}
              />
            )}
            {activeTab === "documents" && (
              <DocumentPanel
                caseId={caseData.id}
                component={caseData.component}
                commanderGradeCategory={caseData.commanderGradeLevel}
              />
            )}
            {activeTab === "audit" && (
              <AuditLogPanel auditLogs={caseData.auditLogs || []} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
