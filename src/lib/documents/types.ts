import type { Rank, Grade, CommanderGradeLevel } from "@/types";

// NAVMC 10132 version variants
export type Navmc10132Version = "PARTIAL" | "HEARING" | "FINAL";

// Distribution copy type for final generation
export type DistributionType = "E-SRB" | "OMPF" | "FILES" | "MEMBER";

export interface CaseData {
  // -- Case identification --
  caseNumber: string;
  caseId: string;

  // -- Accused (Items 17-20, 23-25) --
  accusedLastName: string;
  accusedFirstName: string;
  accusedMiddleName: string;
  accusedRank: Rank;
  accusedGrade: Grade;
  accusedEdipi: string;
  accusedUnit: string;
  accusedUnitGcmca: string;
  component: string;

  // -- NJP Authority (Items 8-8B) --
  njpAuthorityName?: string;
  njpAuthorityTitle?: string;
  njpAuthorityUnit?: string;
  njpAuthorityRank?: string;
  njpAuthorityGrade?: string;
  commanderGradeLevel: CommanderGradeLevel;

  // -- Vessel exception --
  vesselException: boolean;

  // -- Offenses (Item 1) with findings (Item 5) --
  offenses: {
    letter: string;
    ucmjArticle: string;
    offenseType: string;
    summary: string;
    fromDate: string;
    fromTime: string;
    toDate: string;
    toTime: string;
    offensePlace: string;
    finding?: string;
    // Item 5 fields for Art 85/86
    desertionMarksApplied?: boolean;
    dfrDate?: string;
    terminationMethod?: string;
    terminationDate?: string;
    terminationLocation?: string;
    intent?: string;
    victims: {
      letter: string;
      status: string;
      sex: string;
      race: string;
      ethnicity: string;
    }[];
  }[];

  // -- Item 2: Rights advisement / election --
  item2ElectionAccepted?: boolean;
  item2CounselConsulted?: boolean;
  item2SignedDate?: string;
  item2RefusalNoted?: boolean;
  item2CoSignedInstead?: boolean;
  item2SignerName?: string;

  // -- Item 3: CO certification --
  item3SignedDate?: string;
  item3SignerName?: string;

  // -- Item 4: UA/Desertion --
  uaApplicable: boolean;
  uaPeriodStart?: string;
  uaPeriodEnd?: string;
  desertionMarks?: string;

  // -- Item 6: Punishment --
  item6Punishments: {
    type: string;
    duration?: number;
    amount?: number;
    months?: number;
    reducedToGrade?: string;
    reducedToRank?: string;
    reducedFromGrade?: string;
    suspended: boolean;
    suspensionMonths?: number;
  }[];
  item6Date?: string;
  punishmentText?: string;

  // -- Item 7: Suspension --
  item7SuspensionDetails?: string;
  item7SuspensionMonths?: number;
  item7SuspensionStartDate?: string;
  item7SuspensionEndDate?: string;
  item7RemissionTerms?: string;

  // -- Item 9: NJP authority signature --
  item9SignedDate?: string;
  item9SignerName?: string;

  // -- Item 10: Notification --
  dateNoticeToAccused?: string;

  // -- Item 11: NJP authority notification signature --
  item11SignedDate?: string;
  item11SignerName?: string;

  // -- Item 12: Appeal intent --
  appealIntent?: string;
  item12SignedDate?: string;
  item12SignerName?: string;

  // -- Item 13: Appeal filed --
  appealNotFiled: boolean;
  appealFiledDate?: string;

  // -- Item 14: Appeal authority decision --
  appealAuthorityName?: string;
  appealAuthorityRank?: string;
  appealAuthoritySignedDate?: string;
  appealOutcome?: string;
  appealOutcomeDetail?: string;

  // -- Item 15: Appeal decision notice --
  dateNoticeAppealDecision?: string;
  accusedTransferred: boolean;

  // -- Item 16: Admin completion --
  item16SignedDate?: string;
  item16UdNumber?: string;
  item16Dtd?: string;
  item16SignerName?: string;

  // -- Item 21: Remarks --
  item21Entries: {
    entryDate: string;
    entryText: string;
  }[];

  // -- NJP date --
  njpDate?: string;

  // -- Preparer info --
  preparerName?: string;
  preparerTitle?: string;

  // -- Vacation data (for Figure 14-1) --
  vacationRecord?: {
    vacationDate: string;
    coName: string;
    coTitle: string;
    originalSuspendedPunishment: string;
    originalSuspensionDate: string;
    vacatedInFull: boolean;
    vacatedPortion?: string;
    triggeringUcmjArticle: string;
    triggeringOffenseSummary: string;
    triggeringOffenseDate: string;
    pocName?: string;
    pocContact?: string;
  };

  // -- Remedial action data (for MMRP notification) --
  remedialAction?: {
    actionType: string;
    actionDate: string;
    actionAuthorityName: string;
    punishmentAffected: string;
    actionDetail: string;
    reason?: string;
    restorationLanguage?: string;
  };
}
