"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import PhaseTracker from "@/components/cases/PhaseTracker";
import UPBItemsPanel from "@/components/cases/UPBItemsPanel";
import ActionsPanel from "@/components/cases/ActionsPanel";
import RemarksPanel from "@/components/cases/RemarksPanel";
import EvidencePanel from "@/components/cases/EvidencePanel";
import AuditLogPanel from "@/components/cases/AuditLogPanel";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { getCase } from "@/services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseDetail = any;

const STATUS_LABEL: Record<string, string> = {
  INITIATED: "Draft",
  REFERRED_COURT_MARTIAL: "Referred Court-Martial",
  RIGHTS_ADVISED: "Rights Advised",
  PUNISHMENT_IMPOSED: "Punishment Imposed",
  NOTIFICATION_COMPLETE: "Post-Notification",
  APPEAL_PENDING: "Appeal Pending",
  APPEAL_COMPLETE: "Appeal Complete",
  CLOSED: "Closed",
  CLOSED_SUSPENSION_ACTIVE: "Closed - Suspension Active",
  CLOSED_SUSPENSION_VACATED: "Closed - Suspension Vacated",
  CLOSED_SUSPENSION_REMITTED: "Closed - Suspension Remitted",
  DESTROYED: "Destroyed",
};

export default function CaseViewPage() {
  return (
    <Suspense fallback={<AppShell><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></AppShell>}>
      <CaseViewContent />
    </Suspense>
  );
}

function CaseViewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("personnel");
  const router = useRouter();

  function loadCase() {
    if (!id) { router.push("/cases"); return; }
    getCase(id)
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

  const TABS = [
    { key: "personnel", label: "Personnel Data" },
    { key: "evidence", label: "Evidence" },
    { key: "tracking", label: "Tracking History" },
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Required field note */}
        <p className="text-xs text-neutral-mid italic">A &quot;*&quot; denotes a required field before it can be routed.</p>

        {/* CLA-style Package Header Banner */}
        <div className="card bg-surface border border-border">
          <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 px-5 py-3 text-xs">
            <div>
              <span className="font-semibold text-neutral-dark">Package ID: </span>
              <span className="font-mono">{caseData.caseNumber}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Respondent: </span>
              <span>{accused.lastName}, {accused.firstName} {accused.middleName || ""}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Package Status: </span>
              <span>{STATUS_LABEL[caseData.status] || caseData.status.replace(/_/g, " ")}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">EDIPI: </span>
              <span className="font-mono">{accused.edipi}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Rank/Grade: </span>
              <span>{accused.rank} / {accused.grade}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Component: </span>
              <span>{caseData.component}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Unit: </span>
              <span>{accused.unitFullString}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Service: </span>
              <span>{caseData.serviceBranch || "USMC"}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-dark">Current Phase: </span>
              <span className="font-medium text-secondary">{caseData.currentPhase.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>

        {/* Alert badges */}
        {(caseData.jaReviewRequired || caseData.punishmentRecord?.suspensionStatus === "ACTIVE" || caseData.statuteWarningAcknowledged || caseData.doublePunishmentChecked) && (
          <div className="flex flex-wrap gap-2">
            {caseData.jaReviewRequired && !caseData.jaReviewComplete && (
              <span className="badge bg-warning/10 text-warning gap-1"><AlertTriangle size={12} /> JA REVIEW REQUIRED</span>
            )}
            {caseData.punishmentRecord?.suspensionStatus === "ACTIVE" && (
              <span className="badge bg-orange-100 text-orange-700 gap-1"><Info size={12} /> SUSPENSION ACTIVE</span>
            )}
            {caseData.statuteWarningAcknowledged && (
              <span className="badge bg-warning/10 text-warning gap-1"><AlertTriangle size={12} /> STATUTE WARNING</span>
            )}
            {caseData.doublePunishmentChecked && (
              <span className="badge bg-error/10 text-error gap-1"><AlertOctagon size={12} /> DOUBLE PUNISHMENT FLAG</span>
            )}
          </div>
        )}

        {/* Phase Tracker */}
        <PhaseTracker currentPhase={caseData.currentPhase} status={caseData.status} />

        {/* Phase Actions — always visible */}
        <ActionsPanel caseData={caseData} onUpdate={loadCase} />

        {/* Tab navigation — CLA style */}
        <div className="card overflow-hidden">
          <div className="border-b border-border bg-surface">
            <nav className="flex overflow-x-auto scrollbar-hide -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                    activeTab === tab.key
                      ? "border-accent text-accent bg-white"
                      : "border-transparent text-neutral-mid hover:text-neutral-dark"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-5">
            {/* Personnel Data Tab — CLA-style fieldsets */}
            {activeTab === "personnel" && (
              <PersonnelDataTab caseData={caseData} />
            )}

            {/* Evidence Tab — includes uploaded evidence, UPB form items, and remarks */}
            {activeTab === "evidence" && (
              <div className="space-y-6">
                <EvidencePanel
                  caseId={caseData.id}
                  evidence={caseData.evidence || []}
                  onUpdate={loadCase}
                  locked={caseData.formLocked}
                  currentPhase={caseData.currentPhase}
                />

                <div className="border-t border-border pt-4">
                  <UPBItemsPanel caseData={caseData} onUpdate={loadCase} />
                </div>

                <div className="border-t border-border pt-4">
                  <RemarksPanel
                    caseId={caseData.id}
                    remarks={(caseData.item21Entries || []).map((e: { id: string; entryDate: string; entryType: string; entryText: string; confirmedAt: string | null; systemGenerated: boolean }) => ({
                      id: e.id, date: e.entryDate, itemReference: e.entryType,
                      text: e.entryText, confirmed: !!e.confirmedAt, systemGenerated: e.systemGenerated,
                    }))}
                    onUpdate={loadCase}
                    locked={caseData.formLocked}
                  />
                </div>
              </div>
            )}

            {/* Tracking History Tab */}
            {activeTab === "tracking" && (
              <AuditLogPanel auditLogs={caseData.auditLogs || []} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Personnel Data Tab — CLA-style fieldsets ── */

function PersonnelDataTab({ caseData }: { caseData: CaseDetail }) {
  const accused = caseData.accused;

  return (
    <div className="space-y-5">
      {/* Assigned Command */}
      <fieldset className="border border-border rounded-md px-4 py-3">
        <legend className="text-sm font-semibold text-neutral-dark px-2">Assigned Command</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <FieldRow label="Unit" value={accused.unitFullString} />
          <FieldRow label="Component" value={caseData.component} />
          <FieldRow label="Service Branch" value={caseData.serviceBranch || "USMC"} />
        </div>
      </fieldset>

      {/* Respondent Information */}
      <fieldset className="border border-border rounded-md px-4 py-3">
        <legend className="text-sm font-semibold text-neutral-dark px-2">Respondent Information</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <FieldRow label="Name" value={`${accused.lastName}, ${accused.firstName} ${accused.middleName || ""}`} />
          <FieldRow label="Rank" value={accused.rank} />
          <FieldRow label="Grade" value={accused.grade} />
          <FieldRow label="EDIPI" value={accused.edipi} mono />
          <FieldRow label="Date of Birth" value={accused.dateOfBirth || "—"} />
          <FieldRow label="AFADBD" value={accused.afadbd || "—"} />
          <FieldRow label="YOS" value={accused.yearsOfService != null ? `${accused.yearsOfService} yr${accused.yearsOfService !== 1 ? "s" : ""}` : "—"} />
          <FieldRow label="Commander Grade" value={(caseData.commanderGradeLevel || "").replace(/_/g, " ")} />
        </div>
      </fieldset>

      {/* Duty Status */}
      <fieldset className="border border-border rounded-md px-4 py-3">
        <legend className="text-sm font-semibold text-neutral-dark px-2">Duty Status</legend>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <FieldRow label="UA Applicable" value={caseData.uaApplicable ? "Yes" : "No"} />
          <FieldRow label="Vessel Exception" value={caseData.vesselException ? "Yes" : "No"} />
        </div>
      </fieldset>

      {/* Jurisdiction & Validation */}
      <fieldset className="border border-border rounded-md px-4 py-3">
        <legend className="text-sm font-semibold text-neutral-dark px-2">Jurisdiction &amp; Validation</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <FieldRow label="Jurisdiction Confirmed" value={caseData.jurisdictionConfirmed ? "Yes" : "No"} />
          <FieldRow label="JA Review Required" value={caseData.jaReviewRequired ? "Yes" : "No"} />
          <FieldRow label="JA Review Complete" value={caseData.jaReviewComplete ? "Yes" : "No"} />
          <FieldRow label="Statute Warning" value={caseData.statuteWarningAcknowledged ? "Yes" : "No"} />
          <FieldRow label="Double Punishment Check" value={caseData.doublePunishmentChecked ? "Yes" : "No"} />
          <FieldRow label="Form Locked" value={caseData.formLocked ? "Yes" : "No"} />
        </div>
      </fieldset>

      {/* Offenses Summary */}
      <fieldset className="border border-border rounded-md px-4 py-3">
        <legend className="text-sm font-semibold text-neutral-dark px-2">UCMJ Offenses Alleged</legend>
        <div className="space-y-2">
          {(caseData.offenses || []).map((o: { offenseLetter: string; ucmjArticle: string; offenseType: string; offenseSummary: string; offenseDate: string; offensePlace: string; finding?: string }) => (
            <div key={o.offenseLetter} className="text-sm border-b border-border last:border-0 pb-2 last:pb-0">
              <div className="font-medium text-neutral-dark">
                {o.offenseLetter}. Art. {o.ucmjArticle} — {o.offenseType}
              </div>
              <div className="text-neutral-mid text-xs mt-0.5">{o.offenseSummary}</div>
              <div className="text-neutral-mid text-xs">{o.offenseDate} at {o.offensePlace}</div>
              {o.finding && (
                <div className={cn(
                  "text-xs font-medium mt-1",
                  o.finding === "G" || o.finding === "GUILTY" ? "text-error" : "text-success"
                )}>
                  Finding: {o.finding === "G" || o.finding === "GUILTY" ? "GUILTY" : "NOT GUILTY"}
                </div>
              )}
            </div>
          ))}
        </div>
      </fieldset>

      {/* Victim Demographics */}
      {caseData.offenses?.some((o: { victims?: unknown[] }) => o.victims?.length) && (
        <fieldset className="border border-border rounded-md px-4 py-3">
          <legend className="text-sm font-semibold text-neutral-dark px-2">Victim Demographics</legend>
          <div className="space-y-1">
            {(caseData.offenses || []).map((o: { offenseLetter: string; victims?: { victimStatus: string; victimSex: string; victimRace: string; victimEthnicity: string }[] }) =>
              o.victims?.map((v, vi) => (
                <div key={`${o.offenseLetter}-${vi}`} className="text-xs text-neutral-mid">
                  {o.offenseLetter}. {v.victimStatus} / {v.victimSex} / {v.victimRace} / {v.victimEthnicity}
                </div>
              ))
            )}
          </div>
        </fieldset>
      )}

      {/* Case Dates */}
      <fieldset className="border border-border rounded-md px-4 py-3">
        <legend className="text-sm font-semibold text-neutral-dark px-2">Case Dates</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <FieldRow label="Created" value={caseData.createdAt?.slice(0, 10) || "—"} />
          <FieldRow label="Updated" value={caseData.updatedAt?.slice(0, 10) || "—"} />
        </div>
      </fieldset>
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-neutral-mid">{label}:</span>{" "}
      <span className={cn("text-neutral-dark", mono && "font-mono")}>{value}</span>
    </div>
  );
}
