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

// --- UCMJ Articles (matches NAVMC 10132 PDF dropdown options exactly) ---
export const UCMJ_ARTICLES = [
  "Art. 78  Accessory after the fact",
  "Art. 80  Attempts",
  "Art. 81  Conspiracy",
  "Art. 82  Soliciting commission of offenses",
  "Art. 83  Malingering",
  "Art. 83  Self-injury with intent to avoid service",
  "Art. 84  Breach of medical quarantine",
  "Art. 85  Desertion",
  "Art. 86  Absence without leave",
  "Art. 86  Absence without leave >30 days",
  "Art. 86  Absence (intent to abandon guard or watch)",
  "Art. 86  Absence (intent to avoid maneuvers or exercise)",
  "Art. 87  Missing movement",
  "Art. 87  Jumping from vessel",
  "Art. 87a  Resistance, flight, breach of arrest, and escape",
  "Art. 87b  Escape/breach correctional custody",
  "Art. 87b  Breach of restriction",
  "Art. 88  Contempt toward officials",
  "Art. 89  Disrespect of sup. comm. officer",
  "Art. 89  Assault of sup. comm. officer",
  "Art. 90  Willfully disobeying sup. comm. officer",
  "Art. 91  Assault of WO/NCO",
  "Art. 91  Disobeying WO/NCO",
  "Art. 91  Disrespect toward WO/NCO",
  "Art. 92  Viol. MCO 5354.1 (series) (Harassment)",
  "Art. 92  Viol. MCO 5354.1 (series) (Bullying)",
  "Art. 92  Viol. MCO 5354.1 (series) (Hazing)",
  "Art. 92  Viol. MCO 5354.1 (series) (Unlawful Discrimination)",
  "Art. 92  Viol. MCO 5354.1 (series) (Sexual Harassment)",
  "Art. 92  Viol. MCO 5354.1 (series) (Dissident Activity)",
  "Art. 92  Viol. MCO 5354.1 (series) (Wrongful Distribution of Intimate Images)",
  "Art. 92  Viol. SECNAVINST 5300.28 (series) (Controlled Substance)",
  "Art. 92  Viol. SECNAVINST 5300.28 (series) (OTC Substance)",
  "Art. 92  Viol. SECNAVINST 5300.28 (series) (Natural Substance)",
  "Art. 92  Viol. SECNAVINST 5300.28 (series) (Paraphernalia)",
  "Art. 92  Viol. USNR 1165 (Fraternization)",
  "Art. 92  Viol. USNR 1166 (Sexual Harassment)",
  "Art. 92  Viol. USNR 1167 (Supremacist Activities)",
  "Art. 92  Viol. USNR 1168 (Intimate Images)",
  "Art. 92  Viol. ALNAV 074/20 (Hemp Use)",
  "Art. 92  Viol. DoDI 1325.06 (Extremism/Protest)",
  "Art. 92  Viol. DoDI 1344.10 (Political Activities)",
  "Art. 92  Failure to obey general order or regulation",
  "Art. 92  Failure to obey other order or regulation",
  "Art. 92  Dereliction of duty by neglect",
  "Art. 92  Willful dereliction of duty",
  "Art. 93  Cruelty and maltreatment",
  "Art. 93a  Prohibited activities with recruit or trainee",
  "Art. 94  Mutiny or sedition",
  "Art. 95  Drunk on post",
  "Art. 95  Sleeping on post",
  "Art. 95  Loitering by post",
  "Art. 95a  Disrespect towards sentinel or lookout",
  "Art. 96  Release of prisoner without authority",
  "Art. 96  Drinking with prisoner",
  "Art. 97  Unlawful detention",
  "Art. 98  Misconduct as prisoner",
  "Art. 99  Misbehavior before enemy",
  "Art. 100  Subordinate compelling surrender",
  "Art. 101  Improper use of countersign",
  "Art. 102  Forcing a safeguard",
  "Art. 103  Spies",
  "Art. 103a  Espionage",
  "Art. 103b  Aiding the enemy",
  "Art. 104  Public records offenses",
  "Art. 104a  Fraudulent enlistment, appointment, or separation",
  "Art. 104b  Unlawful enlistment, appointment, or separation",
  "Art. 105  Forgery",
  "Art. 105a  False or unauthorized pass offenses",
  "Art. 106  Impersonation",
  "Art. 106a  Wearing unauthorized insignia",
  "Art. 107  False official statements",
  "Art. 107  False swearing",
  "Art. 107a  Parole violation",
  "Art. 108  Selling military property",
  "Art. 108  Selling military property (firearm/explosive)",
  "Art. 108  Damaging, etc., military property by neglect ≤ $1000",
  "Art. 108  Damaging, etc., military property by neglect > $1000",
  "Art. 108  Damaging, etc., military property willfully",
  "Art. 108a  Captured or abandoned property",
  "Art. 108a  Looting or pillaging",
  "Art. 109  Waste, spoilage, destruction of other property",
  "Art. 110  Improper hazarding of vessel or aircraft",
  "Art. 111  Leaving scene of vehicle accident",
  "Art. 112  Drunk on duty",
  "Art. 112  Drunkenness and other incapacitation",
  "Art. 112a  Wrongful use, possession, etc. of controlled substances",
  "Art. 113  Drunken or reckless operation of vehicle, aircraft, or vessel",
  "Art. 114  Endangerment offenses",
  "Art. 115  Communicating threats",
  "Art. 116  Riot",
  "Art. 116  Breach of peace",
  "Art. 117  Provoking speeches or gestures",
  "Art. 117a  Wrongful broadcast or distribution of intimate visual image",
  "Art. 118  Murder",
  "Art. 119  Manslaughter",
  "Art. 119a  Death of unborn child",
  "Art. 119a  Injury of unborn child",
  "Art. 119b  Child endangerment",
  "Art. 120  Rape and sexual assault",
  "Art. 120  Sexual assault",
  "Art. 120  Aggravated sexual contact",
  "Art. 120  Abusive sexual contact",
  "Art. 120a  Mail deposit of obscene matter",
  "Art. 120b  Rape of a child",
  "Art. 120b  Sexual assault of a child",
  "Art. 120b  Sexual abuse of a child",
  "Art. 120c  Indecent viewing",
  "Art. 120c  Indecent recording",
  "Art. 120c  Distribution of indecent recording",
  "Art. 120c  Forcible pandering",
  "Art. 120c  Indecent exposure",
  "Art. 121  Larceny and wrongful appropriation",
  "Art. 121a  Fraudulent use of credit cards, etc.",
  "Art. 121b  False pretenses to obtain services",
  "Art. 122  Robbery",
  "Art. 122a  Receiving stolen property",
  "Art. 123  Offenses concerning government computers",
  "Art. 123a  Check without sufficient funds (fraudulent intent)",
  "Art. 124  Frauds against the United States",
  "Art. 124a  Bribery",
  "Art. 124b  Graft",
  "Art. 125  Kidnapping",
  "Art. 126  Arson",
  "Art. 126  Burning property with intent to defraud",
  "Art. 127  Extortion",
  "Art. 128  Simple assault (no battery, no weapon)",
  "Art. 128  Assault",
  "Art. 128a  Maiming",
  "Art. 128b  Domestic violence",
  "Art. 129  Burglary",
  "Art. 129  Unlawful entry",
  "Art. 130  Stalking",
  "Art. 131  Perjury",
  "Art. 131a  Subornation of perjury",
  "Art. 131b  Obstruction of justice",
  "Art. 131c  Misprision of serious offense",
  "Art. 131d  Wrongful refusal to testify",
  "Art. 131e  Prevention of authorized seizure of property",
  "Art. 131f  Noncompliance with procedural rules",
  "Art. 131g  Wrongful interference with adverse administrative proceedings",
  "Art. 132  Retaliation",
  "Art. 133  Conduct unbecoming an officer",
  "Art. 134  General Article",
  "Art. 134  General Article Clause 1",
  "Art. 134  General Article Clause 2",
  "Art. 134  General Article Clause 3",
  "Art. 134  Animal abuse",
  "Art. 134  Bigamy",
  "Art. 134  Worthless check (bad faith in maintaining funds)",
  "Art. 134  Child pornography",
  "Art. 134  Dishonorably failing to pay debt",
  "Art. 134  Disloyal statements",
  "Art. 134  Disorderly conduct",
  "Art. 134  Drunk and disorderly conduct",
  "Art. 134  Drunk and disorderly conduct aboard ship",
  "Art. 134  Drunkenness",
  "Art. 134  Extramarital sexual conduct",
  "Art. 134  Negligent discharge of firearm",
  "Art. 134  Fraternization",
  "Art. 134  Gambling with subordinate",
  "Art. 134  Negligent homicide",
  "Art. 134  Indecent conduct",
  "Art. 134  Indecent language",
  "Art. 134  Pandering and prostitution",
  "Art. 134  Self-injury without intent to avoid service",
  "Art. 134  Sexual harassment",
  "Art. 134  Straggling",
] as const;
export type UcmjArticle = (typeof UCMJ_ARTICLES)[number];

