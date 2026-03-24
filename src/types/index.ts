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
  | "SUITE_ADMIN"
  | "NJP_PREPARER"
  | "CERTIFIER_REVIEWER"
  | "CERTIFIER";

// --- Case Status ---
export type CaseStatus =
  | "INITIATED"
  | "REFERRED_COURT_MARTIAL"
  | "RIGHTS_ADVISED"
  | "PUNISHMENT_IMPOSED"
  | "NOTIFICATION_COMPLETE"
  | "APPEAL_PENDING"
  | "APPEAL_DECIDED"
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

// --- Unit Echelon ---
export type UnitEchelon = "COMPANY" | "BATTALION" | "REGIMENT" | "INSTALLATION";

// --- Unit Definition ---
export interface UnitDef {
  id: string;
  name: string;
  echelon: UnitEchelon;
  parentUnitId: string | null;
  /** Installation units do not initiate NJP — they only receive appeals */
  canInitiateNjp: boolean;
}

// --- Component ---
export type Component = "ACTIVE" | "SMCR" | "IRR";

// --- Service Branch ---
export type ServiceBranch = "USMC" | "USN";

// --- Rank/Grade ---

// Marine Corps Ranks
export const USMC_RANKS = [
  "Pvt", "PFC", "LCpl", "Cpl", "Sgt", "SSgt", "GySgt", "MSgt",
  "1stSgt", "MGySgt", "SgtMaj", "WO", "CWO2", "CWO3", "CWO4", "CWO5",
  "2ndLt", "1stLt", "Capt", "Maj", "LtCol", "Col", "BGen", "MajGen",
  "LtGen", "Gen",
] as const;
export type UsmcRank = (typeof USMC_RANKS)[number];

// Navy Ranks
export const NAVY_RANKS = [
  "SR", "SA", "SN", "PO3", "PO2", "PO1", "CPO", "SCPO", "MCPO",
  "WO1", "CWO2", "CWO3", "CWO4", "CWO5",
  "ENS", "LTJG", "LT", "LCDR", "CDR", "CAPT", "RDML", "RADM",
  "VADM", "ADM",
] as const;
export type NavyRank = (typeof NAVY_RANKS)[number];

// Combined ranks (all branches, deduplicated)
export const RANKS = [
  ...USMC_RANKS,
  ...NAVY_RANKS.filter((r) => !(USMC_RANKS as readonly string[]).includes(r)),
] as const;
export type Rank = UsmcRank | NavyRank;

export const GRADES = [
  "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9",
  "W1", "W2", "W3", "W4", "W5",
  "O1", "O1E", "O2", "O2E", "O3", "O3E", "O4", "O5", "O6",
  "O7", "O8", "O9", "O10",
] as const;
export type Grade = (typeof GRADES)[number];

export const USMC_RANK_TO_GRADE: Record<UsmcRank, Grade> = {
  Pvt: "E1", PFC: "E2", LCpl: "E3", Cpl: "E4", Sgt: "E5",
  SSgt: "E6", GySgt: "E7", MSgt: "E8", "1stSgt": "E8",
  MGySgt: "E9", SgtMaj: "E9",
  WO: "W1", CWO2: "W2", CWO3: "W3", CWO4: "W4", CWO5: "W5",
  "2ndLt": "O1", "1stLt": "O2", Capt: "O3", Maj: "O4",
  LtCol: "O5", Col: "O6", BGen: "O7", MajGen: "O8",
  LtGen: "O9", Gen: "O10",
};

export const NAVY_RANK_TO_GRADE: Record<NavyRank, Grade> = {
  SR: "E1", SA: "E2", SN: "E3", PO3: "E4", PO2: "E5",
  PO1: "E6", CPO: "E7", SCPO: "E8", MCPO: "E9",
  WO1: "W1", CWO2: "W2", CWO3: "W3", CWO4: "W4", CWO5: "W5",
  ENS: "O1", LTJG: "O2", LT: "O3", LCDR: "O4",
  CDR: "O5", CAPT: "O6", RDML: "O7", RADM: "O8",
  VADM: "O9", ADM: "O10",
};

export const RANK_TO_GRADE: Record<Rank, Grade> = {
  ...USMC_RANK_TO_GRADE,
  ...NAVY_RANK_TO_GRADE,
};

// Combined rank/grade options for single dropdown (e.g. "E3/LCpl")
export const USMC_RANK_GRADE_OPTIONS = USMC_RANKS.map((r) => ({
  rank: r as Rank,
  grade: USMC_RANK_TO_GRADE[r],
  label: `${USMC_RANK_TO_GRADE[r]}/${r}`,
  branch: "USMC" as ServiceBranch,
}));

