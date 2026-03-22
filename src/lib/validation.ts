import { differenceInDays, addMonths, parseISO } from "date-fns";
import type { Grade, CommanderGradeLevel } from "@/types";
import { getGradeNumber, RANK_TO_GRADE } from "@/types";
import type { Rank } from "@/types";

// ============================================================================
// LegalFlow Validation Engine
// Implements all rules per LegalFlow_Validation_Rules.md v1.0
// Rule IDs: VR-[PHASE]-[ITEM]-[SEQUENCE]
// ============================================================================

export type ErrorType = "HARD_BLOCK" | "WARNING" | "ADVISORY" | "AUTO_ACTION";

export interface ValidationResult {
  ruleId: string;
  type: ErrorType;
  field: string;
  message: string;
  action?: string;
}

// ============================================================================
// Phase 1 - Initiation Rules (VR-INIT-*)
// ============================================================================

/** VR-INIT-001: Statute of limitations > 730 days */
export function vrInit001(offenseDate: string): ValidationResult | null {
  const days = differenceInDays(new Date(), parseISO(offenseDate));
  if (days > 730) {
    return {
      ruleId: "VR-INIT-001",
      type: "WARNING",
      field: "offense_date",
      message:
        "This offense is within the 2-year NJP statute of limitations window. Offenses more than 2 years old cannot be disposed of at NJP unless the accused affirmatively agrees per MCO 5800.16 para 010702. Verify the offense date before proceeding.",
      action: "Require acknowledgment checkbox before case creation proceeds.",
    };
  }
  return null;
}

/** VR-INIT-002: Pre-expiration notice (670-730 days) */
export function vrInit002(offenseDate: string): ValidationResult | null {
  const days = differenceInDays(new Date(), parseISO(offenseDate));
  if (days >= 670 && days <= 730) {
    return {
      ruleId: "VR-INIT-002",
      type: "ADVISORY",
      field: "offense_date",
      message:
        "This offense is within 60 days of the 2-year NJP statute of limitations. Initiate proceedings promptly.",
    };
  }
  return null;
}

/** VR-INIT-003: Double punishment check */
export function vrInit003(
  edipi: string,
  article: string,
  offenseDate: string,
  existingCases: { caseNumber: string; createdAt: string; edipi: string; offenses: { ucmjArticle: string; offenseDate: string }[] }[]
): ValidationResult | null {
  for (const c of existingCases) {
    if (c.edipi !== edipi) continue;
    for (const o of c.offenses) {
      if (o.ucmjArticle === article && o.offenseDate === offenseDate) {
        return {
          ruleId: "VR-INIT-003",
          type: "WARNING",
          field: "offense",
          message: `A prior NJP action was detected for this Marine for this offense. Case ${c.caseNumber} was opened on ${c.createdAt.split("T")[0]}. Double punishment for the same offense is prohibited under Article 15, UCMJ, per MCO 5800.16 para 010401. Review the prior case before proceeding.`,
          action: "Require acknowledgment checkbox. Log in audit_logs.",
        };
      }
    }
  }
  return null;
}

/** VR-INIT-004: Jurisdiction confirmation required */
export function vrInit004(jurisdictionConfirmed: boolean): ValidationResult | null {
  if (!jurisdictionConfirmed) {
    return {
      ruleId: "VR-INIT-004",
      type: "HARD_BLOCK",
      field: "jurisdiction_confirmed",
      message: "You must confirm that the accused is assigned or attached to this command before creating this case.",
    };
  }
  return null;
}

/** VR-INIT-005: EDIPI format validation */
export function vrInit005(edipi: string): ValidationResult | null {
  if (!/^\d{10}$/.test(edipi)) {
    return {
      ruleId: "VR-INIT-005",
      type: "HARD_BLOCK",
      field: "edipi",
      message: "EDIPI must be exactly 10 numeric digits.",
    };
  }
  return null;
}

/** VR-INIT-006: Rank/Grade mismatch advisory (frocked) */
export function vrInit006(rank: string, grade: string): ValidationResult | null {
  if (rank in RANK_TO_GRADE) {
    const expectedGrade = RANK_TO_GRADE[rank as Rank];
    if (expectedGrade !== grade) {
      return {
        ruleId: "VR-INIT-006",
        type: "ADVISORY",
        field: "rank_grade",
        message:
          "The selected rank and pay grade may not correspond. If this Marine is frocked, verify the correct pay grade for punishment calculation purposes.",
      };
    }
  }
  return null;
}

/** VR-INIT-007: Article 85/86 UA trigger (AUTO_ACTION) */
export function vrInit007(articles: string[]): boolean {
  return articles.some((a) => a === "85" || a === "86");
}

/** VR-INIT-008: Offense count > 5 */
export function vrInit008(offenseCount: number): ValidationResult | null {
  if (offenseCount > 5) {
    return {
      ruleId: "VR-INIT-008",
      type: "ADVISORY",
      field: "offenses",
      message:
        "The primary UPB form accommodates up to 5 offenses (A-E). Additional offenses will be entered in Item 21 Remarks after case creation.",
    };
  }
  return null;
}

// ============================================================================
// Phase 2 - Rights Advisement Rules (VR-R2-*)
// ============================================================================

