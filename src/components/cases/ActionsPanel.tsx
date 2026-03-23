"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RANK_GRADE_OPTIONS, getMaxForfeiture } from "@/types";
import type { CommanderGradeLevel, UserRole } from "@/types";
import {
  AlertTriangle, AlertOctagon, Info, Clock, Lock, FileText, Download, Upload, Printer, CheckCircle,
} from "lucide-react";
import { performPhaseAction } from "@/services/api";
import { generatePdfDocument } from "@/services/documents";
import PdfViewer from "@/components/documents/PdfViewer";
import HearingGuidePanel from "@/components/cases/HearingGuidePanel";
import { getSession } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

/* ── Role-to-action mapping ── */

const ROLE_LABELS: Record<string, string> = {
  NJP_PREPARER: "NJP Preparer",
  CERTIFIER_REVIEWER: "Certifier Reviewer",
  CERTIFIER: "Certifier",
  SUITE_ADMIN: "System Admin",
  ADMIN: "Admin",
  INITIATOR: "Initiator",
  NJP_AUTHORITY: "NJP Authority",
  ACCUSED: "Accused",
  APPEAL_AUTHORITY: "Appeal Authority",
  IPAC_ADMIN: "IPAC Admin",
};

// Which roles can perform which actions
function canPerformAction(role: UserRole, action: string): boolean {
  const permissions: Record<string, UserRole[]> = {
    // NJP Preparer: create case, admin closure
    SIGN_ITEM_16: ["NJP_PREPARER", "ADMIN", "IPAC_ADMIN", "SUITE_ADMIN"],
    CONFIRM_OMPF: ["NJP_PREPARER", "ADMIN", "IPAC_ADMIN", "SUITE_ADMIN"],

    // Accused: rights acknowledgement, NJP election, appeal election
    ACK_RIGHTS: ["ACCUSED", "NJP_PREPARER", "SUITE_ADMIN"],
    SIGN_ITEM_2: ["ACCUSED", "NJP_PREPARER", "SUITE_ADMIN"],
    SIGN_ITEM_12: ["ACCUSED", "NJP_PREPARER", "SUITE_ADMIN"],

    // Certifier (Commander): CO cert, findings, punishment, sign item 9, notification
    SIGN_ITEM_3: ["CERTIFIER", "NJP_AUTHORITY", "SUITE_ADMIN"],
    ENTER_FINDINGS: ["CERTIFIER", "NJP_AUTHORITY", "SUITE_ADMIN"],
    ENTER_PUNISHMENT: ["CERTIFIER", "NJP_AUTHORITY", "SUITE_ADMIN"],
    SIGN_ITEM_9: ["CERTIFIER", "NJP_AUTHORITY", "SUITE_ADMIN"],
    SIGN_ITEM_11: ["CERTIFIER", "NJP_AUTHORITY", "SUITE_ADMIN"],

    // Appeal authority
    SIGN_ITEM_14: ["APPEAL_AUTHORITY", "SUITE_ADMIN"],
    ENTER_APPEAL_DATE: ["NJP_PREPARER", "ADMIN", "SUITE_ADMIN"],
    LOG_JA_REVIEW: ["NJP_PREPARER", "ADMIN", "SUITE_ADMIN"],
  };

  const allowed = permissions[action];
  if (!allowed) return true; // Unknown action = allow
  return allowed.includes(role);
}

// Map action to the role label that should perform it
function actionOwnerLabel(action: string): string {
  const ownerMap: Record<string, string> = {
    ACK_RIGHTS: "Accused Marine",
    SIGN_ITEM_2: "Accused Marine",
    SIGN_ITEM_3: "Certifier (Commander)",
    ENTER_FINDINGS: "Certifier (Commander)",
    ENTER_PUNISHMENT: "Certifier (Commander)",
    SIGN_ITEM_9: "Certifier (Commander)",
    SIGN_ITEM_11: "Certifier (Commander)",
    SIGN_ITEM_12: "Accused Marine",
    SIGN_ITEM_14: "Appeal Authority",
    SIGN_ITEM_16: "NJP Preparer",
    CONFIRM_OMPF: "NJP Preparer",
  };
  return ownerMap[action] || "—";
}

