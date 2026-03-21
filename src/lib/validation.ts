import { differenceInDays, addMonths, addDays, parseISO } from "date-fns";
import type {
  Grade,
  CommanderGradeCategory,
  PunishmentEntry,
  PunishmentLimits,
  Offense,
  NjpCase,
  CasePhase,
  CaseStatus,
  JA_REVIEW_THRESHOLDS,
  PUNISHMENT_LIMITS,
} from "@/types";
import {
  getCommanderGradeCategory,
  getGradeNumber,
} from "@/types";

// ============================================================================
// Validation Engine for LegalFlow
// Implements all MCO 5800.16 validation rules
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  rule: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  rule: string;
}

// --- Statute of Limitations Check ---
export function checkStatuteOfLimitations(offenseDate: string): ValidationWarning | null {
  const days = differenceInDays(new Date(), parseISO(offenseDate));
  if (days > 730) {
    return {
      field: "offenseDate",
      message:
        "Offense may be outside NJP statute of limitations per MCO 5800.16 para 010702. Verify before proceeding.",
      rule: "STATUTE_OF_LIMITATIONS",
    };
  }
  return null;
}

// --- Double Punishment Check ---
export function checkDoublePunishment(
  edipi: string,
  article: string,
  offenseDate: string,
  existingCases: { accusedEdipi: string; offenses: { ucmjArticle: string; offenseDate: string }[] }[]
): ValidationWarning | null {
  for (const c of existingCases) {
    if (c.accusedEdipi !== edipi) continue;
    for (const o of c.offenses) {
      if (o.ucmjArticle === article && o.offenseDate === offenseDate) {
        return {
          field: "offense",
          message:
            "Prior NJP action detected for this offense. Double punishment is prohibited under Article 15, UCMJ.",
          rule: "DOUBLE_PUNISHMENT",
        };
      }
    }
  }
  return null;
}

// --- EDIPI Validation ---
export function validateEdipi(edipi: string): ValidationError | null {
  if (!/^\d{10}$/.test(edipi)) {
    return {
      field: "edipi",
      message: "EDIPI must be exactly 10 digits.",
      rule: "EDIPI_FORMAT",
    };
  }
  return null;
}

// --- Item 3 Date Check ---
export function validateItem3Date(
  item3Date: string | undefined,
  item6Date: string | undefined
): ValidationError | null {
  if (!item3Date || !item6Date) return null;
  if (parseISO(item3Date) > parseISO(item6Date)) {
    return {
      field: "item3Date",
      message:
        "Item 3 must be signed before or on the date of punishment imposition per MCO 5800.16 para 011105.C.",
      rule: "ITEM3_BEFORE_ITEM6",
    };
  }
  return null;
}

// --- Item 11 Date Check ---
export function validateItem11Date(
  item11Date: string | undefined,
  item6Date: string | undefined
): ValidationError | null {
  if (!item11Date || !item6Date) return null;
  if (parseISO(item11Date) < parseISO(item6Date)) {
    return {
      field: "item11Date",
      message:
        "Item 11 cannot be dated before the date of punishment imposition per MCO 5800.16 para 011105.K.",
      rule: "ITEM11_AFTER_ITEM6",
    };
  }
  return null;
}

// --- Punishment Validation ---
const PUNISHMENT_LIMITS_MAP: Record<CommanderGradeCategory, Record<string, number>> = {
  FIELD_GRADE_AND_ABOVE: {
    CORRECTIONAL_CUSTODY: 30,
    EXTRA_DUTIES: 45,
    RESTRICTION: 60,
  },
  COMPANY_GRADE: {
    CORRECTIONAL_CUSTODY: 7,
    EXTRA_DUTIES: 14,
    RESTRICTION: 14,
  },
};

export function validatePunishment(
  punishment: PunishmentEntry,
  commanderGradeCategory: CommanderGradeCategory,
  accusedGrade: Grade
): ValidationError[] {
  const errors: ValidationError[] = [];
  const limits = PUNISHMENT_LIMITS_MAP[commanderGradeCategory];

  // Duration limits
  if (punishment.duration !== undefined) {
    const limit = limits[punishment.type];
    if (limit !== undefined && punishment.duration > limit) {
      errors.push({
        field: "punishment",
        message: `Entered punishment exceeds maximum authorized for ${commanderGradeCategory === "FIELD_GRADE_AND_ABOVE" ? "Major and above" : "Captain/Lieutenant and below"} imposing officer. Maximum is ${limit} days.`,
        rule: "PUNISHMENT_LIMIT",
      });
    }
  }

  // Reduction checks
  if (punishment.type === "REDUCTION") {
    const gradeNum = getGradeNumber(accusedGrade);
    // E6 (gradeNum=6) and above cannot be reduced
    if (accusedGrade.startsWith("E") && gradeNum >= 6) {
      errors.push({
        field: "punishment",
        message:
          "Reduction in paygrade may not be imposed on Marines in grade E-6 or above per MCO 5800.16 para 010302.C.",
        rule: "REDUCTION_E6_BLOCK",
      });
    }
    // Verify reduction is only one grade
    if (punishment.reducedToGrade) {
      const reducedNum = getGradeNumber(punishment.reducedToGrade);
      if (gradeNum - reducedNum > 1) {
        errors.push({
          field: "punishment",
          message:
            "Reduction may only be to the next inferior paygrade.",
          rule: "REDUCTION_ONE_GRADE",
        });
      }
    }
  }

  // Forfeiture must be whole dollars
  if (punishment.type === "FORFEITURE" && punishment.amount !== undefined) {
    if (punishment.amount !== Math.floor(punishment.amount)) {
      errors.push({
        field: "punishment",
        message:
          "Forfeiture must be expressed in whole dollar amounts only per MCO 5800.16 para 010901.",
        rule: "FORFEITURE_WHOLE_DOLLARS",
      });
    }
  }

  return errors;
}

