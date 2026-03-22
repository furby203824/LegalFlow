"use client";

import { useState } from "react";
import { RANKS, GRADES } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

export default function PhaseActions({
  caseData,
  onUpdate,
}: {
  caseData: CaseData;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function performAction(action: string, data: Record<string, unknown> = {}) {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/cases/${caseData.id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || result.errors?.join("; ") || "Action failed");
      } else {
        setSuccess(result.message || "Action completed");
        onUpdate();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const isClosed = caseData.status.startsWith("CLOSED") || caseData.status === "DESTROYED";
  const isReferred = caseData.status === "REFERRED_COURT_MARTIAL";
  const signatures = (caseData.signatures || []) as { itemNumber: string }[];
  const hasSig = (item: string) => signatures.some((s) => s.itemNumber === item);

  if (isClosed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-green-800">Case Closed</h3>
        <p className="text-green-700 text-sm mt-1">All phases complete. Case is locked.</p>
      </div>
    );
  }

  if (isReferred) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-purple-800">
          Referred to Court-Martial Jurisdiction
        </h3>
        <p className="text-purple-700 text-sm mt-1">
          Case suspended pending disposition by higher authority.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded px-4 py-2 text-red-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded px-4 py-2 text-green-800 text-sm">
          {success}
        </div>
      )}

      {/* Phase 2 - Item 2 */}
      {!hasSig("2") && (
        <ActionCard title="Item 2 - Rights Advisement (Accused)">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Accused must be advised of rights under Article 31, UCMJ, and
            indicate acceptance or refusal of NJP.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() =>
                performAction("SIGN_ITEM_2", {
                  acceptsNjp: true,
                  counselProvided: true,
                  signerName: caseData.accused.lastName + ", " + caseData.accused.firstName,
                })
              }
              disabled={loading}
              className="btn-primary"
            >
              Accept NJP & Sign
            </button>
            <button
              onClick={() =>
                performAction("SIGN_ITEM_2", {
                  acceptsNjp: false,
                  counselProvided: true,
                  signerName: caseData.accused.lastName + ", " + caseData.accused.firstName,
                })
              }
              disabled={loading}
              className="btn-danger"
            >
              Demand Court-Martial
            </button>
            <button
              onClick={() =>
                performAction("SIGN_ITEM_2", {
                  acceptsNjp: false,
                  counselProvided: true,
                  refusedToSign: true,
                  signerName: "CO",
                })
              }
              disabled={loading}
              className="btn-warning"
            >
              Accused Refuses to Sign
            </button>
          </div>
        </ActionCard>
      )}

      {/* Phase 2 - Item 3 */}
      {hasSig("2") && !hasSig("3") && (
        <ActionCard title="Item 3 - CO Certification">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Commanding Officer certifies that accused has been advised of rights.
          </p>
          <button
            onClick={() => performAction("SIGN_ITEM_3", { signerName: "Commanding Officer" })}
            disabled={loading}
            className="btn-primary"
          >
            Sign Item 3
          </button>
        </ActionCard>
      )}

      {/* Phase 3 - Findings */}
      {hasSig("3") &&
        !caseData.offenses.every((o: { finding: string | null }) => o.finding) &&
        caseData.status === "RIGHTS_ADVISED" && (
          <FindingsForm
            offenses={caseData.offenses}
            loading={loading}
            onSubmit={(findings) => performAction("ENTER_FINDINGS", { findings })}
          />
        )}

      {/* Phase 3 - Punishment */}
      {caseData.offenses.every((o: { finding: string | null }) => o.finding) &&
        !caseData.njpDate &&
        caseData.currentPhase === "HEARING" && (
          <PunishmentForm
            commanderGradeLevel={caseData.commanderGradeLevel}
            component={caseData.component}
            accusedGrade={caseData.accused.grade}
            loading={loading}
            caseId={caseData.id}
            onSubmit={(data) => performAction("ENTER_PUNISHMENT", data)}
          />
        )}

      {/* Phase 3 - Item 9 */}
      {caseData.njpDate && !hasSig("9") && (
        <Item9Form
          loading={loading}
          onSubmit={(data) => performAction("SIGN_ITEM_9", data)}
        />
      )}

      {/* Phase 4 - Item 11 */}
      {hasSig("9") && !hasSig("11") && (
        <ActionCard title="Item 11 - Notify Accused of Appeal Rights">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Item 10 - Date of Notification</label>
            <input
              type="date"
              id="item10Date"
              defaultValue={caseData.njpDate || ""}
              className="input-field"
            />
          </div>
          <button
            onClick={() => {
              const input = document.getElementById("item10Date") as HTMLInputElement;
              performAction("SIGN_ITEM_11", { item10Date: input.value, signerName: "NJP Authority" });
            }}
            disabled={loading}
            className="btn-primary"
          >
            Sign Item 11
          </button>
        </ActionCard>
      )}

      {/* Phase 4 - Item 12 */}
      {hasSig("11") && !hasSig("12") && (
        <ActionCard title="Item 12 - Accused Appeal Decision">
          <div className="flex gap-3">
            <button
              onClick={() =>
                performAction("SIGN_ITEM_12", {
                  appealIntent: "INTENDS_TO_APPEAL",
                  signerName: caseData.accused.lastName,
                })
              }
              disabled={loading}
              className="btn-warning"
            >
              I Do Intend to Appeal
            </button>
            <button
              onClick={() =>
                performAction("SIGN_ITEM_12", {
                  appealIntent: "DOES_NOT_INTEND",
                  signerName: caseData.accused.lastName,
                })
              }
              disabled={loading}
              className="btn-primary"
            >
              I Do Not Intend to Appeal
            </button>
          </div>
        </ActionCard>
      )}

      {/* Phase 5 - Appeal Date */}
      {caseData.appealRecord?.appealIntent === "INTENDS_TO_APPEAL" &&
        !caseData.appealRecord?.appealFiledDate && (
          <ActionCard title="Item 13 - Appeal Date">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Date Appeal Filed</label>
              <input type="date" id="appealDate" className="input-field" />
            </div>
            <button
              onClick={() => {
                const input = document.getElementById("appealDate") as HTMLInputElement;
                performAction("ENTER_APPEAL_DATE", { appealDate: input.value });
              }}
              disabled={loading}
              className="btn-primary"
            >
              Record Appeal Date
            </button>
          </ActionCard>
        )}

      {/* Phase 5 - JA Review */}
      {caseData.jaReviewRequired && !caseData.jaReviewComplete && (
        <ActionCard title="JA Review Required">
          <p className="text-sm text-red-600 mb-4">
            Punishment exceeds mandatory JA review threshold. Appeal authority
            action is blocked until JA review is logged.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Judge Advocate Name</label>
              <input type="text" id="jaName" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Review Date</label>
              <input type="date" id="jaDate" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Recommendation Summary</label>
              <textarea id="jaSummary" className="input-field h-20" />
            </div>
          </div>
          <button
            onClick={() => {
              const name = (document.getElementById("jaName") as HTMLInputElement).value;
              const date = (document.getElementById("jaDate") as HTMLInputElement).value;
              const summary = (document.getElementById("jaSummary") as HTMLTextAreaElement).value;
              performAction("LOG_JA_REVIEW", { reviewerName: name, reviewDate: date, summary });
            }}
            disabled={loading}
            className="btn-primary"
          >
            Log JA Review
          </button>
        </ActionCard>
      )}

      {/* Phase 5 - Item 14 */}
      {caseData.appealRecord?.appealFiledDate &&
        !hasSig("14") &&
        (!caseData.jaReviewRequired || caseData.jaReviewComplete) && (
          <ActionCard title="Item 14 - Appeal Authority Decision">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <select id="appealOutcome" className="input-field">
                <option value="DENIED">Appeal denied</option>
                <option value="DENIED_UNTIMELY">Appeal denied as untimely</option>
                <option value="GRANTED_SET_ASIDE">Appeal granted, punishment set aside</option>
                <option value="REDUCTION_SET_ASIDE_ONLY">Reduction set aside, no further relief</option>
                <option value="PARTIAL_RELIEF">Partial relief granted</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Item 15 - Date Accused Notified</label>
              <input type="date" id="item15Date" className="input-field" />
            </div>
            <button
              onClick={() => {
                const outcome = (document.getElementById("appealOutcome") as HTMLSelectElement).value;
                const item15Date = (document.getElementById("item15Date") as HTMLInputElement).value;
                performAction("SIGN_ITEM_14", { outcome, item15Date, authorityName: "Appeal Authority" });
              }}
              disabled={loading}
              className="btn-primary"
            >
              Sign Item 14
            </button>
          </ActionCard>
        )}

      {/* Phase 7 - OMPF Confirmation */}
      {((hasSig("12") && caseData.appealRecord?.appealIntent !== "INTENDS_TO_APPEAL") ||
        hasSig("14")) &&
        !caseData.ompfScanConfirmed &&
        !hasSig("16") && (
          <ActionCard title="OMPF/ESR Confirmation">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              IPAC Admin must confirm UPB copy is on file in Marine&apos;s OMPF.
            </p>
            <button onClick={() => performAction("CONFIRM_OMPF")} disabled={loading} className="btn-primary">
              Confirm OMPF/ESR Scan
            </button>
          </ActionCard>
        )}

      {/* Phase 7 - Item 16 */}
      {((hasSig("12") && caseData.appealRecord?.appealIntent !== "INTENDS_TO_APPEAL") ||
        hasSig("14")) &&
        !hasSig("16") && (
          <ActionCard title="Item 16 - Admin Completion">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">UD Number</label>
                <input type="text" id="udNumber" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">UD Date</label>
                <input type="date" id="udDate" className="input-field" />
              </div>
            </div>
            <button
              onClick={() => {
                const udNumber = (document.getElementById("udNumber") as HTMLInputElement).value;
                const udDate = (document.getElementById("udDate") as HTMLInputElement).value;
                performAction("SIGN_ITEM_16", { udNumber, udDate, signerName: "Admin" });
              }}
              disabled={loading}
              className="btn-primary"
            >
              Sign Item 16 & Close Case
            </button>
          </ActionCard>
        )}
    </div>
  );
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FindingsForm({
  offenses,
  loading,
  onSubmit,
}: {
  offenses: { id: string; offenseLetter: string; ucmjArticle: string; finding: string | null }[];
  loading: boolean;
  onSubmit: (findings: { offenseId: string; finding: string }[]) => void;
}) {
  const [findings, setFindings] = useState<Record<string, string>>({});

  return (
    <ActionCard title="Item 5 - Findings">
      {offenses.map((o) => (
        <div key={o.id} className="flex items-center gap-4 mb-3">
          <span className="font-medium w-48">{o.offenseLetter}. Article {o.ucmjArticle}</span>
          <select
            value={findings[o.id] || ""}
            onChange={(e) => setFindings({ ...findings, [o.id]: e.target.value })}
            className="input-field w-40"
          >
            <option value="">Select</option>
            <option value="G">Guilty</option>
            <option value="NG">Not Guilty</option>
          </select>
        </div>
      ))}
      <button
        onClick={() => {
          const data = offenses.map((o) => ({ offenseId: o.id, finding: findings[o.id] || "NG" }));
          onSubmit(data);
        }}
        disabled={loading || offenses.some((o) => !findings[o.id])}
        className="btn-primary mt-2"
      >
        Submit Findings
      </button>
    </ActionCard>
  );
}