/** VR-R2-005: Item 3 date must be on or before Item 6 date */
export function vrR2005(item3Date: string | undefined, item6Date: string | undefined): ValidationResult | null {
  if (!item3Date || !item6Date) return null;
  if (parseISO(item3Date) > parseISO(item6Date)) {
    return {
      ruleId: "VR-R2-005",
      type: "HARD_BLOCK",
      field: "item3_date",
      message: `Item 3 must be signed before or on the date punishment is imposed per MCO 5800.16 para 011105.C. Item 3 was signed on ${item3Date}. The punishment date entered is ${item6Date}. Correct the punishment date or obtain a new Item 3 signature.`,
    };
  }
  return null;
}

// ============================================================================
// Phase 3 - Hearing Rules (VR-R3-*)
// ============================================================================

interface PunishmentInput {
  corrCustodyDays?: number;
  forfeitureAmount?: number;
  forfeitureMonths?: number;
  reductionImposed?: boolean;
  reductionFromGrade?: string;
  reductionToGrade?: string;
  extraDutiesDays?: number;
  restrictionDays?: number;
  arrestQuartersDays?: number;
  detentionDays?: number;
  detentionAmount?: number;
  admonitionReprimand?: boolean;
}

/** VR-R3-001: All findings required before Item 6 */
export function vrR3001(findings: (string | null)[]): ValidationResult | null {
  if (findings.some((f) => !f)) {
    return {
      ruleId: "VR-R3-001",
      type: "HARD_BLOCK",
      field: "findings",
      message: "A finding of guilty or not guilty must be entered for each offense listed in Item 1 before proceeding.",
    };
  }
  return null;
}

/** VR-R3-002: Correctional custody limits */
export function vrR3002(days: number | undefined, gradeLevel: CommanderGradeLevel): ValidationResult | null {
  if (!days) return null;
  if (gradeLevel === "COMPANY_GRADE" && days > 7) {
    return {
      ruleId: "VR-R3-002",
      type: "HARD_BLOCK",
      field: "corr_custody_days",
      message: "Correctional custody cannot exceed 7 consecutive days for a Company Grade imposing officer per MCO 5800.16 para 010303.A.",
    };
  }
  if (gradeLevel === "FIELD_GRADE_AND_ABOVE" && days > 30) {
    return {
      ruleId: "VR-R3-002",
      type: "HARD_BLOCK",
      field: "corr_custody_days",
      message: "Correctional custody cannot exceed 30 consecutive days for a Field Grade or above imposing officer per MCO 5800.16 para 010302.A.",
    };
  }
  return null;
}

/** VR-R3-004: Forfeiture whole dollar only */
export function vrR3004(amount: number | undefined): ValidationResult | null {
  if (amount !== undefined && amount !== Math.floor(amount)) {
    return {
      ruleId: "VR-R3-004",
      type: "HARD_BLOCK",
      field: "forfeiture_amount",
      message: "Forfeiture must be expressed in whole dollar amounts only per MCO 5800.16 para 010901. Remove cents from the entered amount.",
    };
  }
  return null;
}

/** VR-R3-005: Reduction E-6+ blocked */
export function vrR3005(reductionImposed: boolean | undefined, accusedGrade: Grade): ValidationResult | null {
  if (!reductionImposed) return null;
  const num = getGradeNumber(accusedGrade);
  if (accusedGrade.startsWith("E") && num >= 6) {
    return {
      ruleId: "VR-R3-005",
      type: "HARD_BLOCK",
      field: "reduction",
      message: "Marines in the grade of E-6 or above may not be reduced in paygrade at NJP per MCO 5800.16 para 010302.C. Reduction cannot be imposed for this Marine.",
    };
  }
  return null;
}

/** VR-R3-006: Reduction one grade only */
export function vrR3006(fromGrade: string | undefined, toGrade: string | undefined): ValidationResult | null {
  if (!fromGrade || !toGrade) return null;
  const fromNum = getGradeNumber(fromGrade as Grade);
  const toNum = getGradeNumber(toGrade as Grade);
  if (fromNum - toNum > 1) {
    const correctGrade = `E${fromNum - 1}`;
    return {
      ruleId: "VR-R3-006",
      type: "HARD_BLOCK",
      field: "reduction_to_grade",
      message: `Marines may only be reduced to the next inferior paygrade per MCO 5800.16 para 010302.C. A reduction from ${fromGrade} must be to ${correctGrade} only.`,
    };
  }
  return null;
}

/** VR-R3-007: Extra duties limits */
export function vrR3007(days: number | undefined, gradeLevel: CommanderGradeLevel): ValidationResult | null {
  if (!days) return null;
  if (gradeLevel === "COMPANY_GRADE" && days > 14) {
    return {
      ruleId: "VR-R3-007",
      type: "HARD_BLOCK",
      field: "extra_duties_days",
      message: "Extra duties cannot exceed 14 consecutive days for a Company Grade imposing officer per MCO 5800.16 para 010303.D.",
    };
  }
  if (gradeLevel === "FIELD_GRADE_AND_ABOVE" && days > 45) {
    return {
      ruleId: "VR-R3-007",
      type: "HARD_BLOCK",
      field: "extra_duties_days",
      message: "Extra duties cannot exceed 45 consecutive days for a Field Grade or above imposing officer per MCO 5800.16 para 010302.D.",
    };
  }
  return null;
}

