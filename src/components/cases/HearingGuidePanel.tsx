"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Check, Printer, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { updateHearingRecord } from "@/services/api";
import { PUNISHMENT_LIMITS, getMaxForfeiture } from "@/types";
import type { CommanderGradeLevel } from "@/types";
import MastScriptPrint from "./MastScriptPrint";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

// ── Grade code to full rank name ──

const GRADE_TO_FULL_RANK: Record<string, string> = {
  // USMC Enlisted
  Pvt: "Private", PFC: "Private First Class", LCpl: "Lance Corporal",
  Cpl: "Corporal", Sgt: "Sergeant", SSgt: "Staff Sergeant",
  GySgt: "Gunnery Sergeant", MSgt: "Master Sergeant", "1stSgt": "First Sergeant",
  MGySgt: "Master Gunnery Sergeant", SgtMaj: "Sergeant Major",
  // USN Enlisted
  SR: "Seaman Recruit", SA: "Seaman Apprentice", SN: "Seaman",
  PO3: "Petty Officer Third Class", PO2: "Petty Officer Second Class",
  PO1: "Petty Officer First Class", CPO: "Chief Petty Officer",
  SCPO: "Senior Chief Petty Officer", MCPO: "Master Chief Petty Officer",
  // Warrant Officers
  WO: "Warrant Officer", WO1: "Warrant Officer One",
  CWO2: "Chief Warrant Officer Two", CWO3: "Chief Warrant Officer Three",
  CWO4: "Chief Warrant Officer Four", CWO5: "Chief Warrant Officer Five",
  // USMC Officers
  "2ndLt": "Second Lieutenant", "1stLt": "First Lieutenant",
  Capt: "Captain", Maj: "Major", LtCol: "Lieutenant Colonel",
  Col: "Colonel", BGen: "Brigadier General", MajGen: "Major General",
  LtGen: "Lieutenant General", Gen: "General",
  // USN Officers
  ENS: "Ensign", LTJG: "Lieutenant Junior Grade", LT: "Lieutenant",
  LCDR: "Lieutenant Commander", CDR: "Commander", CAPT: "Captain",
  RDML: "Rear Admiral (Lower Half)", RADM: "Rear Admiral",
  VADM: "Vice Admiral", ADM: "Admiral",
};

function getFullRankName(rank: string): string {
  return GRADE_TO_FULL_RANK[rank] || rank;
}

// ── Hearing steps derived from Office Hours Guide ──

interface HearingStep {
  id: string;
  phase: "opening" | "examination" | "evidence_review" | "mitigation" | "findings";
  speaker: "CO" | "ACC" | "WIT" | "NOTE";
  text: string;
  responseType?: "yes_no" | "freetext" | "none" | "findings_checklist" | "punishment_checklist";
  responseKey?: string;
  placeholder?: string;
  note?: string;
}

