// ============================================================================
// LegalFlow Type Definitions
// Based on MCO 5800.16 Volume 14, NAVMC 10132 (REV. 08-2023)
// Aligned with LegalFlow Data Models v1.0
// ============================================================================

// --- Roles ---
export type UserRole =
  | "INITIATOR"
  | "ADMIN"
  | "NJP_AUTHORITY"
  | "ACCUSED"
  | "APPEAL_AUTHORITY"
  | "IPAC_ADMIN"
  | "SUITE_ADMIN";

// --- Case Status ---
export type CaseStatus =
  | "INITIATED"
  | "REFERRED_COURT_MARTIAL"
  | "RIGHTS_ADVISED"
  | "PUNISHMENT_IMPOSED"
  | "NOTIFICATION_COMPLETE"
  | "APPEAL_PENDING"
  | "APPEAL_COMPLETE"
  | "REMEDIAL_ACTION_PENDING"
  | "CLOSED"
  | "CLOSED_SUSPENSION_ACTIVE"
  | "CLOSED_SUSPENSION_VACATED"
  | "CLOSED_SUSPENSION_REMITTED"
  | "DESTROYED";

// --- Case Phase ---
export type CasePhase =
  | "INITIATION"
  | "RIGHTS_ADVISEMENT"
  | "HEARING"
  | "NOTIFICATION"
  | "APPEAL"
  | "REMEDIAL_ACTION"
  | "ADMIN_COMPLETION"
  | "VACATION"
  | "CLOSED";

// --- Commander Grade Level ---
export type CommanderGradeLevel = "FIELD_GRADE_AND_ABOVE" | "COMPANY_GRADE";

// --- Component ---
export type Component = "ACTIVE" | "SMCR" | "IRR";

// --- Rank/Grade ---
export const RANKS = [
  "Pvt", "PFC", "LCpl", "Cpl", "Sgt", "SSgt", "GySgt", "MSgt",
  "1stSgt", "MGySgt", "SgtMaj", "WO", "CWO2", "CWO3", "CWO4", "CWO5",
  "2ndLt", "1stLt", "Capt", "Maj", "LtCol", "Col", "BGen", "MajGen",
  "LtGen", "Gen",
] as const;
export type Rank = (typeof RANKS)[number];

export const GRADES = [
  "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9",
  "W1", "W2", "W3", "W4", "W5",
  "O1", "O1E", "O2", "O2E", "O3", "O3E", "O4", "O5", "O6",
  "O7", "O8", "O9", "O10",
] as const;
export type Grade = (typeof GRADES)[number];

export const RANK_TO_GRADE: Record<Rank, Grade> = {
  Pvt: "E1", PFC: "E2", LCpl: "E3", Cpl: "E4", Sgt: "E5",
  SSgt: "E6", GySgt: "E7", MSgt: "E8", "1stSgt": "E8",
  MGySgt: "E9", SgtMaj: "E9",
  WO: "W1", CWO2: "W2", CWO3: "W3", CWO4: "W4", CWO5: "W5",
  "2ndLt": "O1", "1stLt": "O2", Capt: "O3", Maj: "O4",
  LtCol: "O5", Col: "O6", BGen: "O7", MajGen: "O8",
  LtGen: "O9", Gen: "O10",
};

export function getGradeNumber(grade: Grade): number {
  const num = parseInt(grade.replace(/[EOW]/g, ""), 10);
  if (grade.startsWith("E")) return num;
  if (grade.startsWith("W")) return 10 + num;
  return 20 + num;
}

// --- Commander Grade Level Determination ---
// Per Section 5.1: COMPANY_GRADE: O1, O1E, O2, O2E, O3, O3E
// FIELD_GRADE_AND_ABOVE: O4 and above, W1 and above
export function getCommanderGradeLevel(grade: Grade): CommanderGradeLevel {
  if (grade.startsWith("W")) return "FIELD_GRADE_AND_ABOVE";
  if (grade.startsWith("O")) {
    const num = parseInt(grade.replace(/[OE]/g, ""), 10);
    if (num >= 4) return "FIELD_GRADE_AND_ABOVE";
  }
  return "COMPANY_GRADE";
}

// --- UCMJ Articles ---
export const UCMJ_ARTICLES = [
  "77", "77a", "78", "79", "80", "81", "82", "83", "84", "85", "86",
  "87", "87a", "87b", "88", "89", "90", "91", "92", "93", "93a",
  "94", "95", "95a", "96", "97", "98", "99", "100", "101", "102",
  "103", "103a", "103b", "104", "104a", "104b", "105", "105a",
  "106", "106a", "107", "107a", "108", "108a", "109", "109a",
  "110", "111", "112", "112a", "113", "114", "115", "116", "117",
  "117a", "118", "119", "119a", "119b", "120", "120a", "120b",
  "120c", "121", "121a", "121b", "122", "122a", "123", "123a",
  "124", "124a", "124b", "125", "126", "127", "128", "128a",
  "128b", "129", "130", "131", "131a", "131b", "131c", "131d",
  "131e", "131f", "131g", "132", "133", "134",
] as const;
export type UcmjArticle = (typeof UCMJ_ARTICLES)[number];