// --- JA Review Check ---
export function checkJaReviewRequired(punishments: PunishmentEntry[], accusedGrade: Grade): boolean {
  for (const p of punishments) {
    if (p.type === "ARREST_IN_QUARTERS" && p.duration && p.duration > 7) return true;
    if (p.type === "CORRECTIONAL_CUSTODY" && p.duration && p.duration > 7) return true;
    if (p.type === "FORFEITURE" && p.duration && p.duration > 7) return true;
    if (p.type === "REDUCTION" && accusedGrade.startsWith("E") && getGradeNumber(accusedGrade) >= 4) return true;
    if (p.type === "EXTRA_DUTIES" && p.duration && p.duration > 14) return true;
    if (p.type === "RESTRICTION" && p.duration && p.duration > 14) return true;
    if (p.type === "DETENTION_OF_PAY" && p.duration && p.duration > 14) return true;
  }
  return false;
}

// --- Five-Day Stay Clock ---
export function checkFiveDayStay(
  item13Date: string | undefined,
  item14SignedAt: string | undefined,
  punishments: PunishmentEntry[]
): { alertNeeded: boolean; restrictionStay: boolean; extraDutiesStay: boolean } {
  if (!item13Date || item14SignedAt) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  const daysSinceAppeal = differenceInDays(new Date(), parseISO(item13Date));
  if (daysSinceAppeal < 5) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  const hasRestriction = punishments.some(
    (p) => p.type === "RESTRICTION" && !p.suspended
  );
  const hasExtraDuties = punishments.some(
    (p) => p.type === "EXTRA_DUTIES" && !p.suspended
  );
  return {
    alertNeeded: hasRestriction || hasExtraDuties,
    restrictionStay: hasRestriction,
    extraDutiesStay: hasExtraDuties,
  };
}

// --- Suspension End Date ---
export function calculateSuspensionEndDate(
  njpDate: string,
  suspensionMonths: number
): string {
  return addMonths(parseISO(njpDate), suspensionMonths).toISOString().split("T")[0];
}

// --- Four-Month Remedial Window ---
export function checkRemedialWindow(executionDate: string): {
  withinWindow: boolean;
  daysRemaining: number;
} {
  const endDate = addDays(parseISO(executionDate), 120); // ~4 months
  const daysRemaining = differenceInDays(endDate, new Date());
  return {
    withinWindow: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

// --- Phase Transition Validation ---
export function canTransitionToPhase(
  currentCase: { currentPhase: CasePhase; status: CaseStatus } & Record<string, unknown>,
  targetPhase: CasePhase
): { allowed: boolean; reason?: string } {
  const phaseOrder: CasePhase[] = [
    "INITIATION",
    "RIGHTS_ADVISEMENT",
    "HEARING",
    "NOTIFICATION",
    "APPEAL",
    "REMEDIAL_ACTIONS",
    "ADMIN_COMPLETION",
    "VACATION_OF_SUSPENSION",
  ];

  const currentIdx = phaseOrder.indexOf(currentCase.currentPhase);
  const targetIdx = phaseOrder.indexOf(targetPhase);

  // Special case: REMEDIAL_ACTIONS and VACATION_OF_SUSPENSION can be accessed non-sequentially
  if (targetPhase === "REMEDIAL_ACTIONS" || targetPhase === "VACATION_OF_SUSPENSION") {
    if (currentIdx < 2) {
      return { allowed: false, reason: "Remedial actions require punishment to have been imposed." };
    }
    return { allowed: true };
  }

  // Normal sequential check (allow skipping APPEAL if no appeal)
  if (targetPhase === "ADMIN_COMPLETION" && currentCase.currentPhase === "NOTIFICATION") {
    return { allowed: true }; // Skip appeal if not appealing
  }

  if (targetIdx !== currentIdx + 1) {
    return {
      allowed: false,
      reason: `Cannot skip from ${currentCase.currentPhase} to ${targetPhase}. Phases must proceed sequentially.`,
    };
  }

  return { allowed: true };
}

// --- Locked Items Check ---
export function getLockedItems(signedItems: string[]): number[] {
  const locked = new Set<number>();

  if (signedItems.includes("item2")) {
    [1, 2, 17, 18, 19, 20, 22, 23, 24, 25].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("item3")) {
    [1, 2, 3, 17, 18, 19, 20, 22, 23, 24, 25].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("item9")) {
    for (let i = 1; i <= 9; i++) locked.add(i);
    [17, 18, 19, 20, 22, 23, 24, 25].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("item11")) {
    [10, 11].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("item12")) {
    locked.add(12);
  }
  if (signedItems.includes("item14")) {
    [13, 14].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("item16")) {
    // Lock entire form
    for (let i = 1; i <= 25; i++) locked.add(i);
  }

  return Array.from(locked).sort((a, b) => a - b);
}

// --- Case Number Generator ---
export function generateCaseNumber(unit: string, year: number, seq: number): string {
  return `${unit}-${year}-${String(seq).padStart(4, "0")}`;
}