function PunishmentForm({
  commanderGradeLevel,
  component,
  accusedGrade,
  loading,
  caseId,
  onSubmit,
}: {
  commanderGradeLevel: string;
  component: string;
  accusedGrade: string;
  loading: boolean;
  caseId: string;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const [punishmentDate, setPunishmentDate] = useState("");
  const [corrCustodyDays, setCorrCustodyDays] = useState("");
  const [forfeitureAmount, setForfeitureAmount] = useState("");
  const [forfeitureMonths, setForfeitureMonths] = useState("1");
  const [reductionImposed, setReductionImposed] = useState(false);
  const [reductionToGrade, setReductionToGrade] = useState("");
  const [extraDutiesDays, setExtraDutiesDays] = useState("");
  const [restrictionDays, setRestrictionDays] = useState("");
  const [arrestQuartersDays, setArrestQuartersDays] = useState("");
  const [suspensionImposed, setSuspensionImposed] = useState(false);
  const [suspensionPunishment, setSuspensionPunishment] = useState("");
  const [suspensionMonths, setSuspensionMonths] = useState("");
  const [smcrResult, setSmcrResult] = useState("");

  const isFieldGrade = commanderGradeLevel === "FIELD_GRADE_AND_ABOVE";
  const limits = isFieldGrade
    ? { custody: 30, extra: 45, restriction: 60 }
    : { custody: 7, extra: 14, restriction: 14 };

  async function calculateSmcr() {
    const drillPay = parseFloat((document.getElementById("drillPay") as HTMLInputElement).value);
    const drills = parseInt((document.getElementById("drillsIn60") as HTMLInputElement).value);
    const adPay = parseFloat((document.getElementById("adPay") as HTMLInputElement).value);
    const adDays = parseInt((document.getElementById("adDays") as HTMLInputElement).value);

    const res = await fetch("/api/calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drillPay, drillsInSixtyDays: drills, activeDutyBasicPay: adPay,
        activeDutyDaysInSixtyDays: adDays, njpDate: punishmentDate,
        commanderGradeLevel,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSmcrResult(`Maximum permissible forfeiture: $${data.result.maxForfeiture}`);
    }
  }

  const hasPunishment = corrCustodyDays || forfeitureAmount || reductionImposed ||
    extraDutiesDays || restrictionDays || arrestQuartersDays;

  return (
    <ActionCard title="Item 6 - Punishment">
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <strong>Limits ({isFieldGrade ? "Major+" : "Capt/Lt and below"}):</strong>{" "}
        Correctional custody: {limits.custody} days | Extra duties: {limits.extra} days |
        Restriction: {limits.restriction} days | Reduction: next inferior grade only (E6+ cannot be reduced)
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Date of Punishment *</label>
        <input type="date" value={punishmentDate} onChange={(e) => setPunishmentDate(e.target.value)} className="input-field w-48" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1">Correctional Custody (days)</label>
          <input type="number" value={corrCustodyDays} onChange={(e) => setCorrCustodyDays(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Forfeiture (whole $)</label>
          <div className="flex gap-2">
            <input type="number" value={forfeitureAmount} onChange={(e) => setForfeitureAmount(e.target.value)} className="input-field" placeholder="Amount" />
            <select value={forfeitureMonths} onChange={(e) => setForfeitureMonths(e.target.value)} className="input-field w-24">
              <option value="1">1 mo</option>
              {isFieldGrade && <option value="2">2 mo</option>}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Extra Duties (days)</label>
          <input type="number" value={extraDutiesDays} onChange={(e) => setExtraDutiesDays(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Restriction (days)</label>
          <input type="number" value={restrictionDays} onChange={(e) => setRestrictionDays(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Arrest in Quarters (days)</label>
          <input type="number" value={arrestQuartersDays} onChange={(e) => setArrestQuartersDays(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" checked={reductionImposed} onChange={(e) => setReductionImposed(e.target.checked)} />
            Reduction in Grade
          </label>
          {reductionImposed && (
            <select value={reductionToGrade} onChange={(e) => setReductionToGrade(e.target.value)} className="input-field mt-1">
              <option value="">Reduced to...</option>
              {GRADES.filter((g) => g.startsWith("E")).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Suspension */}
      <div className="border border-[var(--color-border)] rounded p-3 mb-4">
        <label className="flex items-center gap-2 text-sm font-medium mb-2">
          <input type="checkbox" checked={suspensionImposed} onChange={(e) => setSuspensionImposed(e.target.checked)} />
          Suspend Punishment (Item 7)
        </label>
        {suspensionImposed && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Punishment to Suspend</label>
              <input type="text" value={suspensionPunishment} onChange={(e) => setSuspensionPunishment(e.target.value)} className="input-field" placeholder="e.g., Restriction" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Months</label>
              <input type="number" value={suspensionMonths} onChange={(e) => setSuspensionMonths(e.target.value)} className="input-field" />
            </div>
          </div>
        )}
      </div>

      {/* SMCR Calculator */}
      {component === "SMCR" && (
        <div className="border border-amber-300 bg-amber-50 rounded p-4 mb-4">
          <h4 className="font-semibold text-amber-800 mb-3">SMCR Forfeiture Calculator</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Drill Pay ($)</label><input type="number" id="drillPay" className="input-field" /></div>
            <div><label className="block text-xs font-medium mb-1">Drills in 60 days</label><input type="number" id="drillsIn60" className="input-field" /></div>
            <div><label className="block text-xs font-medium mb-1">AD Basic Pay ($)</label><input type="number" id="adPay" className="input-field" /></div>
            <div><label className="block text-xs font-medium mb-1">AD Days in 60 days</label><input type="number" id="adDays" className="input-field" /></div>
          </div>
          <button type="button" onClick={calculateSmcr} className="btn-secondary mt-3">Calculate</button>
          {smcrResult && <div className="mt-2 font-bold text-amber-900">{smcrResult}</div>}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => onSubmit({ noPunishment: true, punishment: { punishmentDate } })}
          disabled={loading}
          className="btn-danger"
        >
          No Punishment (Destroy Case)
        </button>
        <button
          onClick={() => {
            onSubmit({
              noPunishment: false,
              punishment: {
                punishmentDate,
                corrCustodyDays: corrCustodyDays ? parseInt(corrCustodyDays) : undefined,
                forfeitureAmount: forfeitureAmount ? parseInt(forfeitureAmount) : undefined,
                forfeitureMonths: forfeitureAmount ? parseInt(forfeitureMonths) : undefined,
                reductionImposed,
                reductionToGrade: reductionImposed ? reductionToGrade : undefined,
                extraDutiesDays: extraDutiesDays ? parseInt(extraDutiesDays) : undefined,
                restrictionDays: restrictionDays ? parseInt(restrictionDays) : undefined,
                arrestQuartersDays: arrestQuartersDays ? parseInt(arrestQuartersDays) : undefined,
                suspensionImposed,
                suspensionPunishment: suspensionImposed ? suspensionPunishment : undefined,
                suspensionMonths: suspensionImposed && suspensionMonths ? parseInt(suspensionMonths) : undefined,
              },
            });
          }}
          disabled={loading || !punishmentDate || !hasPunishment}
          className="btn-primary"
        >
          Submit Punishment
        </button>
      </div>
    </ActionCard>
  );
}

function Item9Form({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  return (
    <ActionCard title="Items 8-9 - NJP Authority">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div><label className="block text-sm font-medium mb-1">Full Name *</label><input type="text" id="authName" className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Title *</label><input type="text" id="authTitle" className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Unit *</label><input type="text" id="authUnit" className="input-field" /></div>
        <div><label className="block text-sm font-medium mb-1">Rank</label>
          <select id="authRank" className="input-field"><option value="">Select</option>{RANKS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        </div>
        <div><label className="block text-sm font-medium mb-1">Grade</label>
          <select id="authGrade" className="input-field"><option value="">Select</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </div>
        <div><label className="block text-sm font-medium mb-1">EDIPI</label><input type="text" id="authEdipi" className="input-field" maxLength={10} /></div>
      </div>
      <button
        onClick={() => {
          const v = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
          onSubmit({
            authorityName: v("authName"), authorityTitle: v("authTitle"), authorityUnit: v("authUnit"),
            authorityRank: v("authRank"), authorityGrade: v("authGrade"), authorityEdipi: v("authEdipi"),
          });
        }}
        disabled={loading}
        className="btn-primary"
      >
        Sign Item 9
      </button>
    </ActionCard>
  );
}
