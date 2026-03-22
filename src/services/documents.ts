"use client";

// Client-side document generation service
// Replaces the /api/cases/[id]/documents route

import { casesStore, auditStore, caseWithIncludes } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  generateChargeSheet,
  generateNavmc10132,
  generateOfficeHoursScript,
  generateFigure141,
  generateMmrpNotification,
  createVersionedDocument,
} from "@/lib/documents";
import type { CaseData, Navmc10132Version } from "@/lib/documents";
import type { Rank, Grade, CommanderGradeLevel } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

function buildPunishmentList(pr: Rec): CaseData["item6Punishments"] {
  const list: CaseData["item6Punishments"] = [];
  if (pr.corrCustodyDays) list.push({ type: "CORRECTIONAL_CUSTODY", duration: pr.corrCustodyDays, suspended: false });
  if (pr.forfeitureAmount) list.push({ type: "FORFEITURE", amount: pr.forfeitureAmount, months: pr.forfeitureMonths || undefined, suspended: false });
  if (pr.reductionImposed) list.push({ type: "REDUCTION", reducedToGrade: pr.reductionToGrade || undefined, reducedToRank: pr.reductionToRank || undefined, reducedFromGrade: pr.reductionFromGrade || undefined, suspended: false });
  if (pr.extraDutiesDays) list.push({ type: "EXTRA_DUTIES", duration: pr.extraDutiesDays, suspended: false });
  if (pr.restrictionDays) list.push({ type: "RESTRICTION", duration: pr.restrictionDays, suspended: false });
  if (pr.arrestQuartersDays) list.push({ type: "ARREST_IN_QUARTERS", duration: pr.arrestQuartersDays, suspended: false });
  if (pr.detentionDays) list.push({ type: "DETENTION_OF_PAY", duration: pr.detentionDays, suspended: false });
  if (pr.suspensionImposed && pr.suspensionPunishment) {
    const sp = (pr.suspensionPunishment as string).toLowerCase();
    const idx = list.findIndex((p) => sp.includes(p.type.toLowerCase().replace(/_/g, " ")));
    if (idx >= 0) { list[idx].suspended = true; list[idx].suspensionMonths = pr.suspensionMonths || undefined; }
  }
  return list;
}

