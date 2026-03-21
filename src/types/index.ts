// ============================================================================
// LegalFlow Type Definitions
// Based on MCO 5800.16 Volume 14, NAVMC 10132 (REV. 08-2023)
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
  | "REMEDIAL_ACTIONS"
  | "ADMIN_COMPLETION"
  | "VACATION_OF_SUSPENSION";

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

// --- Commander Grade Categories ---
export type CommanderGradeCategory = "FIELD_GRADE_AND_ABOVE" | "COMPANY_GRADE";

export function getCommanderGradeCategory(grade: Grade): CommanderGradeCategory {
  if (grade.startsWith("O") && getGradeNumber(grade) >= 24) {
    return "FIELD_GRADE_AND_ABOVE"; // O4+ (Major and above)
  }
  return "COMPANY_GRADE"; // O3 and below
}

// --- Component ---
export type Component = "ACTIVE_DUTY" | "SMCR";

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

export interface VictimDemographic {
  id: string;
  offenseLetter: string; // A through E
  status: VictimStatus;
  sex: VictimSex;
  race: VictimRace;
  ethnicity: VictimEthnicity;
}

// --- Offense ---
export interface Offense {
  id: string;
  letter: string; // A through E
  ucmjArticle: UcmjArticle;
  offenseType: string;
  summary: string;
  offenseDate: string; // ISO date
  offensePlace: string;
  finding?: "G" | "NG";
  victims: VictimDemographic[];
}

// --- Punishment Types ---
export type PunishmentType =
  | "CORRECTIONAL_CUSTODY"
  | "FORFEITURE"
  | "REDUCTION"
  | "EXTRA_DUTIES"
  | "RESTRICTION"
  | "ARREST_IN_QUARTERS"
  | "DETENTION_OF_PAY";

export interface PunishmentEntry {
  type: PunishmentType;
  duration?: number; // days or months depending on type
  amount?: number; // dollar amount for forfeitures
  reducedToGrade?: Grade; // for reduction
  suspended: boolean;
  suspensionMonths?: number;
}

// --- Punishment Limits ---
export interface PunishmentLimits {
  correctionalCustody: number; // max days
  forfeitureDescription: string;
  extraDuties: number; // max days
  restriction: number; // max days
  canReduce: boolean;
  reductionNote: string;
}

export const PUNISHMENT_LIMITS: Record<CommanderGradeCategory, PunishmentLimits> = {
  FIELD_GRADE_AND_ABOVE: {
    correctionalCustody: 30,
    forfeitureDescription: "Half of one month's pay per month for 2 months",
    extraDuties: 45,
    restriction: 60,
    canReduce: true,
    reductionNote: "Next inferior paygrade only. E6 and above cannot be reduced.",
  },
  COMPANY_GRADE: {
    correctionalCustody: 7,
    forfeitureDescription: "7 days' pay",
    extraDuties: 14,
    restriction: 14,
    canReduce: true,
    reductionNote: "Next inferior paygrade only. E6 and above cannot be reduced.",
  },
};

// --- JA Review Thresholds ---
export const JA_REVIEW_THRESHOLDS = {
  arrestInQuarters: 7,
  correctionalCustody: 7,
  forfeitureDays: 7,
  reductionFromGrade: "E4" as Grade,
  extraDuties: 14,
  restriction: 14,
  detentionDays: 14,
};

// --- Appeal Outcome ---
export type AppealOutcome =
  | "DENIED"
  | "DENIED_UNTIMELY"
  | "GRANTED_SET_ASIDE"
  | "REDUCTION_SET_ASIDE"
  | "PARTIAL_RELIEF";

// --- Item 21 Remark ---
export interface Item21Remark {
  id: string;
  date: string;
  itemReference: string;
  text: string;
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
}

// --- Suspension Tracker ---
export interface SuspensionRecord {
  caseId: string;
  punishment: string;
  suspensionMonths: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "VACATED" | "REMITTED";
  vacationDate?: string;
}

// --- Vacation Action Record ---
export interface VacationActionRecord {
  id: string;
  parentCaseId: string;
  marineName: string;
  edipi: string;
  rankGrade: string;
  originalNjpDate: string;
  originalSuspendedPunishment: string;
  vacationDate: string;
  commanderName: string;
  commanderTitle: string;
  vacatedInFull: boolean;
  partialDetails?: string;
  triggeringArticle: UcmjArticle;
  triggeringSummary: string;
  triggeringDate: string;
  accusedInformedOfHearing: boolean;
  accusedInformedDate?: string;
  accusedPermittedToAppear: boolean;
  notPermittedReason?: string;
  additionalPunishmentContemplated: boolean;
  newCaseId?: string;
  summaryTranscript?: string;
  commanderSignature?: string;
  commanderSignatureDate?: string;
}