/** VR-R3-008: Restriction limits */
export function vrR3008(days: number | undefined, gradeLevel: CommanderGradeLevel): ValidationResult | null {
  if (!days) return null;
  if (gradeLevel === "COMPANY_GRADE" && days > 14) {
    return {
      ruleId: "VR-R3-008",
      type: "HARD_BLOCK",
      field: "restriction_days",
      message: "Restriction cannot exceed 14 consecutive days for a Company Grade imposing officer per MCO 5800.16 para 010303.E.",
    };
  }
  if (gradeLevel === "FIELD_GRADE_AND_ABOVE" && days > 60) {
    return {
      ruleId: "VR-R3-008",
      type: "HARD_BLOCK",
      field: "restriction_days",
      message: "Restriction cannot exceed 60 consecutive days for a Field Grade or above imposing officer per MCO 5800.16 para 010302.E.",
    };
  }
  return null;
}

/** VR-R3-009: No punishment - destroy case trigger */
export function vrR3009(punishment: PunishmentInput): ValidationResult | null {
  const hasPunishment =
    (punishment.corrCustodyDays ?? 0) > 0 ||
    (punishment.forfeitureAmount ?? 0) > 0 ||
    punishment.reductionImposed ||
    (punishment.extraDutiesDays ?? 0) > 0 ||
    (punishment.restrictionDays ?? 0) > 0 ||
    (punishment.arrestQuartersDays ?? 0) > 0 ||
    (punishment.detentionDays ?? 0) > 0 ||
    punishment.admonitionReprimand;

  if (!hasPunishment) {
    return {
      ruleId: "VR-R3-009",
      type: "WARNING",
      field: "punishment",
      message: "No punishment has been entered. Per NAVMC 10132 Item 6 instructions, if no punishment is imposed the form must be destroyed and no UPB record maintained. Do you want to destroy this case record? This action cannot be undone.",
    };
  }
  return null;
}

/** VR-R3-010: JA review threshold evaluation */
export function vrR3010(p: PunishmentInput, accusedGrade: Grade): {
  anyMet: boolean;
  thresholds: {
    arrestQuarters: boolean;
    corrCustody: boolean;
    forfeiture: boolean;
    reduction: boolean;
    extraDuties: boolean;
    restriction: boolean;
    detention: boolean;
  };
  exceeded: string[];
} {
  const arrestQuarters = (p.arrestQuartersDays ?? 0) > 7;
  const corrCustody = (p.corrCustodyDays ?? 0) > 7;
  const forfeiture = (p.forfeitureAmount ?? 0) > 0; // simplified - any forfeiture > 7 days pay
  const reduction = !!p.reductionImposed && accusedGrade.startsWith("E") && getGradeNumber(accusedGrade) >= 4;
  const extraDuties = (p.extraDutiesDays ?? 0) > 14;
  const restriction = (p.restrictionDays ?? 0) > 14;
  const detention = (p.detentionDays ?? 0) > 14;

  const anyMet = arrestQuarters || corrCustody || forfeiture || reduction || extraDuties || restriction || detention;

  const exceeded: string[] = [];
  if (arrestQuarters) exceeded.push("Arrest in quarters > 7 days");
  if (corrCustody) exceeded.push("Correctional custody > 7 days");
  if (forfeiture) exceeded.push("Forfeiture exceeds threshold");
  if (reduction) exceeded.push(`Reduction from ${accusedGrade} (E-4 or above)`);
  if (extraDuties) exceeded.push("Extra duties > 14 days");
  if (restriction) exceeded.push("Restriction > 14 days");
  if (detention) exceeded.push("Detention > 14 days");

  return {
    anyMet,
    thresholds: { arrestQuarters, corrCustody, forfeiture, reduction, extraDuties, restriction, detention },
    exceeded,
  };
}

/** Run all VR-R3 punishment validation rules */
export function validatePunishment(
  p: PunishmentInput,
  gradeLevel: CommanderGradeLevel,
  accusedGrade: Grade
): ValidationResult[] {
  const results: ValidationResult[] = [];

  const r2 = vrR3002(p.corrCustodyDays, gradeLevel);
  if (r2) results.push(r2);

  const r4 = vrR3004(p.forfeitureAmount);
  if (r4) results.push(r4);

  const r5 = vrR3005(p.reductionImposed, accusedGrade);
  if (r5) results.push(r5);

  const r6 = vrR3006(p.reductionFromGrade || accusedGrade, p.reductionToGrade);
  if (r6) results.push(r6);

  const r7 = vrR3007(p.extraDutiesDays, gradeLevel);
  if (r7) results.push(r7);

  const r8 = vrR3008(p.restrictionDays, gradeLevel);
  if (r8) results.push(r8);

  return results;
}

// ============================================================================
// Phase 4 - Notification Rules (VR-R4-*)
// ============================================================================

/** VR-R4-001: Item 11 date must be on or after Item 6 date */
export function vrR4001(item11Date: string | undefined, njpDate: string | undefined): ValidationResult | null {
  if (!item11Date || !njpDate) return null;
  if (parseISO(item11Date) < parseISO(njpDate)) {
    return {
      ruleId: "VR-R4-001",
      type: "HARD_BLOCK",
      field: "item11_date",
      message: `Item 11 cannot be dated before the date of punishment imposition per MCO 5800.16 para 011105.K. The NJP date is ${njpDate}. Enter a date on or after the NJP date.`,
    };
  }
  return null;
}

// ============================================================================
// Phase 5 - Appeal Rules (VR-R5-*)
// ============================================================================