/** Extract just the article number from a full UCMJ option string.
 *  e.g. "Art. 86  Absence without leave" → "86" */
export function ucmjArticleNumber(value: string): string {
  const m = value.match(/^Art\.\s*(\d+\w*)/);
  return m ? m[1] : value;
}

/** Extract the offense description from a full UCMJ option string.
 *  e.g. "Art. 86  Absence without leave" → "Absence without leave" */
export function ucmjOffenseName(value: string): string {
  const m = value.match(/^Art\.\s*\d+\w?\s{2}(.+)$/);
  return m ? m[1] : value;
}

/** Legacy lookup — map old-style article numbers to names (for backward compat with existing data). */
export const UCMJ_ARTICLE_NAMES: Record<string, string> = {};
for (const opt of UCMJ_ARTICLES) {
  const num = ucmjArticleNumber(opt);
  // Only store first match per article number (generic name)
  if (!UCMJ_ARTICLE_NAMES[num]) {
    UCMJ_ARTICLE_NAMES[num] = ucmjOffenseName(opt);
  }
}

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

// --- JEPES RD Occasion Record (MCO 1616.1) ---
export interface JepesRecord {
  rdOccasionRequired: boolean;
  rdOccasionCompleted: boolean;
  rdOccasionCompletedBy: string | null;
  rdOccasionCompletedDate: string | null;
  previousRank: string | null;
  previousGrade: string | null;
  newRank: string | null;
  newGrade: string | null;
}

// --- JEPES Scope (E1-E4 only; E5+ falls under PES) ---
export const JEPES_GRADES: Grade[] = ["E1", "E2", "E3", "E4"];

// Preferred grade→rank mapping (first enlisted rank for each grade)
export const USMC_GRADE_TO_RANK: Partial<Record<Grade, UsmcRank>> = {
  E1: "Pvt", E2: "PFC", E3: "LCpl", E4: "Cpl", E5: "Sgt",
  E6: "SSgt", E7: "GySgt", E8: "MSgt", E9: "MGySgt",
};
export const NAVY_GRADE_TO_RANK: Partial<Record<Grade, NavyRank>> = {
  E1: "SR", E2: "SA", E3: "SN", E4: "PO3", E5: "PO2",
  E6: "PO1", E7: "CPO", E8: "SCPO", E9: "MCPO",
};

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
