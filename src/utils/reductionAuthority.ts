// =============================================================================
// Reduction Authority Validation
// MCO 5800.16 V14 para 010302.C + MCO P1400.32D para 1200.3b
// =============================================================================

export type ServiceBranch = "USMC" | "USN";
export type CommanderGradeLevel = "COMPANY_GRADE" | "FIELD_GRADE_AND_ABOVE";

export interface ReductionCheckResult {
  blocked: boolean;
  reason: "STATUTORY" | "PROMOTION_AUTHORITY" | null;
  message: string;
  citation: string;
}

// Mechanism 1: statutory prohibition — no one can reduce these at NJP
const USMC_STATUTORY_BLOCKED = ["E6", "E7", "E8", "E9"];
const USN_STATUTORY_BLOCKED = ["E7", "E8", "E9"];

// Mechanism 2: promotion authority — grades requiring field grade to reduce
const USMC_NEEDS_FIELD_GRADE = ["E5"];
const USN_NEEDS_FIELD_GRADE = ["E5", "E6"];

export function checkReductionAuthority(
  grade: string,
  service: ServiceBranch,
  commanderGradeLevel: CommanderGradeLevel
): ReductionCheckResult {
  // Mechanism 1 — statutory check first
  const statuteBlocked =
    service === "USMC"
      ? USMC_STATUTORY_BLOCKED.includes(grade)
      : USN_STATUTORY_BLOCKED.includes(grade);

  if (statuteBlocked) {
    return {
      blocked: true,
      reason: "STATUTORY",
      message:
        service === "USMC"
          ? "Marines in the grade of E-6 or above may not be reduced in paygrade at NJP per MCO 5800.16 para 010302.C."
          : "Sailors in the grade of E-7 or above may not be reduced in paygrade at NJP per MCO 5800.16 para 010302.C.",
      citation: "MCO 5800.16 para 010302.C",
    };
  }

  // Mechanism 2 — promotion authority check
  const needsFieldGrade =
    service === "USMC"
      ? USMC_NEEDS_FIELD_GRADE.includes(grade)
      : USN_NEEDS_FIELD_GRADE.includes(grade);

  if (needsFieldGrade && commanderGradeLevel === "COMPANY_GRADE") {
    const rankLabel =
      service === "USMC" && grade === "E5"
        ? "Sgt (E-5)"
        : service === "USN" && grade === "E5"
          ? "PO2 (E-5)"
          : service === "USN" && grade === "E6"
            ? "PO1 (E-6)"
            : grade;
    return {
      blocked: true,
      reason: "PROMOTION_AUTHORITY",
      message: `Reduction from ${rankLabel} requires a Field Grade or above imposing officer. A Company Grade officer does not hold promotion authority over this grade per MCO P1400.32D para 1200.3b.`,
      citation: "MCO P1400.32D para 1200.3b",
    };
  }

  return { blocked: false, reason: null, message: "", citation: "" };
}

export function getReductionLimitNote(
  service: ServiceBranch,
  commanderGradeLevel: CommanderGradeLevel
): string {
  if (service === "USMC") {
    return commanderGradeLevel === "COMPANY_GRADE"
      ? "USMC / Company Grade: eligible grades are E-4 (Cpl) and below. E-5 requires field grade. E-6 and above are prohibited per MCO 5800.16 para 010302.C."
      : "USMC / Field Grade: eligible grades are E-5 (Sgt) and below. E-6 (SSgt) and above are prohibited per MCO 5800.16 para 010302.C.";
  }
  return commanderGradeLevel === "COMPANY_GRADE"
    ? "USN / Company Grade: eligible grades are E-4 (PO3) and below. E-5 and E-6 require field grade. E-7 and above are prohibited per MCO 5800.16 para 010302.C."
    : "USN / Field Grade: eligible grades are E-6 (PO1) and below. E-7 (CPO) and above are prohibited per MCO 5800.16 para 010302.C.";
}

// JEPES: USMC E1-E4 only. USN not covered regardless of grade.
export const JEPES_ELIGIBLE_GRADES = ["E1", "E2", "E3", "E4"];

export function isJepesApplicable(
  preReductionGrade: string,
  service: ServiceBranch,
  reductionImposed: boolean,
  guiltyFinding: boolean
): boolean {
  return (
    reductionImposed &&
    guiltyFinding &&
    service === "USMC" &&
    JEPES_ELIGIBLE_GRADES.includes(preReductionGrade)
  );
}
