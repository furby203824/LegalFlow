"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { UCMJ_ARTICLES, RANK_GRADE_OPTIONS, RANK_TO_GRADE, GRADES } from "@/types";
import type { Rank } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertOctagon, Info, Plus, Trash2, HelpCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
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
  const [rankGrade, setRankGrade] = useState(""); // combined "E3/LCpl" value
  const [edipi, setEdipi] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [serviceBranch, setServiceBranch] = useState("USMC");
  const [component, setComponent] = useState("ACTIVE");
  const [commanderGrade, setCommanderGrade] = useState("");
  const [vesselException, setVesselException] = useState(false);
  const [jurisdictionConfirmed, setJurisdictionConfirmed] = useState(false);
  const [statuteAck, setStatuteAck] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState<Record<number, boolean>>({});

  const [evidenceItems, setEvidenceItems] = useState<{ type: string; description: string; dateReceived: string; source: string }[]>([]);
  function addEvidenceItem() {
    setEvidenceItems([...evidenceItems, { type: "", description: "", dateReceived: "", source: "" }]);
  }
  function updateEvidenceItem(idx: number, field: string, value: string) {
    const updated = [...evidenceItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setEvidenceItems(updated);
  }
  function removeEvidenceItem(idx: number) {
    setEvidenceItems(evidenceItems.filter((_, i) => i !== idx));
  }

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
        unitFullString: session.unitName || "",
        accusedName: `${lastName}, ${firstName}${middleName ? " " + middleName : ""}`,
        accusedLastName: lastName, accusedFirstName: firstName, accusedMiddleName: middleName || null,
        accusedRank: rank, accusedGrade: grade, accusedEdipi: edipi,
        accusedDateOfBirth: dateOfBirth || null,
        accusedServiceBranch: serviceBranch,
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
      // Add pre-initiation evidence items
      for (const ev of evidenceItems.filter((e) => e.type || e.description)) {
        await casesStore.addEvidence(njpCase.id, {
          evidenceType: ev.type,
          description: ev.description,
          dateReceived: ev.dateReceived,
          source: ev.source,
          preInitiation: true,
          addedBy: session.userId,
          addedByName: session.username,
        });
      }
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
              <Field label="Rank / Grade" required>
                <select className="input-field" value={rankGrade} onChange={(e) => setRankGrade(e.target.value)} required>
                  <option value="">Select rank/grade</option>
                  {RANK_GRADE_OPTIONS.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="EDIPI (10 digits)" required>
                <input className="input-field font-mono" value={edipi} onChange={(e) => setEdipi(e.target.value)} pattern="\d{10}" maxLength={10} required />
              </Field>
              <Field label="Date of Birth">
                <input type="date" className="input-field" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </Field>
              <Field label="Service Branch" required>
                <select className="input-field" value={serviceBranch} onChange={(e) => setServiceBranch(e.target.value)} required>
                  <option value="USMC">USMC</option>
                  <option value="USN">USN</option>
                  <option value="USCG">USCG</option>
                  <option value="USA">USA</option>
                  <option value="USAF">USAF</option>
                  <option value="USSF">USSF</option>
                </select>
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
              {" | "}
              <a href="https://www.jagcnet.army.mil/EBB/#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Electronic Benchbook ↗</a>
            </p>
            {offenses.map((o, oi) => (
              <div key={oi} className="border border-border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Offense {String.fromCharCode(65 + oi)}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((prev) => ({ ...prev, [oi]: !prev[oi] }))}
                      className="btn-ghost text-xs gap-1 text-primary"
                    >
                      <HelpCircle size={14} />
                      Details
                      {detailsOpen[oi] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {offenses.length > 1 && (
                      <button type="button" onClick={() => setOffenses(offenses.filter((_, i) => i !== oi))} className="text-error text-xs hover:underline flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
                {detailsOpen[oi] && (
                  <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-neutral-dark space-y-2">
                    <p className="font-semibold text-sm">Offense Field Guide</p>
                    <div>
                      <span className="font-medium">UCMJ Article:</span> The specific article of the Uniform Code of Military Justice the accused is alleged to have violated (e.g., Article 86 — Absence without leave, Article 92 — Failure to obey order). Select the article that most closely matches the misconduct.
                    </div>
                    <div>
                      <span className="font-medium">Offense Type:</span> A short label describing the nature of the offense (e.g., &quot;UA&quot;, &quot;Drunk on duty&quot;, &quot;Assault consummated by battery&quot;). This appears on the NAVMC 10132 and charge sheet.
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> The date the offense was committed. For continuing offenses (e.g., UA), use the start date. The exact date must match the charge sheet specification.
                    </div>
                    <div>
                      <span className="font-medium">Place:</span> The location where the offense occurred, including the installation or ship name if applicable (e.g., &quot;Camp Lejeune, NC&quot; or &quot;USS Wasp (LHD-1)&quot;).
                    </div>
                    <div>
                      <span className="font-medium">Summary:</span> A brief, factual description of the alleged misconduct. <span className="text-error font-medium">Do not include victim PII</span> (names, SSNs, etc.). Focus on what the accused did, when, and where.
                    </div>
                    <div>
                      <span className="font-medium">Victim Demographics:</span> Required for reporting purposes per MCO 5800.16. If there is no identifiable victim, leave as &quot;Unknown.&quot; Demographics do not appear on case documents — they are used for aggregate reporting only.
                    </div>
                  </div>
                )}
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

          {/* Evidence Checklist */}
          <Section title="Pre-Initiation Evidence" action={
            <button type="button" onClick={addEvidenceItem} className="btn-ghost text-xs gap-1">
              <Plus size={14} /> Add Evidence
            </button>
          }>
            <p className="text-xs text-neutral-mid mb-3 flex items-center gap-1">
              <FileText size={12} /> Document evidence collected before initiating NJP. Items can be updated after case creation.
            </p>
            {evidenceItems.length === 0 && (
              <p className="text-sm text-neutral-mid py-4 text-center">No evidence items added yet.</p>
            )}
            {evidenceItems.map((ev, ei) => (
              <div key={ei} className="border border-border rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <FileText size={14} className="text-primary" /> Evidence {ei + 1}
                  </h4>
                  <button type="button" onClick={() => removeEvidenceItem(ei)} className="text-error text-xs hover:underline flex items-center gap-1">
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Type">
                    <select className="input-field" value={ev.type} onChange={(e) => updateEvidenceItem(ei, "type", e.target.value)}>
                      <option value="">Select type</option>
                      <option value="WITNESS_STATEMENT">Witness Statement</option>
                      <option value="PHYSICAL_EVIDENCE">Physical Evidence</option>
                      <option value="DOCUMENTARY">Documentary Evidence</option>
                      <option value="DIGITAL_EVIDENCE">Digital Evidence</option>
                      <option value="PHOTOGRAPHS">Photographs/Video</option>
                      <option value="MEDICAL_RECORDS">Medical Records</option>
                      <option value="SERVICE_RECORDS">Service Records</option>
                      <option value="LAW_ENFORCEMENT">Law Enforcement Report</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </Field>
                  <Field label="Date Received">
                    <input type="date" className="input-field" value={ev.dateReceived} onChange={(e) => updateEvidenceItem(ei, "dateReceived", e.target.value)} />
                  </Field>
                  <Field label="Source">
                    <input className="input-field" value={ev.source} onChange={(e) => updateEvidenceItem(ei, "source", e.target.value)} placeholder="e.g., SSgt Smith, PMO, medical" />
                  </Field>
                  <Field label="Description">
                    <input className="input-field" value={ev.description} onChange={(e) => updateEvidenceItem(ei, "description", e.target.value)} placeholder="Brief description of evidence" />
                  </Field>
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
