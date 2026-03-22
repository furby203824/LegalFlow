"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RANKS, GRADES } from "@/types";
import {
  AlertTriangle, AlertOctagon, Info, Clock, FileText,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { performPhaseAction } from "@/services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

export default function ActionsPanel({ caseData, onUpdate }: { caseData: CaseData; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  // Determine current action
  let currentAction = "";
  let currentOwner = "";
  if (!isClosed && !isReferred) {
    if (!hasSig("2")) { currentAction = "Sign Item 2 - Rights Advisement"; currentOwner = "ACCUSED"; }
    else if (!hasSig("3")) { currentAction = "Sign Item 3 - CO Certification"; currentOwner = "NJP_AUTHORITY"; }
    else if (!offenses.every((o: { finding: string | null }) => o.finding)) { currentAction = "Enter Findings (Item 5)"; currentOwner = "NJP_AUTHORITY"; }
    else if (!pr) { currentAction = "Enter Punishment (Item 6)"; currentOwner = "NJP_AUTHORITY"; }
    else if (!hasSig("9")) { currentAction = "Sign Item 9 - NJP Authority"; currentOwner = "NJP_AUTHORITY"; }
    else if (!hasSig("11")) { currentAction = "Sign Item 11 - Notification"; currentOwner = "NJP_AUTHORITY"; }
    else if (!hasSig("12")) { currentAction = "Sign Item 12 - Appeal Election"; currentOwner = "ACCUSED"; }
    else if (appeal?.appealIntent === "INTENDS_TO_APPEAL" && !hasSig("14")) { currentAction = "Process Appeal (Item 14)"; currentOwner = "APPEAL_AUTHORITY"; }
    else if (!hasSig("16")) { currentAction = "Sign Item 16 - Close Case"; currentOwner = "ADMIN"; }
  }

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
            <div className="text-xs text-neutral-mid">Required by: {currentOwner}</div>
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

      {/* Action Forms - shown based on current state */}
      {!isClosed && !isReferred && (
        <div className="space-y-3">
          {/* Phase 2 Actions */}
          {!hasSig("2") && (
            <ActionSection title="Item 2 - Rights Advisement">
              <p className="text-xs text-neutral-mid mb-3">
                Accused must accept NJP or demand court-martial.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => performAction("SIGN_ITEM_2", { acceptsNjp: true, counselProvided: true, signerName: `${caseData.accused.lastName}, ${caseData.accused.firstName}` })} disabled={loading} className="btn-primary text-xs">
                  Accept NJP & Sign
                </button>
                <button onClick={() => performAction("SIGN_ITEM_2", { acceptsNjp: false, counselProvided: true, signerName: `${caseData.accused.lastName}` })} disabled={loading} className="btn-danger text-xs">
                  Demand Court-Martial
                </button>
                <button onClick={() => performAction("SIGN_ITEM_2", { acceptsNjp: false, counselProvided: true, refusedToSign: true, signerName: "CO" })} disabled={loading} className="btn-warning text-xs">
                  Accused Refuses
                </button>
              </div>
            </ActionSection>
          )}

          {hasSig("2") && !hasSig("3") && (
            <ActionSection title="Item 3 - CO Certification">
              <button onClick={() => performAction("SIGN_ITEM_3", { signerName: "Commanding Officer" })} disabled={loading} className="btn-primary text-xs w-full">
                Sign Item 3
              </button>
            </ActionSection>
          )}

          {/* Findings */}
          {hasSig("3") && !offenses.every((o: { finding: string | null }) => o.finding) && caseData.status === "RIGHTS_ADVISED" && (
            <FindingsAction offenses={offenses} loading={loading} onSubmit={(findings) => performAction("ENTER_FINDINGS", { findings })} />
          )}

          {/* Punishment */}
          {offenses.every((o: { finding: string | null }) => o.finding) && !pr && caseData.currentPhase === "HEARING" && (
            <PunishmentAction caseData={caseData} loading={loading} onSubmit={(data) => performAction("ENTER_PUNISHMENT", data)} />
          )}

          {/* Item 9 */}
          {pr && !hasSig("9") && (
            <Item9Action loading={loading} onSubmit={(data) => performAction("SIGN_ITEM_9", data)} />
          )}

          {/* Item 11 */}
          {hasSig("9") && !hasSig("11") && (
            <ActionSection title="Items 10-11 - Notification">
              <label className="block text-xs font-medium mb-1">Item 10 - Notice Date</label>
              <input type="date" id="item10Date" defaultValue={caseData.njpDate || ""} className="input-field mb-2" />
              <button onClick={() => { const v = (document.getElementById("item10Date") as HTMLInputElement).value; performAction("SIGN_ITEM_11", { item10Date: v, signerName: "NJP Authority" }); }} disabled={loading} className="btn-primary text-xs w-full">
                Sign Item 11
              </button>
            </ActionSection>
          )}

          {/* Item 12 */}
          {hasSig("11") && !hasSig("12") && (
            <ActionSection title="Item 12 - Appeal Election">
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

          {/* Appeal */}
          {appeal?.appealIntent === "INTENDS_TO_APPEAL" && !appeal?.appealFiledDate && (
            <ActionSection title="Item 13 - Appeal Date">
              <input type="date" id="appealDate" className="input-field mb-2" />
              <button onClick={() => { const v = (document.getElementById("appealDate") as HTMLInputElement).value; performAction("ENTER_APPEAL_DATE", { appealDate: v }); }} disabled={loading} className="btn-primary text-xs w-full">
                Record Appeal
              </button>
            </ActionSection>
          )}

          {caseData.jaReviewRequired && !caseData.jaReviewComplete && (
            <ActionSection title="JA Review">
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

          {appeal?.appealFiledDate && !hasSig("14") && (!caseData.jaReviewRequired || caseData.jaReviewComplete) && (
            <ActionSection title="Item 14 - Appeal Decision">
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

          {/* OMPF + Item 16 */}
          {((hasSig("12") && appeal?.appealIntent !== "INTENDS_TO_APPEAL") || hasSig("14")) && !hasSig("16") && (
            <>
              {!caseData.ompfScanConfirmed && (
                <ActionSection title="OMPF Confirmation">
                  <button onClick={() => performAction("CONFIRM_OMPF")} disabled={loading} className="btn-secondary text-xs w-full">
                    Confirm OMPF/ESR
                  </button>
                </ActionSection>
              )}
              <ActionSection title="Item 16 - Close Case">
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

      {/* Documents */}
      <div className="card p-4">
        <h3 className="text-xs font-medium text-neutral-mid uppercase tracking-wide mb-3">Documents</h3>
        <p className="text-xs text-neutral-mid">Use the Documents tab below to generate and download documents.</p>
      </div>
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
  const [suspPun, setSuspPun] = useState("");
  const [suspMo, setSuspMo] = useState("");

  const isField = caseData.commanderGradeLevel === "FIELD_GRADE_AND_ABOVE";
  const hasPun = corrDays || forfAmt || reduction || extraDays || restrDays;

  return (
    <ActionSection title="Item 6 - Punishment">
      <div className="text-xs text-info bg-blue-50 rounded p-2 mb-3">
        Limits ({isField ? "Major+" : "Capt/Lt-"}): Custody {isField ? 30 : 7}d | Extra {isField ? 45 : 14}d | Restr {isField ? 60 : 14}d
      </div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field mb-2" placeholder="Punishment date" />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input type="number" value={corrDays} onChange={(e) => setCorrDays(e.target.value)} className="input-field text-xs" placeholder="Custody days" />
        <input type="number" value={forfAmt} onChange={(e) => setForfAmt(e.target.value)} className="input-field text-xs" placeholder="Forfeiture $" />
        <input type="number" value={extraDays} onChange={(e) => setExtraDays(e.target.value)} className="input-field text-xs" placeholder="Extra duties" />
        <input type="number" value={restrDays} onChange={(e) => setRestrDays(e.target.value)} className="input-field text-xs" placeholder="Restriction" />
      </div>
      <label className="flex items-center gap-2 text-xs mb-2">
        <input type="checkbox" checked={reduction} onChange={(e) => setReduction(e.target.checked)} /> Reduction
      </label>
      {reduction && (
        <select value={redGrade} onChange={(e) => setRedGrade(e.target.value)} className="input-field text-xs mb-2">
          <option value="">To grade...</option>
          {GRADES.filter((g) => g.startsWith("E")).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      )}
      <label className="flex items-center gap-2 text-xs mb-2">
        <input type="checkbox" checked={suspImposed} onChange={(e) => setSuspImposed(e.target.checked)} /> Suspend punishment
      </label>
      {suspImposed && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="text" value={suspPun} onChange={(e) => setSuspPun(e.target.value)} className="input-field text-xs" placeholder="Which punishment" />
          <input type="number" value={suspMo} onChange={(e) => setSuspMo(e.target.value)} className="input-field text-xs" placeholder="Months" />
        </div>
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
          suspensionPunishment: suspImposed ? suspPun : undefined,
          suspensionMonths: suspImposed && suspMo ? parseInt(suspMo) : undefined,
        }})} disabled={loading || !date || !hasPun} className="btn-primary text-xs flex-1">
          Submit
        </button>
      </div>
    </ActionSection>
  );
}

function Item9Action({ loading, onSubmit }: { loading: boolean; onSubmit: (d: Record<string, unknown>) => void }) {
  return (
    <ActionSection title="Items 8-9 - NJP Authority">
      <div className="space-y-2">
        <input type="text" id="a9Name" placeholder="Full Name" className="input-field text-xs" />
        <input type="text" id="a9Title" placeholder="Title" className="input-field text-xs" />
        <input type="text" id="a9Unit" placeholder="Unit" className="input-field text-xs" />
        <div className="grid grid-cols-2 gap-2">
          <select id="a9Rank" className="input-field text-xs"><option value="">Rank</option>{RANKS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <select id="a9Grade" className="input-field text-xs"><option value="">Grade</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </div>
        <input type="text" id="a9Edipi" placeholder="EDIPI" className="input-field text-xs" maxLength={10} />
      </div>
      <button onClick={() => {
        const g = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
        onSubmit({ authorityName: g("a9Name"), authorityTitle: g("a9Title"), authorityUnit: g("a9Unit"), authorityRank: g("a9Rank"), authorityGrade: g("a9Grade"), authorityEdipi: g("a9Edipi") });
      }} disabled={loading} className="btn-primary text-xs w-full mt-3">
        Sign Item 9
      </button>
    </ActionSection>
  );
}