export const NAVY_RANK_GRADE_OPTIONS = NAVY_RANKS.map((r) => ({
  rank: r as Rank,
  grade: NAVY_RANK_TO_GRADE[r],
  label: `${NAVY_RANK_TO_GRADE[r]}/${r}`,
  branch: "USN" as ServiceBranch,
}));

export const RANK_GRADE_OPTIONS = [...USMC_RANK_GRADE_OPTIONS, ...NAVY_RANK_GRADE_OPTIONS];

export function getRankGradeOptionsByBranch(branch: ServiceBranch) {
  return branch === "USMC" ? USMC_RANK_GRADE_OPTIONS : NAVY_RANK_GRADE_OPTIONS;
}

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

export const UCMJ_ARTICLE_NAMES: Record<string, string> = {
  "77": "Principals",
  "77a": "Principals (Accessory after the fact)",
  "78": "Accessory after the fact",
  "79": "Conviction of offense charged, lesser included offenses, and attempts",
  "80": "Attempts",
  "81": "Conspiracy",
  "82": "Soliciting commission of offenses",
  "83": "Fraudulent enlistment, appointment, or separation",
  "84": "Unlawful enlistment, appointment, or separation",
  "85": "Desertion",
  "86": "Absence without leave",
  "87": "Missing movement; jumping from vessel",
  "87a": "Resistance, flight, breach of arrest, and escape",
  "87b": "Offenses against correctional custody and restriction",
  "88": "Contempt toward officials",
  "89": "Disrespect toward superior commissioned officer",
  "90": "Willfully disobeying superior commissioned officer",
  "91": "Insubordinate conduct toward NCO/PO/WO",
  "92": "Failure to obey order or regulation",
  "93": "Cruelty and maltreatment",
  "93a": "Prohibited activities with military recruit or trainee",
  "94": "Mutiny or sedition",
  "95": "Offenses by sentinel or lookout",
  "95a": "Disrespect toward sentinel or lookout",
  "96": "Release of prisoner without authority; drinking with prisoner",
  "97": "Unlawful detention",
  "98": "Misconduct as prisoner",
  "99": "Misbehavior before the enemy",
  "100": "Subordinate compelling surrender",
  "101": "Improper use of countersign",
  "102": "Forcing a safeguard",
  "103": "Spies",
  "103a": "Espionage",
  "103b": "Aiding the enemy",
  "104": "Public records offenses",
  "104a": "Fraudulent enlistment (wartime)",
  "104b": "Unlawful enlistment (wartime)",
  "105": "Misconduct as prisoner (wartime)",
  "105a": "False or unauthorized pass offenses",
  "106": "Impersonation of officer, noncommissioned or petty officer, or agent or official",
  "106a": "Wearing unauthorized insignia, decoration, badge, ribbon, device, or lapel button",
  "107": "False official statements",
  "107a": "Parole violation",
  "108": "Military property — loss, damage, destruction, or wrongful disposition",
  "108a": "Captured or abandoned property",
  "109": "Property other than military property — waste, spoilage, or destruction",
  "109a": "Mail matter — Loss, destruction, etc.",
  "110": "Improper hazarding of vessel or aircraft",
  "111": "Leaving scene of vehicle accident",
  "112": "Drunkenness — Loss, destruction, etc.",
  "112a": "Wrongful use, possession, etc., of controlled substances",
  "113": "Drunken or reckless operation of vehicle, aircraft, or vessel",
  "114": "Endangerment offenses",
  "115": "Communicating threats",
  "116": "Riot or breach of peace",
  "117": "Provoking speeches or gestures",
  "117a": "Wrongful broadcast or distribution of intimate visual images",
  "118": "Murder",
  "119": "Manslaughter",
  "119a": "Death or injury of an unborn child",
  "119b": "Child endangerment",
  "120": "Rape and sexual assault generally",
  "120a": "Mails: deposit of obscene matter",
  "120b": "Rape and sexual assault of a child",
  "120c": "Other sexual misconduct",
  "121": "Larceny and wrongful appropriation",
  "121a": "Fraudulent use of credit cards, debit cards, and other access devices",
  "121b": "False pretenses to obtain services",
  "122": "Robbery",
  "122a": "Receiving stolen property",
  "123": "Offenses concerning government computers",
  "123a": "Making, drawing, or uttering check, draft, or order without sufficient funds",
  "124": "Maiming",
  "124a": "Assault",
  "124b": "Kidnapping",
  "125": "Arson",
  "126": "Burglary",
  "127": "Extortion",
  "128": "Assault consummated by a battery",
  "128a": "Domestic violence",
  "128b": "Aggravated assault",
  "129": "Burglary; unlawful entry",
  "130": "Stalking",
  "131": "Perjury",
  "131a": "Subornation of perjury",
  "131b": "Obstructing justice",
  "131c": "Misprision of serious offense",
  "131d": "Wrongful refusal to testify",
  "131e": "Prevention of authorized seizure of property",
  "131f": "Noncompliance with procedural rules",
  "131g": "Wrongful interference with adverse administrative proceeding",
  "132": "Retaliation",
  "133": "Conduct unbecoming an officer",
  "134": "General article (Disorders and neglects)",
};

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