export async function generateDocumentContent(
  caseId: string,
  type: string,
  version?: Navmc10132Version
): Promise<{ document: string; caseNumber: string }> {
  const session = getSession();
  if (!session) throw new Error("Authentication required");

  const rawCase = await casesStore.findById(caseId);
  if (!rawCase) throw new Error("Case not found");

  const njpCase = caseWithIncludes(rawCase);
  const sig = (item: string) => (njpCase.signatures || []).find((s: Rec) => s.itemNumber === item);
  const sig2 = sig("2"), sig3 = sig("3"), sig9 = sig("9"), sig11 = sig("11"), sig12 = sig("12"), sig16 = sig("16");
  const appeal = njpCase.appealRecord;
  const vacation = (njpCase.vacationRecordsAsParent || [])[0];
  const remedial = (njpCase.remedialActions || []).find((ra: Rec) => ra.mmrpNotificationRequired && !ra.mmrpNotificationSent) || (njpCase.remedialActions || [])[0];
  const pr = njpCase.punishmentRecord;

  const caseData: CaseData = {
    caseNumber: njpCase.caseNumber, caseId: njpCase.id,
    accusedLastName: njpCase.accused.lastName, accusedFirstName: njpCase.accused.firstName,
    accusedMiddleName: njpCase.accused.middleName || "", accusedRank: njpCase.accused.rank as Rank,
    accusedGrade: njpCase.accused.grade as Grade, accusedEdipi: njpCase.accused.edipi,
    accusedUnit: njpCase.accused.unitFullString, accusedUnitGcmca: njpCase.accused.unitFullString,
    component: rawCase.component,
    njpAuthorityName: rawCase.njpAuthorityName || undefined, njpAuthorityTitle: rawCase.njpAuthorityTitle || undefined,
    njpAuthorityUnit: rawCase.njpAuthorityUnit || undefined, njpAuthorityRank: rawCase.njpAuthorityRank || undefined,
    njpAuthorityGrade: rawCase.njpAuthorityGrade || undefined,
    commanderGradeLevel: rawCase.commanderGradeLevel as CommanderGradeLevel,
    vesselException: rawCase.vesselException,
    offenses: (njpCase.offenses || []).map((o: Rec) => ({
      letter: o.offenseLetter, ucmjArticle: o.ucmjArticle, offenseType: o.offenseType,
      summary: o.offenseSummary, offenseDate: o.offenseDate, offensePlace: o.offensePlace,
      finding: o.finding || undefined,
      victims: ((o.victims || []) as Rec[]).map((v) => ({
        letter: v.victimLetter || "", status: v.victimStatus || "Unknown",
        sex: v.victimSex || "Unknown", race: v.victimRace || "Unknown", ethnicity: v.victimEthnicity || "Unknown",
      })),
    })),
    item2ElectionAccepted: sig2 ? !sig2.refusalNoted : undefined,
    item2CounselConsulted: sig2 ? true : undefined,
    item2SignedDate: sig2?.signedDate, item2RefusalNoted: sig2?.refusalNoted,
    item2CoSignedInstead: sig2?.coSignedInstead, item2SignerName: sig2?.signerName,
    item3SignedDate: sig3?.signedDate, item3SignerName: sig3?.signerName,
    uaApplicable: rawCase.uaApplicable || false,
    uaPeriodStart: rawCase.uaPeriodStart, uaPeriodEnd: rawCase.uaPeriodEnd,
    desertionMarks: rawCase.desertionMarks,
    item6Punishments: pr ? buildPunishmentList(pr) : [], item6Date: rawCase.njpDate,
    punishmentText: pr?.punishmentText,
    item7SuspensionDetails: pr?.suspensionText, item7SuspensionMonths: pr?.suspensionMonths,
    item7SuspensionStartDate: pr?.suspensionStartDate, item7SuspensionEndDate: pr?.suspensionEndDate,
    item7RemissionTerms: pr?.suspensionRemissionTerms,
    item9SignedDate: sig9?.signedDate, item9SignerName: sig9?.signerName,
    dateNoticeToAccused: rawCase.dateNoticeToAccused,
    item11SignedDate: sig11?.signedDate, item11SignerName: sig11?.signerName,
    appealIntent: appeal?.appealIntent, item12SignedDate: appeal?.item12SignedDate || sig12?.signedDate,
    item12SignerName: sig12?.signerName,
    appealNotFiled: rawCase.appealNotFiled || false,
    appealFiledDate: appeal?.appealFiledDate || rawCase.appealFiledDate,
    appealAuthorityName: appeal?.appealAuthorityName, appealAuthorityRank: appeal?.appealAuthorityRank,
    appealAuthoritySignedDate: appeal?.appealAuthoritySignedDate,
    appealOutcome: appeal?.appealOutcome, appealOutcomeDetail: appeal?.appealOutcomeDetail,
    dateNoticeAppealDecision: rawCase.dateNoticeAppealDecision,
    accusedTransferred: rawCase.accusedTransferred || false,
    item16SignedDate: rawCase.item16SignedDate || sig16?.signedDate,
    item16UdNumber: rawCase.item16UdNumber, item16Dtd: rawCase.item16Dtd,
    item16SignerName: sig16?.signerName,
    item21Entries: (njpCase.item21Entries || []).map((e: Rec) => ({ entryDate: e.entryDate, entryText: e.entryText })),
    njpDate: rawCase.njpDate,
    vacationRecord: vacation ? {
      vacationDate: vacation.vacationDate, coName: vacation.coName, coTitle: vacation.coTitle,
      originalSuspendedPunishment: vacation.originalSuspendedPunishment,
      originalSuspensionDate: vacation.originalSuspensionDate,
      vacatedInFull: vacation.vacatedInFull, vacatedPortion: vacation.vacatedPortion,
      triggeringUcmjArticle: vacation.triggeringUcmjArticle,
      triggeringOffenseSummary: vacation.triggeringOffenseSummary,
      triggeringOffenseDate: vacation.triggeringOffenseDate,
      pocName: vacation.figure141PocName, pocContact: vacation.figure141PocContact,
    } : undefined,
    remedialAction: remedial ? {
      actionType: remedial.actionType, actionDate: remedial.actionDate,
      actionAuthorityName: remedial.actionAuthorityName,
      punishmentAffected: remedial.punishmentAffected, actionDetail: remedial.actionDetail,
      reason: remedial.reason, restorationLanguage: remedial.restorationLanguage,
    } : undefined,
  };

  let document: string;
  switch (type) {
    case "charge_sheet": document = generateChargeSheet(caseData); break;
    case "navmc_10132": document = generateNavmc10132(caseData, version || "PARTIAL"); break;
    case "office_hours_script": document = generateOfficeHoursScript(caseData); break;
    case "figure_14_1": document = generateFigure141(caseData); break;
    case "mmrp_notification": document = generateMmrpNotification(caseData); break;
    default: throw new Error("Invalid document type");
  }

  // Log document generation
  const docTypeMap: Record<string, string> = {
    charge_sheet: "CHARGE_SHEET", navmc_10132: "NAVMC_10132",
    office_hours_script: "OFFICE_HOURS_SCRIPT", figure_14_1: "FIGURE_14_1",
    mmrp_notification: "MMRP_NOTIFICATION",
  };
  if (type === "navmc_10132" && version === "FINAL") {
    for (const suffix of ["E-SRB", "OMPF", "FILES", "MEMBER"]) {
      await createVersionedDocument(caseId, `NAVMC_10132_${suffix}`, session.userId);
    }
  } else {
    await createVersionedDocument(caseId, docTypeMap[type] || type, session.userId);
  }

  await auditStore.append({
    caseId, caseNumber: rawCase.caseNumber,
    userId: session.userId, userRole: session.role, userName: session.username,
    action: "GENERATE", notes: `Generated ${type}${version ? ` (${version})` : ""}`,
  });

  return { document, caseNumber: rawCase.caseNumber };
}
