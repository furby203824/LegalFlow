"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { UCMJ_ARTICLES, RANK_GRADE_OPTIONS_BY_BRANCH, GRADES } from "@/types";
import type { ServiceBranch } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertOctagon, Info, Plus, Trash2 } from "lucide-react";
import { casesStore, caseWithIncludes, auditStore } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCommanderGradeLevel } from "@/types";
import type { Grade } from "@/types";

const VICTIM_STATUSES = [
  "Military", "Military (spouse)", "Civilian (spouse)", "Civilian (dependent)",
  "Civilian (DON employee)", "Civilian (other)", "Other", "Unknown",
];
const VICTIM_SEXES = ["Male", "Female", "Unknown"];
const VICTIM_RACES = [
  "American Indian or Alaskan Native", "Asian", "Black or African American",
  "Native Hawaiian or Other Pacific Islander", "White", "Other", "Unknown",
];
const VICTIM_ETHNICITIES = ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown"];

interface OffenseInput {
  ucmjArticle: string;
  offenseType: string;
  summary: string;
  offenseDate: string;
  offensePlace: string;
  victims: { status: string; sex: string; race: string; ethnicity: string }[];
}

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [branch, setBranch] = useState<ServiceBranch>("USMC");
  const [rankGrade, setRankGrade] = useState(""); // combined "E3/LCpl" value
  const [edipi, setEdipi] = useState("");
  const [unit, setUnit] = useState("");
  const [component, setComponent] = useState("ACTIVE");
  const [commanderGrade, setCommanderGrade] = useState("");
  const [vesselException, setVesselException] = useState(false);
  const [jurisdictionConfirmed, setJurisdictionConfirmed] = useState(false);
  const [statuteAck, setStatuteAck] = useState(false);

  const [offenses, setOffenses] = useState<OffenseInput[]>([{
    ucmjArticle: "", offenseType: "", summary: "", offenseDate: "", offensePlace: "",
    victims: [{ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }],
  }]);

  // Parse rank and grade from combined value like "E3/LCpl"
  const rank = rankGrade ? rankGrade.split("/")[1] : "";
  const grade = rankGrade ? rankGrade.split("/")[0] : "";

  function updateOffense(idx: number, field: keyof OffenseInput, value: string) {
    const updated = [...offenses];
    if (field !== "victims") updated[idx] = { ...updated[idx], [field]: value };
    setOffenses(updated);
  }

  function updateVictim(oi: number, vi: number, field: string, value: string) {
    const updated = [...offenses];
    updated[oi].victims[vi] = { ...updated[oi].victims[vi], [field]: value };
    setOffenses(updated);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]); setWarnings([]); setLoading(true);
    const letters = ["A", "B", "C", "D", "E"];

    try {
      const session = getSession();
      if (!session) { setErrors(["Not authenticated"]); return; }
      const cmdGradeLevel = getCommanderGradeLevel(commanderGrade as Grade);
      const uaApplicable = offenses.some((o) => o.ucmjArticle === "85" || o.ucmjArticle === "86");
      const offenseDates = offenses.map((o) => o.offenseDate).filter(Boolean).sort();
      const offenseRecords = offenses.map((o, i) => ({
        id: `off-${Date.now()}-${letters[i]}`,
        offenseLetter: letters[i],
        ucmjArticle: o.ucmjArticle,
        offenseType: o.offenseType,
        offenseSummary: o.summary,
        offenseDate: o.offenseDate,
        offensePlace: o.offensePlace,
        finding: null,
        locked: false,
      }));
      const victimRecords = offenses.flatMap((o, i) =>
        (o.victims || []).map((v: { status: string; sex: string; race: string; ethnicity: string }) => ({
          id: `v-${Date.now()}-${letters[i]}`,
          offenseId: offenseRecords[i].id,
          victimLetter: letters[i],
          victimStatus: v.status,
          victimSex: v.sex,
          victimRace: v.race,
          victimEthnicity: v.ethnicity,
          locked: false,
        }))
      );
      const caseCount = await casesStore.count((c) => c.caseNumber?.startsWith(`CASE-${new Date().getFullYear()}`));
      const caseNumber = `CASE-${new Date().getFullYear()}-${String(caseCount + 1).padStart(4, "0")}`;
      const njpCase = await casesStore.create({
        caseNumber,
        status: "INITIATED",
        currentPhase: "INITIATION",
        unitId: session.unitId,
        unitFullString: unit,
        accusedName: `${lastName}, ${firstName}${middleName ? " " + middleName : ""}`,
        accusedLastName: lastName, accusedFirstName: firstName, accusedMiddleName: middleName || null,
        accusedRank: rank, accusedGrade: grade, accusedEdipi: edipi,
        component: component || "ACTIVE",
        vesselException: vesselException || false,
        commanderGradeLevel: cmdGradeLevel,
        jurisdictionConfirmed,
        uaApplicable,
        offenseDateEarliest: offenseDates[0] || null,
        formLocked: false, jaReviewRequired: false, jaReviewComplete: false,
        njpDate: null, appealNotFiled: false, accusedTransferred: false,
        initiatedById: session.userId,
        offenses: offenseRecords,
        victims: victimRecords,
      });
      await auditStore.append({
        caseId: njpCase.id, caseNumber, userId: session.userId,
        userRole: session.role, userName: session.username,
        action: "INSERT", notes: `Case ${caseNumber} initiated`,
      });
      router.push(`/cases/view?id=${njpCase.id}`);
    } catch (err) { setErrors([err instanceof Error ? err.message : "Error creating case"]); } finally { setLoading(false); }
  }

  const gradeLevel = commanderGrade && GRADES.indexOf(commanderGrade as typeof GRADES[number]) >= GRADES.indexOf("O4")
    ? "Field Grade and Above (O-4+)" : "Company Grade (O-3 and below)";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-dark mb-6">
          New NJP Case
        </h1>

        {errors.length > 0 && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-6">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-error">
                <AlertOctagon size={16} className="shrink-0 mt-0.5" /> {e}
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4 mb-6">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {w}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Accused */}
          <Section title="Accused Information">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Last Name" required>
                <input className="input-field" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </Field>
              <Field label="First Name" required>
                <input className="input-field" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </Field>
              <Field label="Middle Name">
                <input className="input-field" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </Field>
              <Field label="Branch" required>
                <select className="input-field" value={branch} onChange={(e) => { setBranch(e.target.value as ServiceBranch); setRankGrade(""); }}>
                  <option value="USMC">USMC</option>
                  <option value="USN">USN</option>
                </select>
              </Field>
              <Field label="Rank / Grade" required>
                <select className="input-field" value={rankGrade} onChange={(e) => setRankGrade(e.target.value)} required>
                  <option value="">Select rank/grade</option>
                  {RANK_GRADE_OPTIONS_BY_BRANCH[branch].map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="EDIPI (10 digits)" required>
                <input className="input-field font-mono" value={edipi} onChange={(e) => setEdipi(e.target.value)} pattern="\d{10}" maxLength={10} required />
              </Field>
              <div className="sm:col-span-3">
                <Field label="Component" required>
                  <div className="flex gap-6">
                    {[{ v: "ACTIVE", l: "Active Duty" }, { v: "SMCR", l: "SMCR" }, { v: "IRR", l: "IRR" }].map((c) => (
                      <label key={c.v} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="component" value={c.v} checked={component === c.v} onChange={(e) => setComponent(e.target.value)} />
                        {c.l}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </Section>

          {/* Unit */}
          <Section title="Unit">
            <Field label="Unit (company-sized up to first GCMCA command)" required>
              <input className="input-field" value={unit} onChange={(e) => setUnit(e.target.value)} required placeholder="e.g., A Co., 1st Bn, 7th Mar, 1st MARDIV" />
            </Field>
          </Section>

          {/* NJP Authority */}
          <Section title="NJP Authority">
            <Field label="Commander Grade Level" required>
              <div className="flex flex-col gap-3">
                {[
                  { v: "O3", l: "Company Grade (O-3 and below)", desc: "Limits: Custody 7d, Forfeiture 7d pay, Extra 14d, Restriction 14d" },
                  { v: "O4", l: "Field Grade and Above (O-4+, all WO)", desc: "Limits: Custody 30d, Forfeiture 2mo half pay, Extra 45d, Restriction 60d" },
                ].map((opt) => (
                  <label key={opt.v} className={cn(
                    "flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                    commanderGrade === opt.v ? "border-primary bg-blue-50" : "border-border hover:bg-surface"
                  )}>
                    <input type="radio" name="cmdGrade" value={opt.v} checked={commanderGrade === opt.v} onChange={(e) => setCommanderGrade(e.target.value)} className="mt-1" />
                    <div>
                      <div className="text-sm font-medium">{opt.l}</div>
                      <div className="text-xs text-neutral-mid mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-neutral-mid mt-2">
                This selection sets punishment limits and cannot be changed after case creation.
              </p>
            </Field>
          </Section>

          {/* Offenses */}
          <Section title="Offenses" action={offenses.length < 5 ? (
            <button type="button" onClick={() => setOffenses([...offenses, { ucmjArticle: "", offenseType: "", summary: "", offenseDate: "", offensePlace: "", victims: [{ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }] }])} className="btn-ghost text-xs gap-1">
              <Plus size={14} /> Add Offense
            </button>
          ) : undefined}>
            <p className="text-xs text-neutral-mid mb-1 flex items-center gap-1">
              <Info size={12} /> Do not include victim PII in offense summaries.
            </p>
            {offenses.map((o, oi) => (
              <div key={oi} className="border border-border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Offense {String.fromCharCode(65 + oi)}</h4>
                  {offenses.length > 1 && (
                    <button type="button" onClick={() => setOffenses(offenses.filter((_, i) => i !== oi))} className="text-error text-xs hover:underline flex items-center gap-1">
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="UCMJ Article" required>
                    <select className="input-field" value={o.ucmjArticle} onChange={(e) => updateOffense(oi, "ucmjArticle", e.target.value)} required>
                      <option value="">Select article</option>
                      {UCMJ_ARTICLES.map((a) => <option key={a} value={a}>Article {a}</option>)}
                    </select>
                  </Field>
                  <Field label="Offense Type" required>
                    <input className="input-field" value={o.offenseType} onChange={(e) => updateOffense(oi, "offenseType", e.target.value)} required />
                  </Field>
                  <Field label="Date" required>
                    <input type="date" className="input-field" value={o.offenseDate} onChange={(e) => updateOffense(oi, "offenseDate", e.target.value)} required />
                  </Field>
                  <Field label="Place" required>
                    <input className="input-field" value={o.offensePlace} onChange={(e) => updateOffense(oi, "offensePlace", e.target.value)} required />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Summary" required>
                      <textarea className="input-field h-16" value={o.summary} onChange={(e) => updateOffense(oi, "summary", e.target.value)} required />
                    </Field>
                  </div>
                </div>

                {/* Victim Demographics */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-mid">Victim Demographics</span>
                    {o.victims.length < 5 && (
                      <button type="button" onClick={() => { const u = [...offenses]; u[oi].victims.push({ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }); setOffenses(u); }} className="text-xs text-primary hover:underline">
                        + Add Victim
                      </button>
                    )}
                  </div>
                  {o.victims.map((v, vi) => (
                    <div key={vi} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                      <select className="input-field text-xs" value={v.status} onChange={(e) => updateVictim(oi, vi, "status", e.target.value)}>
                        {VICTIM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="input-field text-xs" value={v.sex} onChange={(e) => updateVictim(oi, vi, "sex", e.target.value)}>
                        {VICTIM_SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="input-field text-xs" value={v.race} onChange={(e) => updateVictim(oi, vi, "race", e.target.value)}>
                        {VICTIM_RACES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select className="input-field text-xs" value={v.ethnicity} onChange={(e) => updateVictim(oi, vi, "ethnicity", e.target.value)}>
                        {VICTIM_ETHNICITIES.map((et) => <option key={et} value={et}>{et}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          {/* Vessel Exception */}
          <Section title="Vessel Exception">
            <label className={cn(
              "flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors",
              vesselException ? "border-primary bg-blue-50" : "border-border"
            )}>
              <input type="checkbox" checked={vesselException} onChange={(e) => setVesselException(e.target.checked)} className="mt-1" />
              <div>
                <div className="text-sm font-medium">Accused is attached to or embarked upon a naval vessel</div>
                {vesselException && (
                  <p className="text-xs text-info mt-1">
                    The right to demand trial by court-martial does not apply. Item 2 will reflect vessel exception language.
                  </p>
                )}
              </div>
            </label>
          </Section>

          {/* System Checks */}
          <Section title="System Checks">
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md cursor-pointer">
                <input type="checkbox" checked={jurisdictionConfirmed} onChange={(e) => setJurisdictionConfirmed(e.target.checked)} required className="mt-1" />
                <span className="text-sm">
                  I confirm the accused is assigned or attached to this command and that this command has jurisdiction to impose Non-Judicial Punishment. <span className="text-error">*</span>
                </span>
              </label>
            </div>
          </Section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => router.push("/dashboard")} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating..." : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-neutral-dark">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-dark mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
    </div>
  );
}