export default function ActionsPanel({ caseData, onUpdate }: { caseData: CaseData; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const session = getSession();
  const userRole = (session?.role || "SUITE_ADMIN") as UserRole;

  async function performAction(action: string, data: Record<string, unknown> = {}) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await performPhaseAction(caseData.id, action, data);
      setSuccess(result.message || "Done");
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const sigs = (caseData.signatures || []) as { itemNumber: string }[];
  const hasSig = (item: string) => sigs.some((s) => s.itemNumber === item);
  const isClosed = caseData.status.startsWith("CLOSED") || caseData.status === "DESTROYED";
  const isReferred = caseData.status === "REFERRED_COURT_MARTIAL";
  const offenses = caseData.offenses || [];
  const pr = caseData.punishmentRecord;
  const appeal = caseData.appealRecord;

  const rightsAcked = !!caseData.rightsAcknowledgement?.acknowledged;

  // Determine current action
  let currentActionKey = "";
  let currentAction = "";
  if (!isClosed && !isReferred) {
    if (!rightsAcked) { currentActionKey = "ACK_RIGHTS"; currentAction = "Notification & Election of Rights (A-1-c/A-1-d)"; }
    else if (!hasSig("2")) { currentActionKey = "SIGN_ITEM_2"; currentAction = "Record NJP Election from signed form (Item 2)"; }
    else if (!hasSig("3")) { currentActionKey = "SIGN_ITEM_3"; currentAction = "CO Certification (Item 3)"; }
    else if (!offenses.every((o: { finding: string | null }) => o.finding)) { currentActionKey = "ENTER_FINDINGS"; currentAction = "Enter Findings at Hearing (Item 5)"; }
    else if (!pr) { currentActionKey = "ENTER_PUNISHMENT"; currentAction = "Enter Punishment at Hearing (Item 6)"; }
    else if (!hasSig("9")) { currentActionKey = "SIGN_ITEM_9"; currentAction = "NJP Authority Signature (Items 8-9)"; }
    else if (!hasSig("11")) { currentActionKey = "SIGN_ITEM_11"; currentAction = "Notification to Accused (Items 10-11)"; }
    else if (!hasSig("12")) { currentActionKey = "SIGN_ITEM_12"; currentAction = "Appeal Rights Acknowledgement — A-1-g (Item 12)"; }
    else if (appeal?.appealIntent === "INTENDS_TO_APPEAL" && !hasSig("14")) { currentActionKey = "SIGN_ITEM_14"; currentAction = "Appeal Authority Decision (Item 14)"; }
    else if (!hasSig("16")) { currentActionKey = "SIGN_ITEM_16"; currentAction = "Administrative Closure (Item 16)"; }
  }

  const canAct = currentActionKey ? canPerformAction(userRole, currentActionKey) : false;

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-error flex items-start gap-2">
          <AlertOctagon size={16} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-success flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" /> {success}
        </div>
      )}

      {/* Current Phase & Next Action */}
      <div className="card p-4">
        <h3 className="text-xs font-medium text-neutral-mid uppercase tracking-wide mb-2">
          Current Phase
        </h3>
        <div className="text-sm font-semibold text-neutral-dark">
          {caseData.currentPhase.replace(/_/g, " ")}
        </div>
        {currentAction && (
          <div className="mt-3 pt-3 border-t border-border">
            <h3 className="text-xs font-medium text-neutral-mid uppercase tracking-wide mb-1">
              Next Required Action
            </h3>
            <div className="text-sm text-neutral-dark">{currentAction}</div>
            <div className="text-xs text-neutral-mid">Required by: {actionOwnerLabel(currentActionKey)}</div>
            {!canAct && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded px-2 py-1.5">
                <Lock size={12} />
                This action requires the <strong>{actionOwnerLabel(currentActionKey)}</strong> role.
                You are logged in as <strong>{ROLE_LABELS[userRole] || userRole}</strong>.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {(caseData.jaReviewRequired && !caseData.jaReviewComplete) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-warning font-medium mb-1">
            <AlertTriangle size={14} /> JA Review Required
          </div>
          <p className="text-xs text-amber-700">
            Punishment exceeds JA review threshold. Appeal authority action blocked until review is logged.
          </p>
        </div>
      )}

      {caseData.suspensionMonitor?.monitorStatus === "ACTIVE" && (
        <div className="rounded-md bg-orange-50 border border-orange-200 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
            <Clock size={14} /> Suspension Active
          </div>
          <p className="text-xs text-orange-600">
            Ends: {caseData.suspensionMonitor.suspensionEnd}
            {caseData.suspensionMonitor.daysRemaining !== null && ` (${caseData.suspensionMonitor.daysRemaining} days remaining)`}
          </p>
        </div>
      )}

      {/* Certifier Reviewer note */}
      {userRole === "CERTIFIER_REVIEWER" && !isClosed && !isReferred && (
        <div className="card p-4 border-info/30 bg-blue-50/50">
          <h3 className="text-xs font-semibold text-info mb-1">Certifier Reviewer</h3>
          <p className="text-xs text-neutral-mid">
            Review this package for completeness and accuracy before it is routed to the Certifier (Commander).
            You may add remarks or flag issues but cannot perform case actions directly.
          </p>
        </div>
      )}

      {/* Action Forms - structured by JAGINST 5800.7G CH-2 phases */}
      {!isClosed && !isReferred && (
        <div className="space-y-3">

          {/* ═══ PRE-PROCEEDING ═══ */}
          {(!rightsAcked || !hasSig("2") || !hasSig("3")) && (
            <PhaseHeader label="Pre-Proceeding" description="JAGMAN 0109a — Required before the hearing" />
          )}

          {/* 1. Accused's Notification and Election of Rights (A-1-c or A-1-d) */}
          {!rightsAcked && canPerformAction(userRole, "SIGN_ITEM_2") && (
            <RightsAckAction caseData={caseData} loading={loading} onAcknowledge={() => performAction("ACK_RIGHTS")} />
          )}

          {/* 2. Record NJP Election from signed form (Item 2) */}
          {rightsAcked && !hasSig("2") && canPerformAction(userRole, "SIGN_ITEM_2") && (
            <ActionSection title="Record NJP Election (Item 2)">
              <div className="flex items-center gap-2 p-2 mb-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle size={14} className="text-success shrink-0" />
                <span className="text-xs text-success font-medium">Notification & Election form signed — record election</span>
              </div>
              <p className="text-xs text-neutral-mid mb-3">
                Record the member&apos;s election from the signed {caseData.vesselException ? "A-1-c" : "A-1-d"} form. Select the appropriate option based on {caseData.accused.rank} {caseData.accused.lastName}&apos;s decision.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => performAction("SIGN_ITEM_2", { acceptsNjp: true, counselProvided: true, signerName: `${caseData.accused.lastName}, ${caseData.accused.firstName}` })} disabled={loading} className="btn-primary text-xs">
                  Accept NJP & Sign
                </button>
                <button onClick={() => performAction("SIGN_ITEM_2", { acceptsNjp: false, counselProvided: true, signerName: `${caseData.accused.lastName}` })} disabled={loading} className="btn-danger text-xs">
                  Demand Court-Martial
                </button>
                <button onClick={() => performAction("SIGN_ITEM_2", { acceptsNjp: false, counselProvided: true, refusedToSign: true, signerName: "CO" })} disabled={loading} className="btn-warning text-xs">
                  Accused Refuses to Sign
                </button>
              </div>
            </ActionSection>
          )}

          {/* 3. CO Certification (Item 3) */}
          {hasSig("2") && !hasSig("3") && canPerformAction(userRole, "SIGN_ITEM_3") && (
            <ActionSection title="CO Certification (Item 3)">
              <p className="text-xs text-neutral-mid mb-3">
                The commanding officer certifies the accused has been notified per JAGMAN 0109a and all pre-proceeding requirements are met.
              </p>
              <button onClick={() => performAction("SIGN_ITEM_3", { signerName: "Commanding Officer" })} disabled={loading} className="btn-primary text-xs w-full">
                Sign Item 3
              </button>
            </ActionSection>
          )}

          {/* ═══ THE PROCEEDING ═══ */}
          {hasSig("3") && (!offenses.every((o: { finding: string | null }) => o.finding) || !pr || !hasSig("9")) && (
            <>
              <PhaseHeader label="The Proceeding" description="JAGMAN A-1-f — NJP Hearing" />
              {!offenses.every((o: { finding: string | null }) => o.finding) && (
                <ContextDocButton
                  caseId={caseData.id}
                  pdfType="navmc_10132_pdf"
                  label="Print NAVMC 10132 for Hearing"
                  description="Pre-filled UPB with offenses for the NJP Authority"
                />
              )}

              {/* Hearing Guide — contextual during the hearing */}
              <HearingGuidePanel
                caseId={caseData.id}
                caseData={caseData}
                onUpdate={onUpdate}
              />
            </>
          )}

          {/* 4. Findings (Item 5) */}
          {hasSig("3") && !offenses.every((o: { finding: string | null }) => o.finding) && caseData.status === "RIGHTS_ADVISED" && canPerformAction(userRole, "ENTER_FINDINGS") && (
            <FindingsAction offenses={offenses} loading={loading} onSubmit={(findings) => performAction("ENTER_FINDINGS", { findings })} />
          )}

          {/* 5. Punishment (Item 6) */}
          {offenses.every((o: { finding: string | null }) => o.finding) && !pr && caseData.currentPhase === "HEARING" && canPerformAction(userRole, "ENTER_PUNISHMENT") && (
            <PunishmentAction caseData={caseData} loading={loading} onSubmit={(data) => performAction("ENTER_PUNISHMENT", data)} />
          )}

          {/* 6. NJP Authority Signature (Items 8-9) */}
          {pr && !hasSig("9") && canPerformAction(userRole, "SIGN_ITEM_9") && (
            <Item9Action caseData={caseData} loading={loading} onSubmit={(data) => performAction("SIGN_ITEM_9", data)} />
          )}

          {/* ═══ POST-PROCEEDING ═══ */}
          {hasSig("9") && !hasSig("16") && (
            <PhaseHeader label="Post-Proceeding" description="Required after punishment is imposed" />
          )}

          {/* 7. Notification to Accused (Items 10-11) */}
          {hasSig("9") && !hasSig("11") && canPerformAction(userRole, "SIGN_ITEM_11") && (
            <ActionSection title="Notification to Accused (Items 10-11)">
              <p className="text-xs text-neutral-mid mb-3">
                The accused must be notified of the punishment imposed and their appeal rights per JAGMAN A-1-g.
              </p>
              <div className="mb-3">
                <ContextDocButton
                  caseId={caseData.id}
                  pdfType="navmc_10132_pdf"
                  label="Print NAVMC 10132 for Notification"
                  description="UPB with findings & punishment — for accused review"
                />
              </div>
              <label className="block text-xs font-medium mb-1">Item 10 — Date of Notice to Accused</label>
              <input type="date" id="item10Date" defaultValue={caseData.njpDate || ""} className="input-field mb-2" />
              <button onClick={() => { const v = (document.getElementById("item10Date") as HTMLInputElement).value; performAction("SIGN_ITEM_11", { item10Date: v, signerName: "NJP Authority" }); }} disabled={loading} className="btn-primary text-xs w-full">
                Sign Item 11
              </button>
            </ActionSection>
          )}

          {/* 8. Appeal Election (Item 12) — Accused's Acknowledgment of Appeal Rights (A-1-g) */}
          {hasSig("11") && !hasSig("12") && canPerformAction(userRole, "SIGN_ITEM_12") && (
            <ActionSection title="Appeal Rights Acknowledgement (Item 12)">
              <p className="text-xs text-neutral-mid mb-3">
                Per JAGMAN A-1-g, the accused must be advised of the right to appeal within 5 working days. Record the accused&apos;s appeal election.
              </p>
              <div className="mb-3">
                <ContextDocButton
                  caseId={caseData.id}
                  pdfType="appeal_rights_ack"
                  label="Print A-1-g Appeal Rights Form"
                  description="Acknowledgement of Appeal Rights — print for accused signature"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => performAction("SIGN_ITEM_12", { appealIntent: "INTENDS_TO_APPEAL", signerName: caseData.accused.lastName })} disabled={loading} className="btn-warning text-xs">
                  Intend to Appeal
                </button>
                <button onClick={() => performAction("SIGN_ITEM_12", { appealIntent: "DOES_NOT_INTEND", signerName: caseData.accused.lastName })} disabled={loading} className="btn-primary text-xs">
                  Do Not Intend to Appeal
                </button>
              </div>
            </ActionSection>
          )}

          {/* 9. Appeal Filed (Item 13) */}
          {appeal?.appealIntent === "INTENDS_TO_APPEAL" && !appeal?.appealFiledDate && canPerformAction(userRole, "ENTER_APPEAL_DATE") && (
            <ActionSection title="Appeal Filed (Item 13)">
              <input type="date" id="appealDate" className="input-field mb-2" />
              <button onClick={() => { const v = (document.getElementById("appealDate") as HTMLInputElement).value; performAction("ENTER_APPEAL_DATE", { appealDate: v }); }} disabled={loading} className="btn-primary text-xs w-full">
                Record Appeal
              </button>
            </ActionSection>
          )}

          {/* JA Review — required when punishment exceeds threshold (JAGMAN 0116) */}
          {caseData.jaReviewRequired && !caseData.jaReviewComplete && canPerformAction(userRole, "LOG_JA_REVIEW") && (
            <ActionSection title="JA Legal Review (JAGMAN 0116)">
              <input type="text" id="jaName" placeholder="JA Name" className="input-field mb-2" />
              <input type="date" id="jaDate" className="input-field mb-2" />
              <textarea id="jaSummary" placeholder="Summary" className="input-field mb-2 h-16" />
              <button onClick={() => {
                const g = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value;
                performAction("LOG_JA_REVIEW", { reviewerName: g("jaName"), reviewDate: g("jaDate"), summary: g("jaSummary") });
              }} disabled={loading} className="btn-primary text-xs w-full">
                Log JA Review
              </button>
            </ActionSection>
          )}

          {/* 10. Appeal Authority Decision (Item 14) */}
          {appeal?.appealFiledDate && !hasSig("14") && (!caseData.jaReviewRequired || caseData.jaReviewComplete) && canPerformAction(userRole, "SIGN_ITEM_14") && (
            <ActionSection title="Appeal Authority Decision (Item 14)">
              <select id="appealOutcome" className="input-field mb-2">
                <option value="DENIED">Denied</option>
                <option value="DENIED_UNTIMELY">Denied - Untimely</option>
                <option value="GRANTED_SET_ASIDE">Granted - Set Aside</option>
                <option value="REDUCTION_SET_ASIDE_ONLY">Reduction Set Aside</option>
                <option value="PARTIAL_RELIEF">Partial Relief</option>
              </select>
              <input type="date" id="item15Date" className="input-field mb-2" />
              <button onClick={() => {
                const outcome = (document.getElementById("appealOutcome") as HTMLSelectElement).value;
                const date = (document.getElementById("item15Date") as HTMLInputElement).value;
                performAction("SIGN_ITEM_14", { outcome, item15Date: date, authorityName: "Appeal Authority" });
              }} disabled={loading} className="btn-primary text-xs w-full">
                Sign Item 14
              </button>
            </ActionSection>
          )}

          {/* UPB Completion & Administrative Closure (JAGMAN 0119a) */}
          {((hasSig("12") && appeal?.appealIntent !== "INTENDS_TO_APPEAL") || hasSig("14")) && !hasSig("16") && canPerformAction(userRole, "SIGN_ITEM_16") && (
            <>
              {!caseData.ompfScanConfirmed && (
                <ActionSection title="Service Record Entry (JAGMAN 0109d)">
                  <p className="text-xs text-neutral-mid mb-3">
                    Confirm the NAVMC 118-11 / NAVPERS 1070/613 service record entry has been filed confirming rights advisement and NJP acceptance.
                  </p>
                  <button onClick={() => performAction("CONFIRM_OMPF")} disabled={loading} className="btn-secondary text-xs w-full">
                    Confirm OMPF/ESR Filed
                  </button>
                </ActionSection>
              )}
              <ActionSection title="Administrative Closure (Item 16)">
                <p className="text-xs text-neutral-mid mb-3">
                  Complete the Unit Punishment Book (NAVMC 10132) entry and close the NJP record.
                </p>
                <div className="mb-3">
                  <ContextDocButton
                    caseId={caseData.id}
                    pdfType="navmc_10132_pdf"
                    label="Download NAVMC 10132 (Final)"
                    description="Completed UPB with all items filled — for OMPF/ESR filing"
                  />
                </div>
                <input type="text" id="udNumber" placeholder="UD Number" className="input-field mb-2" />
                <input type="date" id="udDate" className="input-field mb-2" />
                <button onClick={() => {
                  const ud = (document.getElementById("udNumber") as HTMLInputElement).value;
                  const dt = (document.getElementById("udDate") as HTMLInputElement).value;
                  performAction("SIGN_ITEM_16", { udNumber: ud, udDate: dt, signerName: "Admin" });
                }} disabled={loading} className="btn-danger text-xs w-full">
                  Sign Item 16 & Lock Form
                </button>
              </ActionSection>
            </>
          )}
        </div>
      )}

    </div>
  );
}