/** VR-R5-001: JA review gate for Item 14 */
export function vrR5001(jaReviewRequired: boolean, jaReviewComplete: boolean, exceededThresholds?: string[]): ValidationResult | null {
  if (jaReviewRequired && !jaReviewComplete) {
    const thresholdList = exceededThresholds?.join(", ") || "See case punishment details";
    return {
      ruleId: "VR-R5-001",
      type: "HARD_BLOCK",
      field: "item14",
      message: `Judge advocate review is required before the appeal authority can act on this appeal per MCO 5800.16 para 011401-011402. The following punishment(s) exceeded the JA review threshold: ${thresholdList}. Log the JA review to proceed.`,
    };
  }
  return null;
}

/** VR-R5-003: Five-day appeal stay check */
export function vrR5003(
  appealFiledDate: string | undefined,
  fiveDayAlertSent: boolean,
  hasRestriction: boolean,
  hasExtraDuties: boolean
): { alertNeeded: boolean; restrictionStay: boolean; extraDutiesStay: boolean; message?: string } {
  if (!appealFiledDate || fiveDayAlertSent) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  const daysSince = differenceInDays(new Date(), parseISO(appealFiledDate));
  if (daysSince < 5) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  if (!hasRestriction && !hasExtraDuties) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  const parts: string[] = [];
  if (hasRestriction) parts.push("restriction");
  if (hasExtraDuties) parts.push("extra duties");
  return {
    alertNeeded: true,
    restrictionStay: hasRestriction,
    extraDutiesStay: hasExtraDuties,
    message: `Five days have elapsed since the appeal was filed (${appealFiledDate}) with no action taken on the appeal. If the accused has requested a stay, unexecuted punishment of ${parts.join(" / ")} must be stayed until action on the appeal is taken per Part V MCM para 7.`,
  };
}

// ============================================================================
// Phase 6 - Remedial Action Rules (VR-R6-*)
// ============================================================================

/** VR-R6-001: Four-month set aside window */
export function vrR6001(executionDate: string, actionDate: string): ValidationResult | null {
  const days = differenceInDays(parseISO(actionDate), parseISO(executionDate));
  if (days > 120) {
    return {
      ruleId: "VR-R6-001",
      type: "WARNING",
      field: "action_date",
      message: `The power to set aside an executed punishment should ordinarily be exercised within four months of the date of execution per MCO 5800.16 para 011003.B. The execution date was ${executionDate}. Proceed only if there is a compelling reason for late action.`,
    };
  }
  return null;
}

/** VR-R6-003: Four-month suspension of executed - hard block */
export function vrR6003(executionDate: string, actionDate: string): ValidationResult | null {
  const days = differenceInDays(parseISO(actionDate), parseISO(executionDate));
  if (days > 120) {
    const expiryDate = addMonths(parseISO(executionDate), 4).toISOString().split("T")[0];
    return {
      ruleId: "VR-R6-003",
      type: "HARD_BLOCK",
      field: "action_date",
      message: `Suspension of an executed punishment of reduction or forfeiture of pay may only be accomplished within four months of the date the punishment is executed per MCO 5800.16 para 011003.C. The four-month window expired on ${expiryDate}. This action cannot be taken.`,
    };
  }
  return null;
}

// ============================================================================
// Phase 7 - Admin Completion Rules (VR-R7-*)
// ============================================================================

/** VR-R7-001: Item 16 prerequisites check */
export function vrR7001(prerequisites: {
  item3Signed: boolean;
  item9Signed: boolean;
  item12Signed: boolean;
  appealResolved: boolean;
  ompfConfirmed: boolean;
  udNumber: string;
  udDate: string;
}): ValidationResult | null {
  const incomplete: string[] = [];
  if (!prerequisites.item3Signed) incomplete.push("Item 3 (CO certification)");
  if (!prerequisites.item9Signed) incomplete.push("Item 9 (NJP authority signature)");
  if (!prerequisites.item12Signed) incomplete.push("Item 12 (appeal election)");
  if (!prerequisites.appealResolved) incomplete.push("Appeal resolution (Item 14 or no appeal)");
  if (!prerequisites.ompfConfirmed) incomplete.push("OMPF/ESR scan confirmation");
  if (!prerequisites.udNumber) incomplete.push("UD Number");
  if (!prerequisites.udDate) incomplete.push("UD Date");

  if (incomplete.length > 0) {
    return {
      ruleId: "VR-R7-001",
      type: "HARD_BLOCK",
      field: "item16",
      message: `The following items must be completed before the form can be signed and locked: ${incomplete.join(", ")}.`,
    };
  }
  return null;
}

/** VR-R7-002: Active suspension warning on Item 16 */
export function vrR7002(suspensionActive: boolean): ValidationResult | null {
  if (suspensionActive) {
    return {
      ruleId: "VR-R7-002",
      type: "WARNING",
      field: "item16",
      message: "An active suspension is on record for this case. Signing Item 16 will lock the form. Per NAVMC 10132 Item 16 instructions, the original unit copy must be retained because vacated suspensions cannot be recorded in Item 21 after Item 16 is signed. Vacation of suspension will create a separate child document appended to this case.",
    };
  }
  return null;
}

// ============================================================================
// Phase 8 - Vacation Rules (VR-R8-*)
// ============================================================================