function buildSteps(rateName: string, charges: string[], appealAuthority: string, appellateRightsReader: string): HearingStep[] {
  const chargeLines = charges.length > 0
    ? charges.map((c, i) => `CHARGE ${String.fromCharCode(73 + i)}: VIOLATION OF THE UCMJ, ARTICLE ${c}`).join("\n")
    : "CHARGE I: VIOLATION OF THE UCMJ, ARTICLE XX";

  return [
    // ── OPENING ──
    {
      id: "read_charges",
      phase: "opening",
      speaker: "CO",
      text: `${rateName}, you are suspected of committing the following violation(s) of the Uniform Code of Military Justice:\n\n${chargeLines}`,
      responseType: "none",
    },
    {
      id: "rights_warning",
      phase: "opening",
      speaker: "CO",
      text: `${rateName}, you do not have to make any statement regarding the offense(s) of which you are accused or suspected, and any statement made by you may be used as evidence against you.`,
      responseType: "none",
    },
    {
      id: "njp_advisement",
      phase: "opening",
      speaker: "CO",
      text: "You are advised that a nonjudicial punishment is not a trial and that a determination of misconduct on your part is not a conviction by a court. Further, you are advised that the formal rules of evidence used in trials by courts-martial do not apply at nonjudicial punishment.",
      responseType: "none",
    },
    {
      id: "rights_statement_confirm",
      phase: "opening",
      speaker: "CO",
      text: "I have a statement signed by you acknowledging that you were fully advised of your legal rights pertaining at this hearing.",
      responseType: "none",
    },
    {
      id: "understand_rights",
      phase: "opening",
      speaker: "CO",
      text: "Do you understand this statement and do you understand the rights explained therein?",
      responseType: "yes_no",
      responseKey: "accusedUnderstandsRights",
    },
    {
      id: "questions_requests",
      phase: "opening",
      speaker: "CO",
      text: "Do you have any questions about them or do you wish to make any requests?",
      responseType: "yes_no",
      responseKey: "accusedHasQuestions",
      note: "If yes, address questions/requests before proceeding.",
    },

    // ── WITNESS EXAMINATION ──
    {
      id: "witness_testimony",
      phase: "examination",
      speaker: "CO",
      text: "[To witness] What can you tell me about the accused's involvement in these offenses?",
      responseType: "freetext",
      responseKey: "witnessTestimony",
      placeholder: "Record witness testimony...",
    },
    {
      id: "witness_statement_change",
      phase: "examination",
      speaker: "CO",
      text: "If you previously provided a written statement, do you have anything to add or change in your statement?",
      responseType: "freetext",
      responseKey: "witnessStatementChanges",
      placeholder: "Record witness response...",
    },
    {
      id: "accused_cross_examine",
      phase: "examination",
      speaker: "CO",
      text: "[To accused.] Would you like me to ask any further questions of these witnesses?",
      responseType: "freetext",
      responseKey: "accusedCrossExamine",
      placeholder: "Record accused's response and any additional questions...",
    },

    // ── EVIDENCE REVIEW ──
    {
      id: "documents_review",
      phase: "evidence_review",
      speaker: "CO",
      text: "[After all witnesses are questioned.] I have before me the following documents, including statements, that will be considered by me. Have you been given the opportunity to examine them?",
      responseType: "yes_no",
      responseKey: "accusedExaminedEvidence",
      note: "If the answer is \"no,\" offer the accused the opportunity to examine the evidence.",
    },
    {
      id: "accused_offer",
      phase: "evidence_review",
      speaker: "CO",
      text: "Is there anything further that you wish to offer?",
      responseType: "yes_no",
      responseKey: "accusedWishesToOffer",
      note: "If the answer is \"yes,\" permit the accused the opportunity to call his/her witness(es), make a personal statement in defense, and present other evidence.",
    },
    {
      id: "other_witnesses",
      phase: "evidence_review",
      speaker: "CO",
      text: "Are there any other witnesses you would like to call or any other evidence you would like to present?",
      responseType: "yes_no",
      responseKey: "accusedOtherWitnesses",
    },

    // ── MITIGATION ──
    {
      id: "mitigation",
      phase: "mitigation",
      speaker: "CO",
      text: "Is there anything that you wish to offer that would lessen the seriousness of these offenses or mitigate them?",
      responseType: "freetext",
      responseKey: "accusedMitigation",
      placeholder: "Record accused's mitigation statement...",
    },
    {
      id: "character_witness",
      phase: "mitigation",
      speaker: "CO",
      text: `[To witness.] What can you tell me about ${rateName}'s performance of duty?`,
      responseType: "freetext",
      responseKey: "characterWitnessStatement",
      placeholder: "Record character witness statement...",
    },
    {
      id: "accused_final",
      phase: "mitigation",
      speaker: "CO",
      text: "[To accused.] Is there anything else you would like to present?",
      responseType: "freetext",
      responseKey: "accusedFinalStatement",
      placeholder: "Record accused's final statement...",
    },

    // ── FINDINGS & DISPOSITION ──
    {
      id: "announce_findings",
      phase: "findings",
      speaker: "CO",
      text: "I find that you have committed the following offense(s):",
      responseType: "findings_checklist",
      responseKey: "findingsAnnounced",
    },
    {
      id: "impose_punishment",
      phase: "findings",
      speaker: "CO",
      text: "I impose the following punishment:",
      responseType: "punishment_checklist",
      responseKey: "punishmentAnnounced",
    },
    {
      id: "appeal_advisement",
      phase: "findings",
      speaker: "CO",
      text: `You are advised that you have the right to appeal this punishment to ${appealAuthority || "(enter appeal authority)"}. Your appeal must be submitted within a reasonable time, which is normally 5 days. Following this hearing, ${appellateRightsReader || "(enter name of who reads appellate rights)"} will advise you more fully of this right to appeal. Do you understand?`,
      responseType: "yes_no",
      responseKey: "accusedUnderstandsAppeal",
    },
    {
      id: "dismissed",
      phase: "findings",
      speaker: "CO",
      text: "You are dismissed.",
      responseType: "none",
    },
  ];
}