// --- Victim Demographics ---
export type VictimStatus =
  | "Military"
  | "Military (spouse)"
  | "Civilian (spouse)"
  | "Civilian (dependent)"
  | "Civilian (DON employee)"
  | "Civilian (other)"
  | "Other"
  | "Unknown";

export type VictimSex = "Male" | "Female" | "Unknown";

export type VictimRace =
  | "American Indian or Alaskan Native"
  | "Asian"
  | "Black or African American"
  | "Native Hawaiian or Other Pacific Islander"
  | "White"
  | "Other"
  | "Unknown";

export type VictimEthnicity =
  | "Hispanic or Latino"
  | "Not Hispanic or Latino"
  | "Unknown";

// --- Punishment Limits by Commander Grade (Section 5.2) ---
export const PUNISHMENT_LIMITS = {
  COMPANY_GRADE: {
    corrCustodyDays: 7,
    forfeitureDays: 7,
    extraDutiesDays: 14,
    restrictionDays: 14,
  },
  FIELD_GRADE_AND_ABOVE: {
    corrCustodyDays: 30,
    forfeitureMonths: 2,
    extraDutiesDays: 45,
    restrictionDays: 60,
  },
} as const;

// --- JA Review Thresholds (Section 5.3) ---
export const JA_REVIEW_THRESHOLDS = {
  arrestQuartersDays: 7,
  corrCustodyDays: 7,
  forfeitureDays: 7,
  reductionFromGrade: "E4" as Grade,
  extraDutiesDays: 14,
  restrictionDays: 14,
  detentionDays: 14,
};

// --- Appeal Outcome ---
export type AppealOutcome =
  | "DENIED"
  | "DENIED_UNTIMELY"
  | "GRANTED_SET_ASIDE"
  | "PARTIAL_RELIEF"
  | "REDUCTION_SET_ASIDE_ONLY";

// --- Appeal Intent ---
export type AppealIntent =
  | "INTENDS_TO_APPEAL"
  | "DOES_NOT_INTEND"
  | "REFUSED_TO_SIGN";

// --- Item 21 Entry Types ---
export type Item21EntryType =
  | "ADDITIONAL_OFFENSE"
  | "FORWARDING_RECOMMENDATION"
  | "SUSPENSION_VACATED"
  | "STAY_RESTRICTION"
  | "STAY_EXTRA_DUTIES"
  | "APPEAL_DENIED"
  | "APPEAL_GRANTED"
  | "SET_ASIDE"
  | "ADDITIONAL_VICTIM"
  | "OTHER";

// --- Remedial Action Types ---
export type RemedialActionType =
  | "SET_ASIDE"
  | "MITIGATION"
  | "SUSPENSION_OF_EXECUTED"
  | "SUSPENSION_REMISSION";

// --- Suspension Status ---
export type SuspensionStatus = "NONE" | "ACTIVE" | "VACATED" | "REMITTED";

// --- Monitor Status ---
export type MonitorStatus = "ACTIVE" | "VACATED" | "REMITTED";

// --- Signature Method ---
export type SignatureMethod = "ELECTRONIC" | "PHYSICAL_SCANNED" | "REFUSED";

// --- Document Types ---
export type DocumentType =
  | "NAVMC_10132"
  | "CHARGE_SHEET"
  | "OFFICE_HOURS_SCRIPT"
  | "FIGURE_14_1"
  | "MMRP_NOTIFICATION"
  | "VACATION_RECORD"
  | "PHYSICAL_SCAN"
  | "SET_ASIDE_LETTER"
  | "OTHER";

// --- Admonition Types ---
export type AdmonitionType =
  | "ORAL_ADMONITION"
  | "WRITTEN_ADMONITION"
  | "ORAL_REPRIMAND"
  | "WRITTEN_REPRIMAND";

// --- Audit Log Actions ---
export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "SIGN"
  | "LOCK"
  | "GENERATE"
  | "ROUTE"
  | "VIEW";

// --- SMCR Forfeiture Calculator ---
export interface SmcrForfeitureInput {
  drillPay: number;
  drillsInSixtyDays: number;
  activeDutyBasicPay: number;
  activeDutyDaysInSixtyDays: number;
  njpDate: string;
  commanderGradeLevel: CommanderGradeLevel;
}

export interface SmcrForfeitureResult {
  maxForfeiture: number;
  formula: string;
  sixtyDayEndDate: string;
}

// --- Dashboard Case ---
export interface DashboardCase {
  id: string;
  caseNumber: string;
  marineName: string;
  marineGrade: string;
  ucmjArticles: string[];
  status: CaseStatus;
  currentPhase: CasePhase;
  daysInCurrentPhase: number;
  nextActionRequired: string;
  nextActionOwner: UserRole;
  overdue: boolean;
  suspensionActive: boolean;
  jaReviewRequired: boolean;
}