/** VR-R8-003: Vacation offense must be within suspension period */
export function vrR8003(
  offenseDate: string,
  suspensionStart: string,
  suspensionEnd: string
): ValidationResult | null {
  const oDate = parseISO(offenseDate);
  if (oDate < parseISO(suspensionStart) || oDate > parseISO(suspensionEnd)) {
    return {
      ruleId: "VR-R8-003",
      type: "HARD_BLOCK",
      field: "triggering_offense_date",
      message: `Vacation of suspension may only be based on an offense committed during the suspension period per MCO 5800.16 para 011201. The suspension period is ${suspensionStart} to ${suspensionEnd}. The triggering offense date of ${offenseDate} is outside this period.`,
    };
  }
  return null;
}

// ============================================================================
// System-Level Rules (VR-SYS-*)
// ============================================================================

/** VR-SYS-003: Cross-phase date sequence validation */
export function vrSys003(dates: {
  offenseDate?: string;
  item3Date?: string;
  njpDate?: string;
  item10Date?: string;
  item11Date?: string;
  item12Date?: string;
  item13Date?: string;
  item14Date?: string;
  item15Date?: string;
  item16Date?: string;
}): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (dates.item3Date && dates.njpDate && parseISO(dates.item3Date) > parseISO(dates.njpDate)) {
    results.push({ ruleId: "VR-SYS-003", type: "HARD_BLOCK", field: "dates", message: "Item 3 date cannot be after NJP date (Item 6)." });
  }
  if (dates.item11Date && dates.njpDate && parseISO(dates.item11Date) < parseISO(dates.njpDate)) {
    results.push({ ruleId: "VR-SYS-003", type: "HARD_BLOCK", field: "dates", message: "Item 11 date cannot be before NJP date (Item 6)." });
  }
  if (dates.item14Date && dates.item13Date && parseISO(dates.item14Date) < parseISO(dates.item13Date)) {
    results.push({ ruleId: "VR-SYS-003", type: "HARD_BLOCK", field: "dates", message: "Item 14 date cannot be before Item 13 date." });
  }
  if (dates.item15Date && dates.item14Date && parseISO(dates.item15Date) < parseISO(dates.item14Date)) {
    results.push({ ruleId: "VR-SYS-003", type: "HARD_BLOCK", field: "dates", message: "Item 15 date cannot be before Item 14 date." });
  }

  return results;
}

// ============================================================================
// Locked Items by Signature (VR-R2-006, VR-R3-014, VR-R5-007, VR-R7-003)
// ============================================================================

/** Returns array of locked item numbers based on signed items */
export function getLockedItems(signedItems: string[]): string[] {
  const locked = new Set<string>();

  // VR-R2-006: Item 2 signature locks
  if (signedItems.includes("2")) {
    ["1", "2", "17", "18", "19", "20", "22", "23", "24", "25"].forEach((i) => locked.add(i));
  }
  // Item 3 locks
  if (signedItems.includes("3")) {
    ["1", "2", "3", "17", "18", "19", "20", "22", "23", "24", "25"].forEach((i) => locked.add(i));
  }
  // VR-R3-014: Item 9 signature locks
  if (signedItems.includes("9")) {
    for (let i = 1; i <= 9; i++) locked.add(String(i));
    ["17", "18", "19", "20", "22", "23", "24", "25"].forEach((i) => locked.add(i));
  }
  // Item 11 locks
  if (signedItems.includes("11")) {
    ["10", "11"].forEach((i) => locked.add(i));
  }
  // Item 12 locks
  if (signedItems.includes("12")) {
    locked.add("12");
  }
  // VR-R5-007: Item 14 signature locks
  if (signedItems.includes("14")) {
    ["13", "14"].forEach((i) => locked.add(i));
  }
  // VR-R7-003: Item 16 locks entire form
  if (signedItems.includes("16")) {
    for (let i = 1; i <= 25; i++) locked.add(String(i));
  }

  return Array.from(locked).sort((a, b) => parseInt(a) - parseInt(b));
}

// ============================================================================
// Missing INIT Rules
// ============================================================================

/** VR-INIT-009: No PII in offense summary (ADVISORY - persistent helper text) */
export const VR_INIT_009_MESSAGE =
  "Do not include victim PII in the offense summary per NAVMC 10132 Item 1 instructions. Enter victim information in the Victim Demographics section.";

/** VR-INIT-010: SMCR flag activation (AUTO_ACTION) */
export function vrInit010(component: string): boolean {
  return component === "SMCR" || component === "IRR";
}

/** VR-INIT-011: Vessel exception flag (AUTO_ACTION) */
export function vrInit011(vesselException: boolean): boolean {
  return vesselException;
}

// ============================================================================
// Missing Phase 2 Rules (handled as AUTO_ACTION in API)
// ============================================================================

/** VR-R2-001: Court-martial demand routing */
export function vrR2001(acceptsNjp: boolean, vesselException: boolean): { route: boolean; message: string } {
  if (!acceptsNjp && !vesselException) {
    return {
      route: true,
      message: "The accused has demanded trial by court-martial. NJP cannot be imposed. This case will be marked as referred to court-martial jurisdiction and routed for disposition.",
    };
  }
  return { route: false, message: "" };
}

/** VR-R2-002: Vessel exception override (ADVISORY) */
export function vrR2002(acceptsNjp: boolean, vesselException: boolean): ValidationResult | null {
  if (!acceptsNjp && vesselException) {
    return {
      ruleId: "VR-R2-002",
      type: "ADVISORY",
      field: "item2",
      message: "The vessel exception applies. The accused does not have the right to demand trial by court-martial per MCO 5800.16 para 010702. The NJP may proceed.",
    };
  }
  return null;
}