const PHASE_LABELS: Record<string, string> = {
  opening: "Opening",
  examination: "Witness Examination",
  evidence_review: "Evidence Review",
  mitigation: "Mitigation & Character",
  findings: "Findings & Disposition",
};

const PHASE_ORDER = ["opening", "examination", "evidence_review", "mitigation", "findings"];

// Enlisted grade ordering for reduction calculation
const ENLISTED_GRADES = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"];
// Map grade to the USMC rank abbreviation at that grade
const GRADE_TO_RANK_ABBR: Record<string, string> = {
  E1: "Pvt", E2: "PFC", E3: "LCpl", E4: "Cpl", E5: "Sgt",
  E6: "SSgt", E7: "GySgt", E8: "MSgt", E9: "MGySgt",
};

function getReductionLimit(accusedGrade: string, accusedRank: string, isField: boolean): { label: string; available: boolean } {
  const gradeIdx = ENLISTED_GRADES.indexOf(accusedGrade);
  if (gradeIdx <= 0) return { label: "Not available — already at lowest grade", available: false };

  if (isField) {
    // Field grade: can reduce one or more pay grades
    const targetGrade = "E1";
    const targetRank = GRADE_TO_RANK_ABBR[targetGrade] || targetGrade;
    return {
      label: `Red fr ${accusedRank}/${accusedGrade} to as low as ${targetRank}/${targetGrade}`,
      available: true,
    };
  }
  // Company grade: can only reduce one pay grade
  const targetGrade = ENLISTED_GRADES[gradeIdx - 1];
  const targetRank = GRADE_TO_RANK_ABBR[targetGrade] || targetGrade;
  return {
    label: `Red fr ${accusedRank}/${accusedGrade} to ${targetRank}/${targetGrade}`,
    available: true,
  };
}