// --- CY26 NJP Active Duty Max Forfeitures ---
// Service year breakpoints for table columns
export const FORFEITURE_SERVICE_YEARS = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20] as const;

// A. 7 DAYS — Company Grade Commander
const CO_GRADE_FORFEITURES: Record<string, number[]> = {
  E0:  [519, 519, 519, 519, 519, 519, 519, 519, 519, 519, 519, 519, 519],
  E1:  [561, 561, 561, 561, 561, 561, 561, 561, 561, 561, 561, 561, 561],
  E2:  [629, 629, 629, 629, 629, 629, 629, 629, 629, 629, 629, 629, 629],
  E3:  [661, 661, 703, 746, 746, 746, 746, 746, 746, 746, 746, 746, 746],
  E4:  [733, 733, 770, 812, 853, 890, 890, 890, 890, 890, 890, 890, 890],
  E5:  [780, 780, 839, 881, 920, 959, 1003, 1025, 1031, 1031, 1031, 1031, 1031],
  E6:  [793, 793, 873, 911, 949, 988, 1076, 1110, 1176, 1197, 1211, 1229, 1229],
  E7:  [917, 917, 1001, 1039, 1090, 1130, 1198, 1236, 1304, 1361, 1400, 1441, 1457],
  E8:  [1319, 1319, 1319, 1319, 1319, 1319, 1319, 1378, 1414, 1457, 1504, 1589, 1632],
  E9:  [1612, 1612, 1612, 1612, 1612, 1612, 1612, 1612, 1648, 1694, 1749, 1803, 1891],
  W1:  [946, 946, 1048, 1075, 1133, 1202, 1302, 1350, 1416, 1480, 1531, 1578, 1635],
  W2:  [1078, 1078, 1180, 1211, 1233, 1303, 1411, 1465, 1518, 1583, 1634, 1680, 1735],
  W3:  [1218, 1218, 1269, 1321, 1338, 1393, 1500, 1612, 1665, 1726, 1788, 1901, 1977],
  W4:  [1334, 1334, 1435, 1476, 1517, 1587, 1656, 1726, 1831, 1923, 2011, 2083, 2153],
  W5:  [2372, 2372, 2372, 2372, 2372, 2372, 2372, 2372, 2372, 2372, 2372, 2372, 2372],
  O1:  [968, 968, 1008, 1218, 1218, 1218, 1218, 1218, 1218, 1218, 1218, 1218, 1218],
  O1E: [1218, 1218, 1218, 1218, 1218, 1301, 1349, 1398, 1446, 1513, 1513, 1513, 1513],
  O2:  [1115, 1115, 1270, 1463, 1513, 1544, 1544, 1544, 1544, 1544, 1544, 1544, 1544],
  O2E: [1513, 1513, 1513, 1513, 1513, 1544, 1593, 1676, 1740, 1788, 1788, 1788, 1788],
  O3:  [1291, 1291, 1463, 1579, 1722, 1805, 1895, 1954, 2050, 2100, 2100, 2100, 2100],
  O3E: [1722, 1722, 1722, 1722, 1722, 1805, 1895, 1954, 2050, 2131, 2178, 2242, 2242],
  O4:  [1468, 1468, 1700, 1813, 1838, 1944, 2057, 2198, 2307, 2383, 2427, 2452, 2452],
  O5:  [1702, 1702, 1917, 2050, 2075, 2158, 2207, 2316, 2396, 2500, 2657, 2733, 2807],
};