/** VR-R2-003: Refusal to sign routing */
export function vrR2003(refusedToSign: boolean, vesselException: boolean): { route: boolean; message: string } {
  if (refusedToSign && !vesselException) {
    return {
      route: true,
      message: "The accused has refused to indicate intentions and/or refused to sign Item 2. Per MCO 5800.16 para 011105.B, this is treated as a refusal of NJP. This case will be referred to the officer exercising court-martial jurisdiction.",
    };
  }
  return { route: false, message: "" };
}

/** VR-R2-004: Vessel refusal - CO signs instead */
export function vrR2004(refusedToSign: boolean, vesselException: boolean): ValidationResult | null {
  if (refusedToSign && vesselException) {
    return {
      ruleId: "VR-R2-004",
      type: "AUTO_ACTION",
      field: "item2",
      message: "The accused refused to sign Item 2. The vessel exception applies. The Commanding Officer will sign Item 2 in place of the accused. NJP may proceed.",
    };
  }
  return null;
}

/** VR-R2-007: Block offense add after Item 2 signed */
export function vrR2007(item2Signed: boolean): ValidationResult | null {
  if (item2Signed) {
    return {
      ruleId: "VR-R2-007",
      type: "HARD_BLOCK",
      field: "offenses",
      message: "Offenses cannot be added after the accused has signed Item 2 per NAVMC 10132 Item 1 instructions. Additional offenses must be added through Item 21 Remarks.",
    };
  }
  return null;
}

// ============================================================================
// Missing Phase 3 Rules
// ============================================================================

/** VR-R3-003: Forfeiture amount limits (needs pay table - simplified) */
export function vrR3003(
  forfeitureAmount: number | undefined,
  gradeLevel: CommanderGradeLevel,
  calculatedMax?: number
): ValidationResult | null {
  if (!forfeitureAmount || !calculatedMax) return null;
  if (forfeitureAmount > calculatedMax) {
    return {
      ruleId: "VR-R3-003",
      type: "HARD_BLOCK",
      field: "forfeiture_amount",
      message: `Forfeiture amount of $${forfeitureAmount} exceeds the maximum permissible forfeiture of $${calculatedMax} for a ${gradeLevel === "COMPANY_GRADE" ? "Company Grade" : "Field Grade or above"} imposing officer. Correct the amount before proceeding.`,
    };
  }
  return null;
}

/** VR-R3-011: Forfeiture recalc when reduction imposed (WARNING) */
export function vrR3011(reductionImposed: boolean, reductionToGrade?: string): ValidationResult | null {
  if (reductionImposed && reductionToGrade) {
    return {
      ruleId: "VR-R3-011",
      type: "WARNING",
      field: "forfeiture_amount",
      message: `A reduction in grade has also been imposed (suspended or not). Per MCO 5800.16 para 010904 and Part V MCM para 5, the maximum forfeiture must be calculated on the pay of the reduced grade (${reductionToGrade}). The calculator has been updated to reflect the reduced grade pay.`,
    };
  }
  return null;
}

/** VR-R3-012: SMCR 60-day period locked */
export function vrR3012(smcr60DayStart: string | undefined, njpDate: string | undefined): ValidationResult | null {
  if (smcr60DayStart && njpDate && smcr60DayStart !== njpDate) {
    return {
      ruleId: "VR-R3-012",
      type: "HARD_BLOCK",
      field: "smcr_60_day_start",
      message: `The 60-day period for SMCR forfeiture calculation begins on the NJP date (${njpDate}) and cannot be adjusted per MCO 5800.16 para 010905.E.`,
    };
  }
  return null;
}

/** VR-R3-013: Item 9 prerequisites */
export function vrR3013(prerequisites: {
  item3Signed: boolean;
  allFindingsEntered: boolean;
  punishmentEntered: boolean;
}): ValidationResult | null {
  const incomplete: string[] = [];
  if (!prerequisites.item3Signed) incomplete.push("Item 3 (CO certification)");
  if (!prerequisites.allFindingsEntered) incomplete.push("Item 5 (all findings)");
  if (!prerequisites.punishmentEntered) incomplete.push("Items 6-7 (punishment)");

  if (incomplete.length > 0) {
    return {
      ruleId: "VR-R3-013",
      type: "HARD_BLOCK",
      field: "item9",
      message: `The following items must be completed before Item 9 can be signed: ${incomplete.join(", ")}.`,
    };
  }
  return null;
}

// ============================================================================
// Missing Phase 4 Rules (AUTO_ACTION)
// ============================================================================

/** VR-R4-002: No appeal - advance to ADMIN_COMPLETION */
export function vrR4002(): { phase: string; message: string } {
  return {
    phase: "ADMIN_COMPLETION",
    message: "No appeal filed. Case advancing to Admin Completion phase. Appeal period clock started.",
  };
}

/** VR-R4-003: Appeal intent - advance to APPEAL */
export function vrR4003(): { phase: string; message: string } {
  return {
    phase: "APPEAL",
    message: "Appeal intent recorded. Case advancing to Appeal phase. Five-day stay clock will start when appeal is filed (Item 13).",
  };
}

/** VR-R4-004: Item 12 refusal handling */
export function vrR4004(): { message: string } {
  return {
    message: "Accused refused to indicate understanding of appeal rights. This has been noted on the form. The Commanding Officer will sign Item 12 noting the refusal. The NJP is final and valid.",
  };
}