function PunishmentChecklist({
  commanderGradeLevel,
  accusedGrade,
  accusedRank,
  yearsOfService,
  responses,
  setResponse,
}: {
  commanderGradeLevel: CommanderGradeLevel;
  accusedGrade: string;
  accusedRank: string;
  yearsOfService?: number;
  responses: Record<string, string>;
  setResponse: (key: string, value: string) => void;
}) {
  const limits = PUNISHMENT_LIMITS[commanderGradeLevel] || PUNISHMENT_LIMITS.COMPANY_GRADE;
  const isField = commanderGradeLevel === "FIELD_GRADE_AND_ABOVE";
  const maxForfeit = getMaxForfeiture(accusedGrade, commanderGradeLevel, yearsOfService);
  const reduction = getReductionLimit(accusedGrade, accusedRank, isField);

  const punishments = [
    ...(reduction.available ? [{
      key: "pun_reduction",
      label: "Reduction in Grade",
      limit: reduction.label,
    }] : []),
    {
      key: "pun_forfeiture",
      label: "Forfeiture of Pay",
      limit: isField
        ? `Up to 1/2 of 1 month's pay per month for ${(limits as typeof PUNISHMENT_LIMITS.FIELD_GRADE_AND_ABOVE).forfeitureMonths} months${maxForfeit ? ` (max $${maxForfeit.toLocaleString()}/mo — CY26)` : ""}`
        : `${(limits as typeof PUNISHMENT_LIMITS.COMPANY_GRADE).forfeitureDays} days' pay${maxForfeit ? ` (max $${maxForfeit.toLocaleString()} — CY26)` : ""}`,
    },
    {
      key: "pun_extra_duties",
      label: "Extra Duties",
      limit: `Up to ${limits.extraDutiesDays} days`,
    },
    {
      key: "pun_restriction",
      label: "Restriction",
      limit: `Up to ${limits.restrictionDays} days`,
    },
    {
      key: "pun_corr_custody",
      label: "Correctional Custody",
      limit: `Up to ${limits.corrCustodyDays} days`,
    },
    {
      key: "pun_reprimand",
      label: "Letter of Reprimand",
      limit: "Written or oral",
    },
    {
      key: "pun_admonition",
      label: "Admonition",
      limit: "Written or oral",
    },
  ];

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-neutral-mid mb-2">
        {isField ? "Field Grade" : "Company Grade"} commander limitations apply.
        Check each punishment to impose:
      </p>
      {punishments.map((p) => {
        const checked = responses[p.key] === "imposed";
        return (
          <label key={p.key} className={cn(
            "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors",
            checked ? "border-primary bg-blue-50" : "border-border hover:bg-surface"
          )}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setResponse(p.key, e.target.checked ? "imposed" : "")}
              className="mt-0.5 accent-primary"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{p.label}</span>
              <p className="text-xs text-neutral-mid">{p.limit}</p>
              {checked && (
                <input
                  type="text"
                  className="input-field text-xs mt-2"
                  value={responses[`${p.key}_detail`] || ""}
                  onChange={(e) => setResponse(`${p.key}_detail`, e.target.value)}
                  placeholder={`Specify ${p.label.toLowerCase()} details...`}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default function HearingGuidePanel({ caseId, caseData, onUpdate }: { caseId: string; caseData: Rec; onUpdate: () => void }) {
  const accused = caseData.accused || {};
  const offenses = caseData.offenses || [];
  const hr = caseData.hearingRecord || {};

  const fullRank = accused.rank ? getFullRankName(accused.rank) : "";
  const rateName = `${fullRank} ${accused.lastName || ""}`.trim() || "RATE NAME";
  const articles = offenses.map((o: Rec) => o.ucmjArticle).filter(Boolean);

  const [appealAuthority, setAppealAuthority] = useState(hr.appealAuthority || "");
  const [appellateRightsReader, setAppellateRightsReader] = useState(hr.appellateRightsReader || "");
  const [currentStep, setCurrentStep] = useState<number>(hr.currentStep || 0);
  const [responses, setResponses] = useState<Record<string, string>>(hr.responses || {});
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const steps = buildSteps(rateName, articles, appealAuthority, appellateRightsReader);
  const step = steps[currentStep];
  const currentPhase = step?.phase || "opening";
  const isComplete = currentStep >= steps.length;

  function setResponse(key: string, value: string) {
    setResponses((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProgress() {
    setSaving(true);
    try {
      await updateHearingRecord(caseId, {
        currentStep,
        responses,
        appealAuthority,
        appellateRightsReader,
        completed: isComplete,
        completedAt: isComplete ? new Date().toISOString() : undefined,
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  }

  function goPrev() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  function resetHearing() {
    setCurrentStep(0);
    setResponses({});
  }

  if (showPrint) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4 print:hidden">
          <button onClick={() => setShowPrint(false)} className="btn-ghost text-xs">Back to Guide</button>
          <button onClick={() => window.print()} className="btn-primary text-xs gap-1"><Printer size={14} /> Print</button>
        </div>
        <MastScriptPrint
          rateName={rateName}
          charges={articles}
          offenses={offenses}
          appealAuthority={appealAuthority}
          appellateRightsReader={appellateRightsReader}
          responses={responses}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Config bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface rounded-lg border border-border">
        <div>
          <label className="block text-xs font-medium text-neutral-mid mb-1">Appeal Authority</label>
          <input className="input-field text-sm" value={appealAuthority} onChange={(e) => setAppealAuthority(e.target.value)} placeholder="e.g., Commanding General, 1st MARDIV" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-mid mb-1">Who Reads Appellate Rights</label>
          <input className="input-field text-sm" value={appellateRightsReader} onChange={(e) => setAppellateRightsReader(e.target.value)} placeholder="e.g., Capt Smith, Legal" />
        </div>
      </div>

      {/* Phase progress */}
      <div className="flex gap-1">
        {PHASE_ORDER.map((phase) => {
          const phaseSteps = steps.filter((s) => s.phase === phase);
          const phaseStart = steps.indexOf(phaseSteps[0]);
          const phaseEnd = phaseStart + phaseSteps.length;
          const isCurrent = currentStep >= phaseStart && currentStep < phaseEnd;
          const isDone = currentStep >= phaseEnd;
          return (
            <button
              key={phase}
              onClick={() => setCurrentStep(phaseStart)}
              className={cn(
                "flex-1 text-center py-2 px-1 text-xs font-medium rounded transition-colors",
                isDone ? "bg-green-100 text-green-700" :
                isCurrent ? "bg-primary text-white" :
                "bg-gray-100 text-neutral-mid"
              )}
            >
              {isDone && <Check size={10} className="inline mr-1" />}
              {PHASE_LABELS[phase]}
            </button>
          );
        })}
      </div>

      {/* Step counter */}
      <div className="text-xs text-neutral-mid text-center">
        Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
        {isComplete && " — Hearing Complete"}
      </div>

      {/* Current step */}
      {!isComplete && step && (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Speaker badge */}
          <div className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wide",
            step.speaker === "CO" ? "bg-blue-50 text-blue-700" :
            step.speaker === "ACC" ? "bg-amber-50 text-amber-700" :
            step.speaker === "WIT" ? "bg-purple-50 text-purple-700" :
            "bg-gray-50 text-gray-600"
          )}>
            {step.speaker === "CO" ? "Commanding Officer" :
             step.speaker === "ACC" ? "Accused" :
             step.speaker === "WIT" ? "Witness" : "Note"}
            <span className="ml-2 font-normal normal-case text-neutral-mid">{PHASE_LABELS[step.phase]}</span>
          </div>

          {/* Script text */}
          <div className="p-5">
            <p className="text-sm leading-relaxed whitespace-pre-line font-mono">{step.text}</p>

            {step.note && (
              <div className="mt-3 rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {step.note}
              </div>
            )}

            {/* Response input */}
            {step.responseType === "yes_no" && step.responseKey && (
              <div className="mt-4 flex gap-3">
                <span className="text-sm font-medium text-neutral-mid self-center">ACC:</span>
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setResponse(step.responseKey!, opt.toLowerCase())}
                    className={cn(
                      "px-4 py-2 rounded-md border text-sm font-medium transition-colors",
                      responses[step.responseKey!] === opt.toLowerCase()
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:bg-surface"
                    )}
                  >
                    {opt}, sir/ma&apos;am
                  </button>
                ))}
              </div>
            )}

            {step.responseType === "freetext" && step.responseKey && (
              <div className="mt-4">
                <textarea
                  className="input-field min-h-[80px] text-sm"
                  value={responses[step.responseKey] || ""}
                  onChange={(e) => setResponse(step.responseKey!, e.target.value)}
                  placeholder={step.placeholder}
                />
              </div>
            )}

            {/* Findings checklist — checkboxes for each charged offense */}
            {step.responseType === "findings_checklist" && (
              <div className="mt-4 space-y-2">
                {offenses.map((o: Rec) => {
                  const key = `finding_${o.offenseLetter}`;
                  const checked = responses[key] === "GUILTY";
                  return (
                    <label key={o.offenseLetter} className={cn(
                      "flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                      checked ? "border-red-300 bg-red-50" : "border-border hover:bg-surface"
                    )}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setResponse(key, e.target.checked ? "GUILTY" : "NOT_GUILTY")}
                        className="mt-0.5 accent-red-600"
                      />
                      <div>
                        <span className="text-sm font-medium">
                          Charge {o.offenseLetter}: Art. {o.ucmjArticle} — {o.offenseType}
                        </span>
                        {o.offenseSummary && (
                          <p className="text-xs text-neutral-mid mt-0.5">{o.offenseSummary}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Punishment checklist — available punishments with limits */}
            {step.responseType === "punishment_checklist" && (
              <PunishmentChecklist
                commanderGradeLevel={caseData.commanderGradeLevel}
                accusedGrade={accused.grade}
                accusedRank={accused.rank}
                yearsOfService={accused.yearsOfService ?? undefined}
                responses={responses}
                setResponse={setResponse}
              />
            )}
          </div>
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
          <Check size={32} className="text-green-600 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-green-800">Hearing Complete</h3>
          <p className="text-sm text-green-700 mt-1">
            All steps of the Captain&apos;s Mast guide have been completed.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={goPrev} disabled={currentStep === 0} className="btn-ghost text-xs gap-1 disabled:opacity-30">
          <ChevronLeft size={14} /> Previous
        </button>

        <div className="flex gap-2">
          <button onClick={resetHearing} className="btn-ghost text-xs gap-1 text-warning">
            <RotateCcw size={12} /> Reset
          </button>
          <button onClick={() => setShowPrint(true)} className="btn-ghost text-xs gap-1">
            <Printer size={14} /> Print Script
          </button>
          <button onClick={saveProgress} disabled={saving} className="btn-primary text-xs gap-1">
            <Save size={14} /> {saving ? "Saving..." : "Save Progress"}
          </button>
        </div>

        <button onClick={goNext} disabled={isComplete} className="btn-ghost text-xs gap-1 disabled:opacity-30">
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