function PhaseHeader({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex-1 border-t border-primary/30" />
      <div className="text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{label}</span>
        <p className="text-[10px] text-neutral-mid">{description}</p>
      </div>
      <div className="flex-1 border-t border-primary/30" />
    </div>
  );
}

function ContextDocButton({ caseId, pdfType, label, description }: { caseId: string; pdfType: string; label: string; description: string }) {
  const [generating, setGenerating] = useState(false);
  const [pdfData, setPdfData] = useState<{ pdfBytes: Uint8Array; filename: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await generatePdfDocument(caseId, pdfType as any);
      setPdfData({ pdfBytes: result.pdfBytes, filename: result.filename });
      setShowPreview(true);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!pdfData) return;
    const blob = new Blob([pdfData.pdfBytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = pdfData.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 w-full p-2.5 rounded-md border border-dashed border-primary/40 bg-blue-50/30 hover:bg-blue-50 transition-colors text-left"
      >
        <FileText size={14} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-primary">{generating ? "Generating..." : label}</span>
          <p className="text-[10px] text-neutral-mid">{description}</p>
        </div>
        <Printer size={12} className="text-primary shrink-0" />
      </button>

      {showPreview && pdfData && (
        <div className="rounded-md border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b border-border">
            <span className="text-xs font-medium text-neutral-dark">Document Preview</span>
            <div className="flex items-center gap-2">
              <button onClick={() => handleGenerate()} disabled={generating} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Printer size={12} /> Regenerate
              </button>
              <button onClick={handleDownload} className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                <Download size={12} /> Download
              </button>
              <button onClick={() => setShowPreview(false)} className="text-neutral-mid hover:text-neutral-dark text-xs px-1">
                &times;
              </button>
            </div>
          </div>
          <PdfViewer pdfBytes={pdfData.pdfBytes} className="h-[500px]" />
        </div>
      )}
    </div>
  );
}

function ActionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-neutral-dark mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FindingsAction({ offenses, loading, onSubmit }: { offenses: { id: string; offenseLetter: string; ucmjArticle: string }[]; loading: boolean; onSubmit: (f: { offenseId: string; finding: string }[]) => void }) {
  const [findings, setFindings] = useState<Record<string, string>>({});
  return (
    <ActionSection title="Item 5 - Findings">
      {offenses.map((o) => (
        <div key={o.id} className="flex items-center gap-2 mb-2">
          <span className="text-xs w-20">{o.offenseLetter}. Art.{o.ucmjArticle}</span>
          <select value={findings[o.id] || ""} onChange={(e) => setFindings({ ...findings, [o.id]: e.target.value })} className="input-field text-xs">
            <option value="">Select</option>
            <option value="G">Guilty</option>
            <option value="NG">Not Guilty</option>
          </select>
        </div>
      ))}
      <button onClick={() => onSubmit(offenses.map((o) => ({ offenseId: o.id, finding: findings[o.id] || "NG" })))} disabled={loading || offenses.some((o) => !findings[o.id])} className="btn-primary text-xs w-full mt-2">
        Submit Findings
      </button>
    </ActionSection>
  );
}

function PunishmentAction({ caseData, loading, onSubmit }: { caseData: CaseData; loading: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const [date, setDate] = useState("");
  const [corrDays, setCorrDays] = useState("");
  const [forfAmt, setForfAmt] = useState("");
  const [forfMo, setForfMo] = useState("1");
  const [reduction, setReduction] = useState(false);
  const [redGrade, setRedGrade] = useState("");
  const [extraDays, setExtraDays] = useState("");
  const [restrDays, setRestrDays] = useState("");
  const [suspImposed, setSuspImposed] = useState(false);
  const [suspItems, setSuspItems] = useState<Record<string, boolean>>({});
  const [suspMo, setSuspMo] = useState("");

  const isField = caseData.commanderGradeLevel === "FIELD_GRADE_AND_ABOVE";
  const isVessel = !!caseData.vesselException;
  const hasPun = corrDays || forfAmt || reduction || extraDays || restrDays;

  const accusedGrade: string = caseData.accusedGrade || "";
  const gradeNum = accusedGrade.startsWith("E") ? parseInt(accusedGrade.replace("E", ""), 10) : 0;
  const canReduce = gradeNum >= 2 && gradeNum <= 5;
  const reducedGrade = canReduce ? `E${gradeNum - 1}` : "";

  const handleReductionToggle = (checked: boolean) => {
    setReduction(checked);
    if (checked && reducedGrade) setRedGrade(reducedGrade);
    else setRedGrade("");
  };

  const effectiveGrade = reduction && redGrade ? redGrade : accusedGrade;
  const maxForf = getMaxForfeiture(effectiveGrade, caseData.commanderGradeLevel as CommanderGradeLevel, caseData.accused?.yearsOfService ?? undefined);

  return (
    <ActionSection title="Item 6 - Punishment">
      <div className="text-xs text-info bg-blue-50 rounded p-2 mb-3">
        Limits ({isField ? "Major+" : "Capt/Lt-"}):{isVessel ? ` Custody ${isField ? 30 : 7}d |` : ""} Extra {isField ? 45 : 14}d | Restr {isField ? 60 : 14}d
        {maxForf != null && (
          <span className="block mt-1">Max forfeiture ({effectiveGrade} pay): <span className="font-semibold">${maxForf}</span>{isField ? "/mo for 2 mo" : ""}</span>
        )}
      </div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field mb-2" placeholder="Punishment date" />
      <div className="grid grid-cols-2 gap-2 mb-2">
        {isVessel && (
          <input type="number" value={corrDays} onChange={(e) => setCorrDays(e.target.value)} className="input-field text-xs" placeholder="Custody days" />
        )}
        <input type="number" value={forfAmt} onChange={(e) => setForfAmt(e.target.value)} className="input-field text-xs" placeholder={maxForf != null ? `Forfeiture $ (max $${maxForf})` : "Forfeiture $"} max={maxForf ?? undefined} />
        <input type="number" value={extraDays} onChange={(e) => setExtraDays(e.target.value)} className="input-field text-xs" placeholder="Extra duties" />
        <input type="number" value={restrDays} onChange={(e) => setRestrDays(e.target.value)} className="input-field text-xs" placeholder="Restriction" />
      </div>
      {canReduce ? (
        <>
          <label className="flex items-center gap-2 text-xs mb-2">
            <input type="checkbox" checked={reduction} onChange={(e) => handleReductionToggle(e.target.checked)} /> Reduction to {reducedGrade}
          </label>
          {reduction && (
            <div className="text-xs text-neutral-mid mb-2 ml-6">
              {accusedGrade} → {reducedGrade} (one grade reduction per MCO 5800.16)
              {maxForf != null && <span className="block text-info mt-0.5">Forfeiture max recalculated on {reducedGrade} pay: ${maxForf}{isField ? "/mo" : ""}</span>}
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-neutral-mid mb-2">
          Reduction not available for grade {accusedGrade}.
          {gradeNum >= 6 ? " Marines E-6 and above may not be reduced at NJP." : ""}
        </div>
      )}
      {hasPun && (
        <>
          <label className="flex items-center gap-2 text-xs mb-2">
            <input type="checkbox" checked={suspImposed} onChange={(e) => { setSuspImposed(e.target.checked); if (!e.target.checked) setSuspItems({}); }} /> Suspend punishment
          </label>
          {suspImposed && (
            <div className="ml-6 mb-2 space-y-1.5">
              <p className="text-xs text-neutral-mid mb-1">Select punishments to suspend:</p>
              {corrDays && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!suspItems["custody"]} onChange={(e) => setSuspItems({ ...suspItems, custody: e.target.checked })} /> Correctional custody ({corrDays}d)</label>}
              {forfAmt && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!suspItems["forfeiture"]} onChange={(e) => setSuspItems({ ...suspItems, forfeiture: e.target.checked })} /> Forfeiture (${forfAmt}{isField ? "/mo" : ""})</label>}
              {reduction && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!suspItems["reduction"]} onChange={(e) => setSuspItems({ ...suspItems, reduction: e.target.checked })} /> Reduction to {redGrade}</label>}
              {extraDays && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!suspItems["extra"]} onChange={(e) => setSuspItems({ ...suspItems, extra: e.target.checked })} /> Extra duties ({extraDays}d)</label>}
              {restrDays && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!suspItems["restriction"]} onChange={(e) => setSuspItems({ ...suspItems, restriction: e.target.checked })} /> Restriction ({restrDays}d)</label>}
              <div className="pt-1">
                <select value={suspMo} onChange={(e) => setSuspMo(e.target.value)} className="input-field text-xs w-32">
                  <option value="">Months</option>
                  <option value="3">3 months</option>
                  <option value="4">4 months</option>
                  <option value="5">5 months</option>
                  <option value="6">6 months</option>
                </select>
                <span className="text-xs text-neutral-mid ml-2">suspension period</span>
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex gap-2">
        <button onClick={() => onSubmit({ noPunishment: true, punishment: { punishmentDate: date } })} disabled={loading} className="btn-ghost text-xs flex-1">
          No Punishment
        </button>
        <button onClick={() => onSubmit({ noPunishment: false, punishment: {
          punishmentDate: date,
          corrCustodyDays: corrDays ? parseInt(corrDays) : undefined,
          forfeitureAmount: forfAmt ? parseInt(forfAmt) : undefined,
          forfeitureMonths: forfAmt ? parseInt(forfMo) : undefined,
          reductionImposed: reduction,
          reductionToGrade: reduction ? redGrade : undefined,
          extraDutiesDays: extraDays ? parseInt(extraDays) : undefined,
          restrictionDays: restrDays ? parseInt(restrDays) : undefined,
          suspensionImposed: suspImposed,
          suspensionPunishment: suspImposed ? Object.entries(suspItems).filter(([, v]) => v).map(([k]) => k).join(", ") : undefined,
          suspensionMonths: suspImposed && suspMo ? parseInt(suspMo) : undefined,
        }})} disabled={loading || !date || !hasPun} className="btn-primary text-xs flex-1">
          Submit
        </button>
      </div>
    </ActionSection>
  );
}

function RightsAckAction({ caseData, loading, onAcknowledge }: { caseData: CaseData; loading: boolean; onAcknowledge: () => void }) {
  const [step, setStep] = useState<"generate" | "upload" | "confirm">("generate");
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [generating, setGenerating] = useState(false);
  const [fileName, setFileName] = useState("");
  const accused = caseData.accused || {};
  const vesselException = !!caseData.vesselException;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generatePdfDocument(caseData.id, "notification_election_rights");
      setPdfBytes(result.pdfBytes);
      const blob = new Blob([result.pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(result.filename);
      setStep("upload");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!pdfUrl) return;
    const a = window.document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFilename;
    a.click();
  }

  function handlePrint() {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => printWindow.print());
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setStep("confirm");
    }
  }

  const formTitle = vesselException
    ? "Notification & Election of Rights (Vessel Exception Applies)"
    : "Notification & Election of Rights (Vessel Exception Does Not Apply)";

  return (
    <ActionSection title="Notification & Election of Rights (JAGMAN 0109a)">
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={cn("flex items-center gap-1 font-medium", step === "generate" ? "text-primary" : "text-success")}>
            {step !== "generate" ? <CheckCircle size={14} /> : <span className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center text-[10px] font-bold">1</span>}
            Generate PDF
          </span>
          <span className="w-6 border-t border-border" />
          <span className={cn("flex items-center gap-1 font-medium", step === "upload" ? "text-primary" : step === "confirm" ? "text-success" : "text-neutral-mid")}>
            {step === "confirm" ? <CheckCircle size={14} /> : <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold", step === "upload" ? "border-primary" : "border-neutral-mid/40")}>2</span>}
            Print &amp; Sign
          </span>
          <span className="w-6 border-t border-border" />
          <span className={cn("flex items-center gap-1 font-medium", step === "confirm" ? "text-primary" : "text-neutral-mid")}>
            <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold", step === "confirm" ? "border-primary" : "border-neutral-mid/40")}>3</span>
            Upload &amp; Confirm
          </span>
        </div>

        {/* Step 1: Generate PDF */}
        {step === "generate" && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-mid">
              Generate the official JAGINST 5800.7G notification form for {accused.rank} {accused.lastName}.
              {vesselException
                ? " The vessel exception applies — the accused cannot refuse NJP."
                : " The accused has the right to refuse NJP and demand trial by court-martial."}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs font-medium text-blue-800 flex items-center gap-1">
                <FileText size={14} /> {formTitle}
              </p>
              <p className="text-[10px] text-blue-700 mt-1">
                {vesselException ? "JAGMAN A-1-c" : "JAGMAN A-1-d"} — Pre-filled with case offenses and max punishments
              </p>
            </div>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary text-xs w-full gap-1">
              <FileText size={14} />
              {generating ? "Generating PDF..." : "Generate Notification & Election PDF"}
            </button>
          </div>
        )}

        {/* Step 2: Print, Sign & Upload */}
        {step === "upload" && (
          <div className="space-y-3">
            {/* PDF preview */}
            {pdfUrl && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border">
                  <span className="text-xs font-medium">{pdfFilename}</span>
                  <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn-ghost text-xs gap-1">
                      <Printer size={12} /> Print
                    </button>
                    <button onClick={handleDownload} className="btn-primary text-xs gap-1">
                      <Download size={12} /> Download PDF
                    </button>
                  </div>
                </div>
                {pdfBytes && <PdfViewer pdfBytes={pdfBytes} className="h-[350px]" />}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 space-y-1">
              <p className="font-medium flex items-center gap-1"><AlertTriangle size={12} /> Instructions:</p>
              <ol className="list-decimal ml-5 space-y-0.5">
                <li>Download or print the PDF above</li>
                <li>Read rights to the accused and have them complete the Election of Rights section</li>
                <li>Have the accused and witness sign the form</li>
                <li>Scan/photograph the signed form and upload below</li>
              </ol>
            </div>

            {/* Upload signed copy */}
            <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-blue-50/30 transition-colors">
              <Upload size={20} className="text-neutral-mid" />
              <span className="text-xs text-neutral-mid">Upload signed Notification &amp; Election of Rights</span>
              <span className="text-[10px] text-neutral-mid">PDF, JPG, or PNG</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle size={16} className="text-success shrink-0" />
              <div>
                <p className="text-xs font-medium text-success">Signed document uploaded</p>
                <p className="text-[10px] text-neutral-mid">{fileName}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-mid">
              Confirm that {accused.rank} {accused.lastName} has been advised of their rights per JAGINST 5800.7G and the signed notification &amp; election form has been received.
            </p>
            <button onClick={onAcknowledge} disabled={loading} className="btn-primary text-xs w-full gap-1">
              <CheckCircle size={14} />
              {loading ? "Processing..." : "Validate Election & Confirm Rights Acknowledged"}
            </button>
          </div>
        )}
      </div>
    </ActionSection>
  );
}

function Item9Action({ caseData, loading, onSubmit }: { caseData: CaseData; loading: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState(caseData?.accused?.unitFullString || caseData?.unit?.unitFullString || "");
  const [rankGrade, setRankGrade] = useState("");
  const [edipi, setEdipi] = useState("");

  const rank = rankGrade ? rankGrade.split("/")[1] : "";
  const grade = rankGrade ? rankGrade.split("/")[0] : "";

  return (
    <ActionSection title="Items 8-9 - NJP Authority">
      <div className="space-y-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="input-field text-xs" />
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-field text-xs" />
        <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="input-field text-xs" />
        <select value={rankGrade} onChange={(e) => setRankGrade(e.target.value)} className="input-field text-xs">
          <option value="">Select rank/grade</option>
          {RANK_GRADE_OPTIONS.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
        </select>
        <input type="text" value={edipi} onChange={(e) => setEdipi(e.target.value)} placeholder="EDIPI" className="input-field text-xs" maxLength={10} />
      </div>
      <button onClick={() => {
        onSubmit({ authorityName: name, authorityTitle: title, authorityUnit: unit, authorityRank: rank, authorityGrade: grade, authorityEdipi: edipi });
      }} disabled={loading} className="btn-primary text-xs w-full mt-3">
        Sign Item 9
      </button>
    </ActionSection>
  );
}