// ============================================================================
// Missing Phase 5 Rules
// ============================================================================

/** VR-R5-002: JA review log requirements */
export function vrR5002(reviewerName: string | undefined, reviewDate: string | undefined): ValidationResult | null {
  if (!reviewerName || !reviewDate) {
    return {
      ruleId: "VR-R5-002",
      type: "HARD_BLOCK",
      field: "ja_review",
      message: "JA reviewer name and review date are required to log the judge advocate review.",
    };
  }
  // Check date not in future
  if (parseISO(reviewDate) > new Date()) {
    return {
      ruleId: "VR-R5-002",
      type: "HARD_BLOCK",
      field: "ja_review_date",
      message: "JA review date cannot be in the future.",
    };
  }
  return null;
}

/** VR-R5-005: Appeal outcome required */
export function vrR5005(outcome: string | undefined, outcomeDetail: string | undefined): ValidationResult | null {
  if (!outcome) {
    return {
      ruleId: "VR-R5-005",
      type: "HARD_BLOCK",
      field: "appeal_outcome",
      message: "An appeal outcome must be selected.",
    };
  }
  if (outcome === "PARTIAL_RELIEF" && !outcomeDetail) {
    return {
      ruleId: "VR-R5-005",
      type: "HARD_BLOCK",
      field: "appeal_outcome_detail",
      message: "Specific relief granted must be described when partial relief is selected.",
    };
  }
  return null;
}

// ============================================================================
// Missing Phase 7 Rules
// ============================================================================

/** VR-R7-004: OMPF confirmation must be by IPAC_ADMIN */
export function vrR7004(userRole: string): ValidationResult | null {
  if (userRole !== "IPAC_ADMIN" && userRole !== "SUITE_ADMIN") {
    return {
      ruleId: "VR-R7-004",
      type: "HARD_BLOCK",
      field: "ompf_confirmation",
      message: "OMPF scan confirmation must be completed by an IPAC Administrator.",
    };
  }
  return null;
}

// ============================================================================
// Missing System Rules
// ============================================================================

/** VR-SYS-001: Item 6/7 correction role lock */
export function vrSys001(
  userRole: string,
  userId: string,
  caseNjpAuthorityId: string | null
): ValidationResult | null {
  if (userRole !== "NJP_AUTHORITY" || userId !== caseNjpAuthorityId) {
    return {
      ruleId: "VR-SYS-001",
      type: "HARD_BLOCK",
      field: "punishment",
      message: "Corrections to Items 6 and 7 may only be made by the officer who imposed the punishment per NAVMC 10132 Item 6 instructions. This action requires the NJP Authority user role for this specific case.",
    };
  }
  return null;
}

/** VR-SYS-002: Post-lock edit block */
export function vrSys002(lockedItems: string[], attemptedItem: string): ValidationResult | null {
  if (lockedItems.includes(attemptedItem)) {
    return {
      ruleId: "VR-SYS-002",
      type: "HARD_BLOCK",
      field: `item_${attemptedItem}`,
      message: "This item has been locked by a signature event and cannot be modified digitally. Per MCO 5800.16 para 011104, corrections must be made in ink on the physical form, initialed by the appropriate officer, and the corrected form must be scanned and uploaded to this case record.",
    };
  }
  return null;
}

/** VR-SYS-004: Item 21 entry confirmation required */
export function vrSys004(hasPendingEntries: boolean): ValidationResult | null {
  if (hasPendingEntries) {
    return {
      ruleId: "VR-SYS-004",
      type: "HARD_BLOCK",
      field: "item21",
      message: "The Item 21 entry below has been generated. Review and confirm before it is written to the case record.",
    };
  }
  return null;
}

/** VR-SYS-005: No case deletion */
export function vrSys005(): ValidationResult {
  return {
    ruleId: "VR-SYS-005",
    type: "HARD_BLOCK",
    field: "case",
    message: "Case records cannot be permanently deleted. A case may only be marked as DESTROYED if no punishment was imposed per NAVMC 10132 Item 6 instructions.",
  };
}

/** VR-SYS-007: Unit-based access control */
export function vrSys007(
  userRole: string,
  userUnitId: string,
  caseUnitId: string,
  userEdipi?: string,
  accusedEdipi?: string
): ValidationResult | null {
  // SUITE_ADMIN has full access
  if (userRole === "SUITE_ADMIN") return null;
  // IPAC_ADMIN sees routed cases (handled at query level)
  if (userRole === "IPAC_ADMIN") return null;
  // ACCUSED only sees own case
  if (userRole === "ACCUSED") {
    if (userEdipi && accusedEdipi && userEdipi === accusedEdipi) return null;
    return {
      ruleId: "VR-SYS-007",
      type: "HARD_BLOCK",
      field: "case_access",
      message: "You do not have access to this case.",
    };
  }
  // Unit-based access
  if (userUnitId !== caseUnitId) {
    return {
      ruleId: "VR-SYS-007",
      type: "HARD_BLOCK",
      field: "case_access",
      message: "You do not have access to this case.",
    };
  }
  return null;
}

