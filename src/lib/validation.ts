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