// B. 15 DAYS — Field Grade Commander & Above
const FIELD_GRADE_FORFEITURES: Record<string, number[]> = {
  E0:  [1112, 1112, 1112, 1112, 1112, 1112, 1112, 1112, 1112, 1112, 1112, 1112, 1112],
  E1:  [1203, 1203, 1203, 1203, 1203, 1203, 1203, 1203, 1203, 1203, 1203, 1203, 1203],
  E2:  [1348, 1348, 1348, 1348, 1348, 1348, 1348, 1348, 1348, 1348, 1348, 1348, 1348],
  E3:  [1418, 1418, 1507, 1599, 1599, 1599, 1599, 1599, 1599, 1599, 1599, 1599, 1599],
  E4:  [1571, 1571, 1651, 1741, 1829, 1907, 1907, 1907, 1907, 1907, 1907, 1907, 1907],
  E5:  [1671, 1671, 1799, 1887, 1973, 2055, 2149, 2197, 2210, 2210, 2210, 2210, 2210],
  E6:  [1700, 1700, 1871, 1954, 2034, 2117, 2306, 2379, 2521, 2565, 2596, 2633, 2633],
  E7:  [1966, 1966, 2145, 2228, 2336, 2421, 2567, 2650, 2795, 2917, 3000, 3088, 3122],
  E8:  [2828, 2828, 2828, 2828, 2828, 2828, 2828, 2953, 3030, 3123, 3224, 3405, 3497],
  E9:  [3455, 3455, 3455, 3455, 3455, 3455, 3455, 3455, 3533, 3631, 3748, 3865, 4052],
  W1:  [2028, 2028, 2246, 2305, 2429, 2576, 2792, 2893, 3034, 3173, 3282, 3383, 3505],
  W2:  [2310, 2310, 2529, 2596, 2643, 2792, 3025, 3141, 3254, 3393, 3502, 3600, 3718],
  W3:  [2611, 2611, 2720, 2832, 2868, 2985, 3215, 3455, 3568, 3698, 3832, 4075, 4238],
  W4:  [2859, 2859, 3076, 3164, 3251, 3400, 3549, 3699, 3924, 4121, 4309, 4464, 4614],
  W5:  [5084, 5084, 5084, 5084, 5084, 5084, 5084, 5084, 5084, 5084, 5084, 5084, 5084],
  O1:  [2075, 2075, 2160, 2611, 2611, 2611, 2611, 2611, 2611, 2611, 2611, 2611, 2611],
  O1E: [2611, 2611, 2611, 2611, 2611, 2788, 2891, 2996, 3100, 3242, 3242, 3242, 3242],
  O2:  [2391, 2391, 2723, 3136, 3242, 3308, 3308, 3308, 3308, 3308, 3308, 3308, 3308],
  O2E: [3242, 3242, 3242, 3242, 3242, 3308, 3414, 3591, 3729, 3831, 3831, 3831, 3831],
  O3:  [2767, 2767, 3136, 3385, 3691, 3868, 4062, 4187, 4394, 4502, 4502, 4502, 4502],
  O3E: [3691, 3691, 3691, 3691, 3691, 3868, 4062, 4187, 4394, 4568, 4668, 4804, 4804],
  O4:  [3147, 3147, 3643, 3886, 3940, 4166, 4408, 4710, 4944, 5107, 5200, 5254, 5254],
  O5:  [3647, 3647, 4109, 4393, 4447, 4624, 4730, 4964, 5135, 5357, 5695, 5856, 6016],
};

/** Resolve the column index for a given number of years of service */
function forfeitureColumnIndex(yearsOfService: number): number {
  let idx = 0;
  for (let i = 0; i < FORFEITURE_SERVICE_YEARS.length; i++) {
    if (yearsOfService >= FORFEITURE_SERVICE_YEARS[i]) idx = i;
  }
  return idx;
}

/** Look up the CY26 max forfeiture amount for a given grade, commander level, and years of service */
export function getMaxForfeiture(
  accusedGrade: string,
  commanderGradeLevel: CommanderGradeLevel,
  yearsOfService?: number
): number | null {
  const table = commanderGradeLevel === "COMPANY_GRADE" ? CO_GRADE_FORFEITURES : FIELD_GRADE_FORFEITURES;
  const row = table[accusedGrade];
  if (!row) return null;
  const col = forfeitureColumnIndex(yearsOfService ?? 0);
  return row[col];
}

// --- YOS Calculation ---
// Years of Service = floor((NJP date or current date) - AFADBD) in whole years
export function computeYearsOfService(afadbd: string, referenceDate?: string): number {
  const start = new Date(afadbd).getTime();
  const end = referenceDate ? new Date(referenceDate).getTime() : Date.now();
  return Math.floor((end - start) / (365.25 * 24 * 60 * 60 * 1000));
}

// --- UPB Standard Abbreviations ---
export const UPB_ABBREVIATIONS: Record<string, string> = {
  conf: "confinement / confined",
  cust: "correctional custody",
  du: "duty",
  forf: "forfeitures",
  fr: "from",
  fwd: "forwarded",
  rec: "recommending",
  red: "reduction / reduced",
  restr: "restriction / restricted",
  susp: "suspension / suspended",
  "w/o": "without",
};

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
  | "GRANTED"
  // Legacy values kept for backward compatibility with existing records
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
