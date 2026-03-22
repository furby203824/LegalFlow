import { differenceInDays, addMonths, addDays, parseISO } from "date-fns";
import type {
  Grade,
  CommanderGradeLevel,
} from "@/types";
import { getGradeNumber } from "@/types";

// ============================================================================
// Validation Engine for LegalFlow
// Implements all MCO 5800.16 validation rules
// Aligned with Data Models v1.0
// ============================================================================

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
  if (days > 670) {
    return {
      field: "offenseDate",
      message:
        "Offense is within 60 days of the 2-year NJP statute of limitations. Verify before proceeding.",
      rule: "STATUTE_OF_LIMITATIONS_WARNING",
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

// --- Punishment Validation (per Data Models Section 5.2) ---
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
}

export function validatePunishment(
  p: PunishmentInput,
  commanderGradeLevel: CommanderGradeLevel,
  accusedGrade: Grade
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (commanderGradeLevel === "COMPANY_GRADE") {
    if (p.corrCustodyDays && p.corrCustodyDays > 7) {
      errors.push({
        field: "corrCustodyDays",
        message: "Correctional custody exceeds maximum 7 days for company grade imposing officer.",
        rule: "PUNISHMENT_LIMIT",
      });
    }
    if (p.extraDutiesDays && p.extraDutiesDays > 14) {
      errors.push({
        field: "extraDutiesDays",
        message: "Extra duties exceeds maximum 14 days for company grade imposing officer.",
        rule: "PUNISHMENT_LIMIT",
      });
    }
    if (p.restrictionDays && p.restrictionDays > 14) {
      errors.push({
        field: "restrictionDays",
        message: "Restriction exceeds maximum 14 days for company grade imposing officer.",
        rule: "PUNISHMENT_LIMIT",
      });
    }
  } else {
    if (p.corrCustodyDays && p.corrCustodyDays > 30) {
      errors.push({
        field: "corrCustodyDays",
        message: "Correctional custody exceeds maximum 30 days for field grade and above imposing officer.",
        rule: "PUNISHMENT_LIMIT",
      });
    }
    if (p.extraDutiesDays && p.extraDutiesDays > 45) {
      errors.push({
        field: "extraDutiesDays",
        message: "Extra duties exceeds maximum 45 days for field grade and above imposing officer.",
        rule: "PUNISHMENT_LIMIT",
      });
    }
    if (p.restrictionDays && p.restrictionDays > 60) {
      errors.push({
        field: "restrictionDays",
        message: "Restriction exceeds maximum 60 days for field grade and above imposing officer.",
        rule: "PUNISHMENT_LIMIT",
      });
    }
  }

  // Reduction checks
  if (p.reductionImposed) {
    const gradeNum = getGradeNumber(accusedGrade);
    if (accusedGrade.startsWith("E") && gradeNum >= 6) {
      errors.push({
        field: "reduction",
        message:
          "Reduction in paygrade may not be imposed on Marines in grade E-6 or above per MCO 5800.16 para 010302.C.",
        rule: "REDUCTION_E6_BLOCK",
      });
    }
    if (p.reductionToGrade) {
      const reducedNum = getGradeNumber(p.reductionToGrade as Grade);
      if (gradeNum - reducedNum > 1) {
        errors.push({
          field: "reduction",
          message: "Reduction may only be to the next inferior paygrade.",
          rule: "REDUCTION_ONE_GRADE",
        });
      }
    }
  }

  // Forfeiture must be whole dollars
  if (p.forfeitureAmount !== undefined && p.forfeitureAmount !== Math.floor(p.forfeitureAmount)) {
    errors.push({
      field: "forfeitureAmount",
      message:
        "Forfeiture must be expressed in whole dollar amounts only per MCO 5800.16 para 010901.",
      rule: "FORFEITURE_WHOLE_DOLLARS",
    });
  }

  return errors;
}

// --- JA Review Check (per Data Models Section 5.3) ---
export function checkJaReviewThresholds(p: PunishmentInput, accusedGrade: Grade): {
  anyMet: boolean;
  arrestQuarters: boolean;
  corrCustody: boolean;
  forfeiture: boolean;
  reduction: boolean;
  extraDuties: boolean;
  restriction: boolean;
  detention: boolean;
} {
  const arrestQuarters = (p.arrestQuartersDays ?? 0) > 7 || (p.corrCustodyDays ?? 0) > 7;
  const corrCustody = (p.corrCustodyDays ?? 0) > 7;
  const forfeiture = (p.forfeitureAmount ?? 0) > 0 && ((p.forfeitureMonths ?? 0) > 0 || true); // simplified
  const reduction = !!p.reductionImposed && accusedGrade.startsWith("E") && getGradeNumber(accusedGrade) >= 4;
  const extraDuties = (p.extraDutiesDays ?? 0) > 14;
  const restriction = (p.restrictionDays ?? 0) > 14;
  const detention = (p.detentionDays ?? 0) > 14;

  const anyMet = arrestQuarters || corrCustody || forfeiture || reduction || extraDuties || restriction || detention;

  return { anyMet, arrestQuarters, corrCustody, forfeiture, reduction, extraDuties, restriction, detention };
}

// --- Five-Day Stay Clock ---
export function checkFiveDayStay(
  appealFiledDate: string | undefined,
  appealAuthoritySignedDate: string | undefined,
  hasRestriction: boolean,
  hasExtraDuties: boolean
): { alertNeeded: boolean; restrictionStay: boolean; extraDutiesStay: boolean } {
  if (!appealFiledDate || appealAuthoritySignedDate) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  const daysSinceAppeal = differenceInDays(new Date(), parseISO(appealFiledDate));
  if (daysSinceAppeal < 5) {
    return { alertNeeded: false, restrictionStay: false, extraDutiesStay: false };
  }
  return {
    alertNeeded: hasRestriction || hasExtraDuties,
    restrictionStay: hasRestriction,
    extraDutiesStay: hasExtraDuties,
  };
}

// --- Suspension End Date ---
export function calculateSuspensionEndDate(
  startDate: string,
  suspensionMonths: number
): string {
  return addMonths(parseISO(startDate), suspensionMonths).toISOString().split("T")[0];
}

// --- Four-Month Remedial Window ---
export function checkRemedialWindow(executionDate: string): {
  withinWindow: boolean;
  daysRemaining: number;
} {
  const endDate = addDays(parseISO(executionDate), 120);
  const daysRemaining = differenceInDays(endDate, new Date());
  return {
    withinWindow: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

// --- Locked Items by Signature ---
export function getLockedItems(signedItems: string[]): string[] {
  const locked = new Set<string>();

  if (signedItems.includes("2")) {
    ["1", "2", "17", "18", "19", "20", "22", "23", "24", "25"].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("3")) {
    ["1", "2", "3", "17", "18", "19", "20", "22", "23", "24", "25"].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("9")) {
    for (let i = 1; i <= 9; i++) locked.add(String(i));
    ["17", "18", "19", "20", "22", "23", "24", "25"].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("11")) {
    ["10", "11"].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("12")) {
    locked.add("12");
  }
  if (signedItems.includes("14")) {
    ["13", "14"].forEach((i) => locked.add(i));
  }
  if (signedItems.includes("16")) {
    for (let i = 1; i <= 25; i++) locked.add(String(i));
  }

  return Array.from(locked).sort((a, b) => parseInt(a) - parseInt(b));
}

// --- Case Number Generator ---
export function generateCaseNumber(unitAbbreviation: string, year: number, seq: number): string {
  return `${unitAbbreviation}-${year}-${String(seq).padStart(4, "0")}`;
}