/** VR-SYS-008: Document availability by phase */
export function vrSys008(
  documentType: string,
  currentPhase: string,
  formLocked: boolean
): ValidationResult | null {
  const phaseOrder = ["INITIATION", "RIGHTS_ADVISEMENT", "HEARING", "NOTIFICATION", "APPEAL", "REMEDIAL_ACTION", "ADMIN_COMPLETION", "VACATION", "CLOSED"];
  const currentIdx = phaseOrder.indexOf(currentPhase);

  if (documentType === "CHARGE_SHEET" || documentType === "OFFICE_HOURS_SCRIPT") {
    if (currentIdx < 1) {
      return {
        ruleId: "VR-SYS-008",
        type: "HARD_BLOCK",
        field: "document",
        message: `This document is not yet available. ${documentType === "CHARGE_SHEET" ? "Charge Sheet" : "Office Hours Script"} becomes available after Phase 1 completion.`,
      };
    }
  }
  if (documentType === "NAVMC_10132" && formLocked) {
    // Final version only after Item 16
    return null; // Available
  }

  return null;
}

// ============================================================================
// Controlled Vocabulary Validation (VR-CV-*)
// ============================================================================

const VALID_RANKS = new Set([
  "Pvt", "PFC", "LCpl", "Cpl", "Sgt", "SSgt", "GySgt", "MSgt",
  "1stSgt", "MGySgt", "SgtMaj", "WO", "CWO2", "CWO3", "CWO4", "CWO5",
  "2ndLt", "1stLt", "Capt", "Maj", "LtCol", "Col", "BGen", "MajGen",
  "LtGen", "Gen",
]);

const VALID_GRADES = new Set([
  "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9",
  "W1", "W2", "W3", "W4", "W5",
  "O1", "O1E", "O2", "O2E", "O3", "O3E", "O4", "O5", "O6",
  "O7", "O8", "O9", "O10",
]);

/** VR-CV-001: Rank/grade controlled vocabulary */
export function vrCv001(rank: string | undefined, grade: string | undefined): ValidationResult | null {
  if (rank && !VALID_RANKS.has(rank)) {
    return {
      ruleId: "VR-CV-001",
      type: "HARD_BLOCK",
      field: "rank",
      message: "Invalid rank entered. Select from the approved list.",
    };
  }
  if (grade && !VALID_GRADES.has(grade)) {
    return {
      ruleId: "VR-CV-001",
      type: "HARD_BLOCK",
      field: "grade",
      message: "Invalid grade entered. Select from the approved list.",
    };
  }
  return null;
}

const VALID_VICTIM_STATUS = new Set([
  "Military", "Military (spouse)", "Civilian (spouse)", "Civilian (dependent)",
  "Civilian (DON employee)", "Civilian (other)", "Other", "Unknown",
]);
const VALID_VICTIM_SEX = new Set(["Male", "Female", "Unknown"]);
const VALID_VICTIM_RACE = new Set([
  "American Indian or Alaskan Native", "Asian", "Black or African American",
  "Native Hawaiian or Other Pacific Islander", "White", "Other", "Unknown",
]);
const VALID_VICTIM_ETHNICITY = new Set(["Hispanic or Latino", "Not Hispanic or Latino", "Unknown"]);

/** VR-CV-002: Victim demographics controlled vocabulary */
export function vrCv002(status?: string, sex?: string, race?: string, ethnicity?: string): ValidationResult | null {
  if (status && !VALID_VICTIM_STATUS.has(status)) {
    return { ruleId: "VR-CV-002", type: "HARD_BLOCK", field: "victim_status", message: "Invalid value for victim status. Select from the approved options." };
  }
  if (sex && !VALID_VICTIM_SEX.has(sex)) {
    return { ruleId: "VR-CV-002", type: "HARD_BLOCK", field: "victim_sex", message: "Invalid value for victim sex. Select from the approved options." };
  }
  if (race && !VALID_VICTIM_RACE.has(race)) {
    return { ruleId: "VR-CV-002", type: "HARD_BLOCK", field: "victim_race", message: "Invalid value for victim race. Select from the approved options." };
  }
  if (ethnicity && !VALID_VICTIM_ETHNICITY.has(ethnicity)) {
    return { ruleId: "VR-CV-002", type: "HARD_BLOCK", field: "victim_ethnicity", message: "Invalid value for victim ethnicity. Select from the approved options." };
  }
  return null;
}

/** VR-CV-003: Approved abbreviations for punishment text (AUTO_ACTION) */
export const APPROVED_ABBREVIATIONS: Record<string, string> = {
  confinement: "conf",
  confined: "conf",
  "correctional custody": "cust",
  duty: "du",
  forfeitures: "forf",
  forfeiture: "forf",
  from: "fr",
  forwarded: "fwd",
  recommending: "rec",
  reduction: "red",
  reduced: "red",
  restriction: "restr",
  restricted: "restr",
  suspension: "susp",
  suspended: "susp",
  without: "w/o",
};

export function applyAbbreviations(text: string): string {
  let result = text;
  for (const [full, abbr] of Object.entries(APPROVED_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${full}\\b`, "gi");
    result = result.replace(regex, abbr);
  }
  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/** Generate case number: UNIT_ABBREV-YYYY-NNNN */
export function generateCaseNumber(unitAbbreviation: string, year: number, seq: number): string {
  return `${unitAbbreviation}-${year}-${String(seq).padStart(4, "0")}`;
}

/** Calculate suspension end date */
export function calculateSuspensionEndDate(startDate: string, months: number): string {
  return addMonths(parseISO(startDate), months).toISOString().split("T")[0];
}
