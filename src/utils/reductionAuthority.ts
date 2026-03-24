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

// Mechanism 2: ALL reducible grades require field grade (major and above).
// MCO P1400.32D para 1200.3b: promotion authority = major and above only.
// Company grade (O-3 and below) holds ZERO promotion authority over ANY enlisted grade.
const GRADES_REQUIRING_FIELD_GRADE_USMC = ["E2", "E3", "E4", "E5"];
const GRADES_REQUIRING_FIELD_GRADE_USN = ["E2", "E3", "E4", "E5", "E6"];

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
      citation: "MCO 5800.16 V14 para 010302.C",
    };
  }

  // Mechanism 2 — company grade cannot reduce any grade
  if (commanderGradeLevel === "COMPANY_GRADE") {
    const reducible =
      service === "USMC"
        ? GRADES_REQUIRING_FIELD_GRADE_USMC.includes(grade)
        : GRADES_REQUIRING_FIELD_GRADE_USN.includes(grade);

    if (reducible) {
      return {
        blocked: true,
        reason: "PROMOTION_AUTHORITY",
        message:
          "Reduction at NJP requires a Field Grade (Major and above) imposing officer. Company Grade officers hold no promotion authority over any enlisted grade per MCO P1400.32D para 1200.3b. Reduction cannot be imposed by this commander.",
        citation: "MCO P1400.32D para 1200.3b",
      };
    }
  }

  return { blocked: false, reason: null, message: "", citation: "" };
}

export function getReductionLimitNote(
  service: ServiceBranch,
  commanderGradeLevel: CommanderGradeLevel
): string {
  if (commanderGradeLevel === "COMPANY_GRADE") {
    return "Company Grade officers hold no promotion authority over any enlisted grade per MCO P1400.32D para 1200.3b. Reduction requires a Field Grade (Major and above) imposing officer.";
  }
  if (service === "USMC") {
    return "USMC / Field Grade: reduction eligible for E-5 (Sgt) and below. E-6 (SSgt) and above are prohibited per MCO 5800.16 para 010302.C.";
  }
  return "USN / Field Grade: reduction eligible for E-6 (PO1) and below. E-7 (CPO) and above are prohibited per MCO 5800.16 para 010302.C.";
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
