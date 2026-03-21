"use client";

import { useState } from "react";
import { RANKS, GRADES } from "@/types";

interface CaseData {
  id: string;
  status: string;
  currentPhase: string;
  vesselException: boolean;
  item2SignedAt: string | null;
  item3SignedAt: string | null;
  item4Applicable: boolean;
  item6Date: string | null;
  item9SignedAt: string | null;
  item11SignedAt: string | null;
  item12IntendsToAppeal: boolean | null;
  item12SignedAt: string | null;
  item13AppealDate: string | null;
  item14SignedAt: string | null;
  item16SignedAt: string | null;
  jaReviewRequired: boolean;
  jaReviewCompleted: boolean;
  ompfConfirmed: boolean;
  commanderGradeCategory: string;
  component: string;
  accusedGrade: string;
  offenses: {
    id: string;
    letter: string;
    ucmjArticle: string;
    finding: string | null;
  }[];
  punishments: {
    id: string;
    type: string;
    duration: number | null;
    amount: number | null;
    suspended: boolean;
  }[];
}

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

  if (isClosed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-green-800">Case Closed</h3>
        <p className="text-green-700 text-sm mt-1">
          All phases complete. Case is locked.
        </p>
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
      {!caseData.item2SignedAt && (
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
      {caseData.item2SignedAt && !caseData.item3SignedAt && (
        <ActionCard title="Item 3 - CO Certification">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Commanding Officer certifies that accused has been advised of
            rights.
          </p>
          <button
            onClick={() => performAction("SIGN_ITEM_3")}
            disabled={loading}
            className="btn-primary"
          >
            Sign Item 3
          </button>
        </ActionCard>
      )}

      {/* Phase 3 - Findings */}
      {caseData.item3SignedAt &&
        !caseData.offenses.every((o) => o.finding) &&
        caseData.status === "RIGHTS_ADVISED" && (
          <FindingsForm
            offenses={caseData.offenses}
            loading={loading}
            onSubmit={(findings) => performAction("ENTER_FINDINGS", { findings })}
          />
        )}

      {/* Phase 3 - Punishment */}
      {caseData.offenses.every((o) => o.finding) &&
        !caseData.item6Date &&
        caseData.currentPhase === "HEARING" && (
          <PunishmentForm
            commanderGradeCategory={caseData.commanderGradeCategory}
            component={caseData.component}
            accusedGrade={caseData.accusedGrade}
            loading={loading}
            caseId={caseData.id}
            onSubmit={(data) => performAction("ENTER_PUNISHMENT", data)}
          />
        )}

      {/* Phase 3 - Item 9 */}
      {caseData.item6Date && !caseData.item9SignedAt && (
        <Item9Form
          loading={loading}
          onSubmit={(data) => performAction("SIGN_ITEM_9", data)}
        />
      )}

      {/* Phase 4 - Item 11 */}
      {caseData.item9SignedAt && !caseData.item11SignedAt && (
        <ActionCard title="Item 11 - Notify Accused of Appeal Rights">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            NJP authority notifies accused of appeal rights and signs.
          </p>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Item 10 - Date of Notification
            </label>
            <input
              type="date"
              id="item10Date"
              defaultValue={caseData.item6Date || ""}
              className="input-field"
            />
          </div>
          <button
            onClick={() => {
              const input = document.getElementById("item10Date") as HTMLInputElement;
              performAction("SIGN_ITEM_11", { item10Date: input.value });
            }}
            disabled={loading}
            className="btn-primary"
          >
            Sign Item 11
          </button>
        </ActionCard>
      )}

      {/* Phase 4 - Item 12 */}
      {caseData.item11SignedAt && !caseData.item12SignedAt && (
        <ActionCard title="Item 12 - Accused Appeal Decision">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Accused indicates intent to appeal.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() =>
                performAction("SIGN_ITEM_12", { intendsToAppeal: true })
              }
              disabled={loading}
              className="btn-warning"
            >
              I Do Intend to Appeal
            </button>
            <button
              onClick={() =>
                performAction("SIGN_ITEM_12", { intendsToAppeal: false })
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
      {caseData.item12IntendsToAppeal && !caseData.item13AppealDate && (
        <ActionCard title="Item 13 - Appeal Date">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Date Appeal Filed
            </label>
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
      {caseData.jaReviewRequired && !caseData.jaReviewCompleted && (
        <ActionCard title="JA Review Required">
          <p className="text-sm text-red-600 mb-4">
            Punishment exceeds mandatory JA review threshold. Appeal authority
            action is blocked until JA review is logged.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Judge Advocate Name
              </label>
              <input type="text" id="jaName" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Review Date
              </label>
              <input type="date" id="jaDate" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Recommendation Summary
              </label>
              <textarea id="jaSummary" className="input-field h-20" />
            </div>
          </div>
          <button
            onClick={() => {
              const name = (document.getElementById("jaName") as HTMLInputElement).value;
              const date = (document.getElementById("jaDate") as HTMLInputElement).value;
              const summary = (document.getElementById("jaSummary") as HTMLTextAreaElement).value;
              performAction("LOG_JA_REVIEW", {
                reviewerName: name,
                reviewDate: date,
                summary,
              });
            }}
            disabled={loading}
            className="btn-primary"
          >
            Log JA Review
          </button>
        </ActionCard>
      )}

      {/* Phase 5 - Item 14 */}
      {caseData.item13AppealDate &&
        !caseData.item14SignedAt &&
        (!caseData.jaReviewRequired || caseData.jaReviewCompleted) && (
          <ActionCard title="Item 14 - Appeal Authority Decision">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <select id="appealOutcome" className="input-field">
                <option value="DENIED">Appeal denied</option>
                <option value="DENIED_UNTIMELY">Appeal denied as untimely</option>
                <option value="GRANTED_SET_ASIDE">
                  Appeal granted, punishment set aside
                </option>
                <option value="REDUCTION_SET_ASIDE">
                  Reduction set aside, no further relief
                </option>
                <option value="PARTIAL_RELIEF">Partial relief granted</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Item 15 - Date Accused Notified
              </label>
              <input type="date" id="item15Date" className="input-field" />
            </div>
            <button
              onClick={() => {
                const outcome = (document.getElementById("appealOutcome") as HTMLSelectElement).value;
                const item15Date = (document.getElementById("item15Date") as HTMLInputElement).value;
                performAction("SIGN_ITEM_14", { outcome, item15Date });
              }}
              disabled={loading}
              className="btn-primary"
            >
              Sign Item 14
            </button>
          </ActionCard>
        )}

      {/* Phase 7 - OMPF Confirmation */}
      {((caseData.item12SignedAt && !caseData.item12IntendsToAppeal) ||
        caseData.item14SignedAt) &&
        !caseData.ompfConfirmed &&
        !caseData.item16SignedAt && (
          <ActionCard title="OMPF/ESR Confirmation">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              IPAC Admin must confirm UPB copy is on file in Marine&apos;s OMPF.
            </p>
            <button
              onClick={() => performAction("CONFIRM_OMPF")}
              disabled={loading}
              className="btn-primary"
            >
              Confirm OMPF/ESR Scan
            </button>
          </ActionCard>
        )}

      {/* Phase 7 - Item 16 */}
      {((caseData.item12SignedAt && !caseData.item12IntendsToAppeal) ||
        caseData.item14SignedAt) &&
        !caseData.item16SignedAt && (
          <ActionCard title="Item 16 - Admin Completion">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  UD Number
                </label>
                <input type="text" id="udNumber" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  UD Date
                </label>
                <input type="date" id="udDate" className="input-field" />
              </div>
            </div>
            <button
              onClick={() => {
                const udNumber = (document.getElementById("udNumber") as HTMLInputElement).value;
                const udDate = (document.getElementById("udDate") as HTMLInputElement).value;
                performAction("SIGN_ITEM_16", { udNumber, udDate });
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

// --- Sub-components ---

function ActionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FindingsForm({
  offenses,
  loading,
  onSubmit,
}: {
  offenses: { id: string; letter: string; ucmjArticle: string; finding: string | null }[];
  loading: boolean;
  onSubmit: (findings: { offenseId: string; finding: string }[]) => void;
}) {
  const [findings, setFindings] = useState<Record<string, string>>({});

  return (
    <ActionCard title="Item 5 - Findings">
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Enter finding for each offense.
      </p>
      {offenses.map((o) => (
        <div key={o.id} className="flex items-center gap-4 mb-3">
          <span className="font-medium w-48">
            {o.letter}. Article {o.ucmjArticle}
          </span>
          <select
            value={findings[o.id] || ""}
            onChange={(e) =>
              setFindings({ ...findings, [o.id]: e.target.value })
            }
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
          const data = offenses.map((o) => ({
            offenseId: o.id,
            finding: findings[o.id] || "NG",
          }));
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
  commanderGradeCategory,
  component,
  accusedGrade,
  loading,
  caseId,
  onSubmit,
}: {
  commanderGradeCategory: string;
  component: string;
  accusedGrade: string;
  loading: boolean;
  caseId: string;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  const [item6Date, setItem6Date] = useState("");
  const [punishments, setPunishments] = useState<
    {
      type: string;
      duration: string;
      amount: string;
      reducedToGrade: string;
      suspended: boolean;
      suspensionMonths: string;
    }[]
  >([]);
  const [smcrResult, setSmcrResult] = useState<string>("");

  const isFieldGrade = commanderGradeCategory === "FIELD_GRADE_AND_ABOVE";
  const limits = isFieldGrade
    ? { custody: 30, extra: 45, restriction: 60 }
    : { custody: 7, extra: 14, restriction: 14 };

  function addPunishment() {
    setPunishments([
      ...punishments,
      {
        type: "",
        duration: "",
        amount: "",
        reducedToGrade: "",
        suspended: false,
        suspensionMonths: "",
      },
    ]);
  }

  function removePunishment(idx: number) {
    setPunishments(punishments.filter((_, i) => i !== idx));
  }

  function updatePunishment(idx: number, field: string, value: unknown) {
    const updated = [...punishments];
    (updated[idx] as Record<string, unknown>)[field] = value;
    setPunishments(updated);
  }

  async function calculateSmcr() {
    const drillPay = parseFloat(
      (document.getElementById("drillPay") as HTMLInputElement).value
    );
    const drills = parseInt(
      (document.getElementById("drillsIn60") as HTMLInputElement).value
    );
    const adPay = parseFloat(
      (document.getElementById("adPay") as HTMLInputElement).value
    );
    const adDays = parseInt(
      (document.getElementById("adDays") as HTMLInputElement).value
    );

    const res = await fetch("/api/calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drillPay: drillPay,
        drillsInSixtyDays: drills,
        activeDutyBasicPay: adPay,
        activeDutyDaysInSixtyDays: adDays,
        njpDate: item6Date,
        commanderGradeCategory,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSmcrResult(`Maximum permissible forfeiture: $${data.result.maxForfeiture}`);
    }
  }

  return (
    <ActionCard title="Item 6 - Punishment">
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <strong>Limits ({isFieldGrade ? "Major+" : "Capt/Lt and below"}):</strong>{" "}
        Correctional custody: {limits.custody} days | Extra duties:{" "}
        {limits.extra} days | Restriction: {limits.restriction} days |
        Reduction: next inferior grade only (E6+ cannot be reduced)
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Date of Punishment *
        </label>
        <input
          type="date"
          value={item6Date}
          onChange={(e) => setItem6Date(e.target.value)}
          className="input-field w-48"
        />
      </div>

      {punishments.map((p, idx) => (
        <div
          key={idx}
          className="border border-[var(--color-border)] rounded p-3 mb-3"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-sm">Punishment {idx + 1}</span>
            <button
              type="button"
              onClick={() => removePunishment(idx)}
              className="text-red-600 text-xs hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select
                value={p.type}
                onChange={(e) => updatePunishment(idx, "type", e.target.value)}
                className="input-field"
              >
                <option value="">Select</option>
                <option value="CORRECTIONAL_CUSTODY">
                  Correctional Custody
                </option>
                <option value="FORFEITURE">Forfeiture</option>
                <option value="REDUCTION">Reduction in Grade</option>
                <option value="EXTRA_DUTIES">Extra Duties</option>
                <option value="RESTRICTION">Restriction</option>
                <option value="ARREST_IN_QUARTERS">
                  Arrest in Quarters
                </option>
                <option value="DETENTION_OF_PAY">Detention of Pay</option>
              </select>
            </div>
            {p.type === "FORFEITURE" ? (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Amount (whole $)
                </label>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    updatePunishment(idx, "amount", e.target.value)
                  }
                  className="input-field"
                />
              </div>
            ) : p.type === "REDUCTION" ? (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Reduced to Grade
                </label>
                <select
                  value={p.reducedToGrade}
                  onChange={(e) =>
                    updatePunishment(idx, "reducedToGrade", e.target.value)
                  }
                  className="input-field"
                >
                  <option value="">Select grade</option>
                  {GRADES.filter((g) => g.startsWith("E")).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={p.duration}
                  onChange={(e) =>
                    updatePunishment(idx, "duration", e.target.value)
                  }
                  className="input-field"
                />
              </div>
            )}
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.suspended}
                  onChange={(e) =>
                    updatePunishment(idx, "suspended", e.target.checked)
                  }
                />
                Suspend
              </label>
              {p.suspended && (
                <input
                  type="number"
                  placeholder="Months"
                  value={p.suspensionMonths}
                  onChange={(e) =>
                    updatePunishment(idx, "suspensionMonths", e.target.value)
                  }
                  className="input-field w-24"
                />
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-3 mb-4">
        <button type="button" onClick={addPunishment} className="btn-secondary">
          + Add Punishment
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmit({ noPunishment: true, item6Date, punishments: [] })
          }
          disabled={loading}
          className="btn-danger"
        >
          No Punishment (Destroy Case)
        </button>
      </div>

      {/* SMCR Calculator */}
      {component === "SMCR" && (
        <div className="border border-amber-300 bg-amber-50 rounded p-4 mb-4">
          <h4 className="font-semibold text-amber-800 mb-3">
            SMCR Forfeiture Calculator
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Drill Pay ($)
              </label>
              <input type="number" id="drillPay" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Drills in 60 days
              </label>
              <input type="number" id="drillsIn60" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                AD Basic Pay ($)
              </label>
              <input type="number" id="adPay" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                AD Days in 60 days
              </label>
              <input type="number" id="adDays" className="input-field" />
            </div>
          </div>
          <button
            type="button"
            onClick={calculateSmcr}
            className="btn-secondary mt-3"
          >
            Calculate
          </button>
          {smcrResult && (
            <div className="mt-2 font-bold text-amber-900">{smcrResult}</div>
          )}
        </div>
      )}

      <button
        onClick={() => {
          const formatted = punishments.map((p) => ({
            type: p.type,
            duration: p.duration ? parseInt(p.duration) : undefined,
            amount: p.amount ? parseInt(p.amount) : undefined,
            reducedToGrade: p.reducedToGrade || undefined,
            suspended: p.suspended,
            suspensionMonths: p.suspensionMonths
              ? parseInt(p.suspensionMonths)
              : undefined,
          }));
          onSubmit({ punishments: formatted, item6Date, noPunishment: false });
        }}
        disabled={loading || !item6Date || punishments.length === 0}
        className="btn-primary"
      >
        Submit Punishment
      </button>
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
        <div>
          <label className="block text-sm font-medium mb-1">Full Name *</label>
          <input type="text" id="authName" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input type="text" id="authTitle" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unit *</label>
          <input type="text" id="authUnit" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rank</label>
          <select id="authRank" className="input-field">
            <option value="">Select rank</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Grade</label>
          <select id="authGrade" className="input-field">
            <option value="">Select grade</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">EDIPI</label>
          <input type="text" id="authEdipi" className="input-field" maxLength={10} />
        </div>
      </div>
      <button
        onClick={() => {
          const getValue = (id: string) =>
            (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
          onSubmit({
            authorityName: getValue("authName"),
            authorityTitle: getValue("authTitle"),
            authorityUnit: getValue("authUnit"),
            authorityRank: getValue("authRank"),
            authorityGrade: getValue("authGrade"),
            authorityEdipi: getValue("authEdipi"),
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
