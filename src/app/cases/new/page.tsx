"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { UCMJ_ARTICLES, UCMJ_ARTICLE_NAMES, ucmjOffenseName, ucmjArticleNumber, RANK_GRADE_OPTIONS, USMC_RANK_GRADE_OPTIONS, NAVY_RANK_GRADE_OPTIONS, RANK_TO_GRADE, GRADES } from "@/types";
import type { Rank, ServiceBranch } from "@/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertOctagon, Info, Plus, Trash2, HelpCircle, ChevronDown, ChevronUp, FileText, RefreshCw } from "lucide-react";
import { casesStore, caseWithIncludes, auditStore } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCommanderGradeLevel } from "@/types";
import type { Grade } from "@/types";
import { getUnit } from "@/lib/units";

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

// --- Random accused generator (simulates MCTFS pull) ---
const FIRST_NAMES = [
  "James", "John", "Robert", "Michael", "David", "William", "Joseph", "Charles",
  "Thomas", "Daniel", "Matthew", "Anthony", "Joshua", "Andrew", "Christopher",
  "Ryan", "Brandon", "Justin", "Kevin", "Tyler", "Austin", "Jacob", "Ethan",
  "Nathan", "Marcus", "Carlos", "Diego", "Luis", "Miguel", "Jose",
  "Maria", "Jessica", "Ashley", "Jennifer", "Sarah", "Amanda", "Brittany",
  "Stephanie", "Nicole", "Samantha", "Elizabeth", "Lauren", "Megan", "Rachel",
  "Emily", "Alexis", "Victoria", "Destiny", "Jasmine", "Brianna",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
  "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
  "Campbell", "Mitchell", "Carter", "Roberts",
];
const MIDDLE_NAMES = [
  "A", "B", "C", "D", "E", "J", "L", "M", "N", "R", "T", "W",
  "Lee", "Ray", "James", "Michael", "Ann", "Marie", "Lynn", "Rose", "",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomAccused() {
  const branch: ServiceBranch = Math.random() < 0.7 ? "USMC" : "USN";
  // Only enlisted ranks (E1-E9)
  const enlistedOptions = (branch === "USMC" ? USMC_RANK_GRADE_OPTIONS : NAVY_RANK_GRADE_OPTIONS)
    .filter((o) => o.grade.startsWith("E"));
  const rankOpt = pick(enlistedOptions);
  const edipi = String(Math.floor(1000000000 + Math.random() * 9000000000));
  return {
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    middleName: pick(MIDDLE_NAMES),
    rankGrade: rankOpt.label,
    edipi,
    serviceBranch: branch,
  };
}

// Simulate MCTFS DOB lookup — generate realistic DOB based on grade
function generateDOB(g: string): string {
  const ageRanges: Record<string, [number, number]> = {
    E1: [18, 21], E2: [18, 22], E3: [18, 23], E4: [20, 27], E5: [22, 30],
    E6: [26, 35], E7: [30, 40], E8: [34, 45], E9: [38, 50],
    W1: [26, 35], W2: [28, 38], W3: [32, 42], W4: [36, 48], W5: [40, 52],
    O1: [22, 28], O2: [24, 30], O3: [26, 34], O4: [30, 40], O5: [34, 45], O6: [38, 50],
  };
  const [minAge, maxAge] = ageRanges[g] || [20, 30];
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Simulate MCTFS AFADBD lookup — generate realistic Active Federal Active
// Duty Base Date based on grade (years of service ranges by pay grade)
function generateAFADBD(g: string): string {
  // Typical years-of-service ranges for each enlisted/officer grade
  const yosRanges: Record<string, [number, number]> = {
    E1: [0, 1],   E2: [0, 1],    E3: [1, 3],    E4: [2, 5],    E5: [4, 8],
    E6: [6, 12],  E7: [10, 18],  E8: [14, 22],  E9: [18, 28],
    W1: [6, 12],  W2: [8, 16],   W3: [12, 20],  W4: [16, 24],  W5: [20, 28],
    O1: [0, 2],   O2: [2, 4],    O3: [4, 8],    O4: [8, 14],   O5: [14, 20], O6: [18, 26],
  };
  const [minYos, maxYos] = yosRanges[g] || [2, 6];
  const yos = minYos + Math.random() * (maxYos - minYos);
  const now = new Date();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const afadbdDate = new Date(now.getTime() - yos * msPerYear);
  const year = afadbdDate.getFullYear();
  const month = afadbdDate.getMonth() + 1;
  const day = afadbdDate.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface OffenseInput {
  ucmjArticle: string;
  offenseType: string;
  summary: string;
  offenseDate: string;
  offenseTime: string;
  onOrAbout: boolean;
  hasDuration: boolean;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  offensePlace: string;
  victims: { status: string; sex: string; race: string; ethnicity: string }[];
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMilDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${MONTH_ABBR[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function calcDuration(fromDate: string, fromTime: string, toDate: string, toTime: string): { valid: boolean; days: number; hours: number; totalHours: number; label: string } {
  if (!fromDate || !fromTime || !toDate || !toTime) return { valid: false, days: 0, hours: 0, totalHours: 0, label: "" };
  const from = new Date(`${fromDate}T${fromTime}`);
  const to = new Date(`${toDate}T${toTime}`);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return { valid: false, days: 0, hours: 0, totalHours: 0, label: "" };
  const diffMs = to.getTime() - from.getTime();
  if (diffMs < 0) return { valid: false, days: 0, hours: 0, totalHours: 0, label: "TO datetime cannot precede FROM datetime" };
  const totalHours = diffMs / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days === 0 && hours === 0) return { valid: true, days: 0, hours: 0, totalHours: 0, label: "Duration: instantaneous (same FROM and TO)" };
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  return { valid: true, days, hours, totalHours, label: `Duration: ${parts.join(", ")}` };
}

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [initial] = useState(() => generateRandomAccused());
  const [lastName, setLastName] = useState(initial.lastName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [middleName, setMiddleName] = useState(initial.middleName);
  const [rankGrade, setRankGrade] = useState(initial.rankGrade);
  const [edipi, setEdipi] = useState(initial.edipi);
  const [afadbd, setAfadbd] = useState(() => {
    const g = initial.rankGrade ? initial.rankGrade.split("/")[0] : "";
    return g ? generateAFADBD(g) : "";
  });
  const [serviceBranch, setServiceBranch] = useState(initial.serviceBranch as string);
  const [component, setComponent] = useState("ACTIVE");
  const [commanderGrade, setCommanderGrade] = useState(() => {
    const s = getSession();
    if (!s) return "";
    const unit = getUnit(s.unitId);
    return unit?.echelon === "COMPANY" ? "O3" : unit?.echelon === "BATTALION" ? "O4" : "";
  });
  const [vesselException, setVesselException] = useState(false);
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
    ucmjArticle: "", offenseType: "", summary: "", offenseDate: "", offenseTime: "", onOrAbout: true, hasDuration: false, fromDate: "", fromTime: "", toDate: "", toTime: "", offensePlace: "",
    victims: [{ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }],
  }]);

  // Parse rank and grade from combined value like "E3/LCpl"
  const rank = rankGrade ? rankGrade.split("/")[1] : "";
  const grade = rankGrade ? rankGrade.split("/")[0] : "";

  // Re-roll all accused fields (simulates pulling a different SM from MCTFS)
  function regenerateAccused() {
    const a = generateRandomAccused();
    setLastName(a.lastName);
    setFirstName(a.firstName);
    setMiddleName(a.middleName);
    setRankGrade(a.rankGrade);
    setEdipi(a.edipi);
    setServiceBranch(a.serviceBranch);
    const g = a.rankGrade ? a.rankGrade.split("/")[0] : "";
    setAfadbd(g ? generateAFADBD(g) : "");
  }

  // Enlisted rank options filtered by current service branch
  const enlistedRankOptions = (serviceBranch === "USN" ? NAVY_RANK_GRADE_OPTIONS : USMC_RANK_GRADE_OPTIONS)
    .filter((o) => o.grade.startsWith("E"));

  // When service branch changes, reset rank if current rank is not valid for the new branch
  function handleBranchChange(newBranch: string) {
    setServiceBranch(newBranch);
    const validOptions = (newBranch === "USN" ? NAVY_RANK_GRADE_OPTIONS : USMC_RANK_GRADE_OPTIONS)
      .filter((o) => o.grade.startsWith("E"));
    if (!validOptions.some((o) => o.label === rankGrade)) {
      setRankGrade("");
    }
  }

  function updateOffense(idx: number, field: keyof OffenseInput, value: string, extraFields?: Partial<OffenseInput>) {
    const updated = [...offenses];
    if (field !== "victims") updated[idx] = { ...updated[idx], [field]: value, ...extraFields };
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
      const offenseDates = offenses.map((o) => o.hasDuration ? o.fromDate : o.offenseDate).filter(Boolean).sort();
      const offenseRecords = offenses.map((o, i) => ({
        id: `off-${Date.now()}-${letters[i]}`,
        offenseLetter: letters[i],
        ucmjArticle: o.ucmjArticle,
        offenseType: o.offenseType,
        offenseSummary: o.summary,
        offenseDate: o.hasDuration ? o.fromDate : o.offenseDate,
        offenseTime: o.hasDuration ? o.fromTime : o.offenseTime,
        onOrAbout: o.onOrAbout,
        ...(o.hasDuration ? { fromDate: o.fromDate, fromTime: o.fromTime, toDate: o.toDate, toTime: o.toTime } : {}),
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
        accusedDateOfBirth: generateDOB(grade),
        accusedAfadbd: afadbd || generateAFADBD(grade) || null,
        accusedServiceBranch: serviceBranch,
        component: component || "ACTIVE",
        vesselException: vesselException || false,
        commanderGradeLevel: cmdGradeLevel,
        jurisdictionConfirmed: true,
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
          <Section title="Accused Information" action={
            <button type="button" onClick={regenerateAccused} className="btn-ghost text-xs gap-1">
              <RefreshCw size={14} /> Randomize
            </button>
          }>
            <p className="text-xs text-neutral-mid mb-3 flex items-center gap-1">
              <Info size={12} /> Accused data auto-generated to simulate MCTFS pull. Only enlisted USMC/USN personnel are eligible for NJP.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Last Name" required>
                <input className="input-underline" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </Field>
              <Field label="First Name" required>
                <input className="input-underline" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </Field>
              <Field label="Middle Name">
                <input className="input-underline" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </Field>
              <Field label="Rank / Grade" required>
                <select className="input-underline" value={rankGrade} onChange={(e) => { setRankGrade(e.target.value); const g = e.target.value ? e.target.value.split("/")[0] : ""; setAfadbd(g ? generateAFADBD(g) : ""); }} required>
                  <option value="">Select rank/grade</option>
                  {enlistedRankOptions.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="EDIPI (10 digits)" required>
                <input className="input-underline font-mono" value={edipi} onChange={(e) => setEdipi(e.target.value)} pattern="\d{10}" maxLength={10} required />
              </Field>
              <Field label="AFADBD">
                <input type="date" className="input-underline" value={afadbd} onChange={(e) => setAfadbd(e.target.value)} />
              </Field>
              <Field label="Service Branch" required>
                <select className="input-underline" value={serviceBranch} onChange={(e) => handleBranchChange(e.target.value)} required>
                  <option value="USMC">USMC</option>
                  <option value="USN">USN</option>
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
            <Field label="Commander Grade Level">
              <div className={cn(
                "rounded-md border p-3",
                commanderGrade === "O3" ? "border-primary bg-blue-50" : commanderGrade === "O4" ? "border-primary bg-blue-50" : "border-border"
              )}>
                <div className="text-sm font-medium">
                  {commanderGrade === "O3"
                    ? "Company Grade (O-3 and below) — reduction not authorized at NJP"
                    : "Field Grade and above (Major and above) — reduction authorized for eligible grades"}
                </div>
                <div className="text-xs text-neutral-mid mt-0.5">
                  {commanderGrade === "O3"
                    ? "Limits: Custody 7d, Forfeiture 7d pay, Extra 14d, Restriction 14d. No reduction authority."
                    : "Limits: Custody 30d, Forfeiture 2mo half pay, Extra 45d, Restriction 60d. Reduction eligible per grade."}
                </div>
              </div>
              <p className="text-xs text-neutral-mid mt-2">
                Automatically set based on your unit level. Punishment limits are locked at case creation.
              </p>
            </Field>
          </Section>

          {/* Offenses */}
          <Section title="Offenses">
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
                      <span className="font-medium">Date / Time:</span> The date and military time the offense occurred. For Art. 85/86 (desertion/UA), a FROM and TO datetime pair is required to capture the absence period. Duration is calculated automatically.
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
                    <select className="input-underline" value={o.ucmjArticle} onChange={(e) => { const art = e.target.value; const artNum = ucmjArticleNumber(art); updateOffense(oi, "ucmjArticle", art, { offenseType: ucmjOffenseName(art), ...(artNum === "85" || artNum === "86" ? { hasDuration: true } : {}) }); }} required>
                      <option value="">Select article</option>
                      {UCMJ_ARTICLES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                  <Field label="Offense Type" required>
                    <input className="input-underline" value={o.offenseType} onChange={(e) => updateOffense(oi, "offenseType", e.target.value)} required readOnly />
                  </Field>

                  {/* "On or about" toggle */}
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={o.onOrAbout} onChange={(e) => updateOffense(oi, "onOrAbout", String(e.target.checked), { onOrAbout: e.target.checked })} />
                      On or about
                      <span className="text-neutral-mid">&mdash; adds &ldquo;on or about&rdquo; before the date on the UPB</span>
                    </label>
                  </div>

                  {/* Date/Time — single or FROM/TO range based on hasDuration toggle */}
                  {o.hasDuration ? (
                    <>
                      <Field label="FROM Date" required>
                        <input type="date" className="input-underline" value={o.fromDate} onChange={(e) => updateOffense(oi, "fromDate", e.target.value)} required />
                      </Field>
                      <Field label="FROM Time" required>
                        <input type="time" className="input-underline" value={o.fromTime} onChange={(e) => updateOffense(oi, "fromTime", e.target.value)} required />
                      </Field>
                      <Field label="TO Date" required>
                        <input type="date" className="input-underline" value={o.toDate} onChange={(e) => updateOffense(oi, "toDate", e.target.value)} required />
                      </Field>
                      <Field label="TO Time" required>
                        <input type="time" className="input-underline" value={o.toTime} onChange={(e) => updateOffense(oi, "toTime", e.target.value)} required />
                      </Field>
                      {/* Duration display */}
                      {(() => {
                        const dur = calcDuration(o.fromDate, o.fromTime, o.toDate, o.toTime);
                        if (!o.fromDate || !o.fromTime || !o.toDate || !o.toTime) return null;
                        return (
                          <div className="sm:col-span-2">
                            <div className={cn("text-xs px-3 py-2 rounded-md", dur.valid ? "bg-blue-50 text-primary" : "bg-red-50 text-error")}>
                              {dur.label}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Allow removing duration (unless Art 85/86 which requires it) */}
                      {o.ucmjArticle !== "85" && o.ucmjArticle !== "86" && (
                        <div className="sm:col-span-2">
                          <button type="button" onClick={() => updateOffense(oi, "ucmjArticle", o.ucmjArticle, { hasDuration: false, offenseDate: o.fromDate, offenseTime: o.fromTime })} className="text-xs text-primary hover:underline">
                            Remove duration
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Field label="Date" required>
                        <input type="date" className="input-underline" value={o.offenseDate} onChange={(e) => updateOffense(oi, "offenseDate", e.target.value)} required />
                      </Field>
                      <Field label="Time" required>
                        <input type="time" className="input-underline" value={o.offenseTime} onChange={(e) => updateOffense(oi, "offenseTime", e.target.value)} required />
                      </Field>
                      <div className="sm:col-span-2">
                        <button type="button" onClick={() => updateOffense(oi, "ucmjArticle", o.ucmjArticle, { hasDuration: true, fromDate: o.offenseDate, fromTime: o.offenseTime })} className="text-xs text-primary hover:underline">
                          + Add duration
                        </button>
                      </div>
                    </>
                  )}

                  <Field label="Place" required>
                    <input className="input-underline" value={o.offensePlace} onChange={(e) => updateOffense(oi, "offensePlace", e.target.value)} required placeholder="Unit and installation (e.g., Co A, 1st Bn, 7th Mar, MCB Camp Pendleton)" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Summary" required>
                      <textarea className="input-underline h-16" value={o.summary} onChange={(e) => updateOffense(oi, "summary", e.target.value)} required />
                    </Field>
                  </div>
                </div>

                {/* Item 5 — UA Data auto-fill for Art 85/86 with duration > 24h */}
                {(() => {
                  if (o.ucmjArticle !== "85" && o.ucmjArticle !== "86") return null;
                  if (!o.hasDuration) return null;
                  const dur = calcDuration(o.fromDate, o.fromTime, o.toDate, o.toTime);
                  if (!dur.valid || dur.totalHours <= 24) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-xs font-semibold text-neutral-dark mb-2">
                        Item 5 — UA Data (Auto-populated)
                      </div>
                      <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-3 font-mono">
                        UA dur the prd {o.fromTime?.replace(":", "")}, {fmtMilDate(o.fromDate)} through {o.toTime?.replace(":", "")}, {fmtMilDate(o.toDate)}.
                      </div>
                    </div>
                  );
                })()}

                {/* Victim Demographics */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-neutral-mid">Victim Demographics</span>
                  </div>
                  {o.victims.map((v, vi) => (
                    <div key={vi} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                      <select className="input-underline text-xs" value={v.status} onChange={(e) => updateVictim(oi, vi, "status", e.target.value)}>
                        {VICTIM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="input-underline text-xs" value={v.sex} onChange={(e) => updateVictim(oi, vi, "sex", e.target.value)}>
                        {VICTIM_SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="input-underline text-xs" value={v.race} onChange={(e) => updateVictim(oi, vi, "race", e.target.value)}>
                        {VICTIM_RACES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select className="input-underline text-xs" value={v.ethnicity} onChange={(e) => updateVictim(oi, vi, "ethnicity", e.target.value)}>
                        {VICTIM_ETHNICITIES.map((et) => <option key={et} value={et}>{et}</option>)}
                      </select>
                    </div>
                  ))}
                  {o.victims.length < 5 && (
                    <button type="button" onClick={() => { const u = [...offenses]; u[oi].victims.push({ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }); setOffenses(u); }} className="text-xs text-primary hover:underline mt-1">
                      + Add Victim
                    </button>
                  )}
                </div>
              </div>
            ))}
            {offenses.length < 5 && (
              <button type="button" onClick={() => setOffenses([...offenses, { ucmjArticle: "", offenseType: "", summary: "", offenseDate: "", offenseTime: "", onOrAbout: true, hasDuration: false, fromDate: "", fromTime: "", toDate: "", toTime: "", offensePlace: "", victims: [{ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }] }])} className="btn-ghost text-xs gap-1 mt-2">
                <Plus size={14} /> Add Offense
              </button>
            )}
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
                    <select className="input-underline" value={ev.type} onChange={(e) => updateEvidenceItem(ei, "type", e.target.value)}>
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
                    <input type="date" className="input-underline" value={ev.dateReceived} onChange={(e) => updateEvidenceItem(ei, "dateReceived", e.target.value)} />
                  </Field>
                  <Field label="Source">
                    <input className="input-underline" value={ev.source} onChange={(e) => updateEvidenceItem(ei, "source", e.target.value)} placeholder="e.g., SSgt Smith, PMO, medical" />
                  </Field>
                  <Field label="Description">
                    <input className="input-underline" value={ev.description} onChange={(e) => updateEvidenceItem(ei, "description", e.target.value)} placeholder="Brief description of evidence" />
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