// --- NJP Case (main record) ---
export interface NjpCase {
  id: string;
  caseNumber: string; // UNIT-YYYY-NNNN
  status: CaseStatus;
  currentPhase: CasePhase;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Item 1 - Offense data
  offenses: Offense[];

  // Items 17-20, 22-25 - Accused info
  accusedLastName: string;
  accusedFirstName: string;
  accusedMiddleName: string;
  accusedRank: Rank;
  accusedGrade: Grade;
  accusedEdipi: string;
  accusedUnit: string;
  accusedUnitGcmca: string;

  // Commander info
  commanderGrade: Grade;
  commanderGradeCategory: CommanderGradeCategory;
  component: Component;

  // Vessel exception
  vesselException: boolean;

  // Jurisdiction confirmation
  jurisdictionConfirmed: boolean;

  // Item 2 - Rights advisement
  item2AcceptsNjp?: boolean;
  item2CounselProvided?: boolean;
  item2AccusedRefusedToSign?: boolean;
  item2SignedBy?: string;
  item2SignedAt?: string;

  // Item 3 - CO certification
  item3SignedBy?: string;
  item3SignedAt?: string;

  // Item 4 - UA/Desertion (conditional)
  item4Applicable: boolean;
  item4UaPeriod?: string;
  item4DeserterMarks?: string;

  // Item 5 - Findings (stored per offense)

  // Item 6 - Punishment
  item6Punishments: PunishmentEntry[];
  item6Date?: string;
  item6NoPunishment?: boolean;

  // Item 7 - Suspension
  item7SuspensionDetails?: string;
  item7SuspensionEndDate?: string;

  // Items 8, 8A, 8B - NJP Authority
  item8AuthorityName?: string;
  item8AuthorityTitle?: string;
  item8AuthorityUnit?: string;
  item8AuthorityRank?: Rank;
  item8AuthorityGrade?: Grade;
  item8AuthorityEdipi?: string;

  // Item 9 - NJP Authority signature
  item9SignedBy?: string;
  item9SignedAt?: string;

  // Item 10 - Notification date
  item10Date?: string;

  // Item 11 - NJP authority signs notification
  item11SignedBy?: string;
  item11SignedAt?: string;

  // Item 12 - Accused appeal intent
  item12IntendsToAppeal?: boolean;
  item12AccusedRefusedToSign?: boolean;
  item12SignedBy?: string;
  item12SignedAt?: string;

  // Item 13 - Appeal date
  item13AppealDate?: string;

  // Item 14 - Appeal decision
  item14Outcome?: AppealOutcome;
  item14PartialReliefDetails?: string;
  item14SignedBy?: string;
  item14SignedAt?: string;

  // Item 15 - Appeal notification date
  item15Date?: string;

  // Item 16 - Admin completion
  item16SignedBy?: string;
  item16SignedAt?: string;
  item16UdNumber?: string;
  item16UdDate?: string;

  // Item 21 - Remarks
  item21Remarks: Item21Remark[];

  // JA Review
  jaReviewRequired: boolean;
  jaReviewCompleted: boolean;
  jaReviewerName?: string;
  jaReviewDate?: string;
  jaReviewSummary?: string;

  // OMPF/ESR
  ompfConfirmed: boolean;
  ompfConfirmedBy?: string;
  ompfConfirmedAt?: string;

  // Suspension tracking
  suspensionRecords: SuspensionRecord[];

  // Vacation records
  vacationRecords: VacationActionRecord[];

  // Locked items tracking
  lockedItems: number[];

  // Flags
  statuteOfLimitationsWarning: boolean;
  doublePunishmentFlag: boolean;
  fiveDayStayAlertTriggered: boolean;
}

// --- User ---
export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  unitId: string;
  edipi?: string;
  rank?: Rank;
  grade?: Grade;
}

// --- Audit Log ---
export interface AuditLogEntry {
  id: string;
  caseId: string;
  userId: string;
  action: string;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

// --- SMCR Forfeiture Calculator ---
export interface SmcrForfeitureInput {
  drillPay: number;
  drillsInSixtyDays: number;
  activeDutyBasicPay: number;
  activeDutyDaysInSixtyDays: number;
  njpDate: string;
  commanderGradeCategory: CommanderGradeCategory;
}

export interface SmcrForfeitureResult {
  maxForfeiture: number;
  formula: string;
  sixtyDayEndDate: string;
}

// --- Dashboard Column ---
export interface DashboardCase {
  caseNumber: string;
  marineName: string;
  marineGrade: Grade;
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
