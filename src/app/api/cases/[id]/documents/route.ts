import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const version = searchParams.get("version") as Navmc10132Version | null;

    const njpCase = await prisma.case.findUnique({
      where: { id },
      include: {
        accused: true,
        offenses: { include: { victims: true }, orderBy: { offenseLetter: "asc" } },
        punishmentRecord: true,
        signatures: true,
        appealRecord: true,
        item21Entries: { orderBy: { entrySequence: "asc" } },
        vacationRecordsAsParent: { orderBy: { createdAt: "desc" } },
        remedialActions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Helper to find signatures by item number
    const sig = (item: string) =>
      njpCase.signatures.find((s) => s.itemNumber === item);

    const sig2 = sig("2");
    const sig3 = sig("3");
    const sig9 = sig("9");
    const sig11 = sig("11");
    const sig12 = sig("12");
    const sig16 = sig("16");

    const appeal = njpCase.appealRecord;
    const vacation = njpCase.vacationRecordsAsParent[0];
    const remedial = njpCase.remedialActions.find(
      (ra) => ra.mmrpNotificationRequired && !ra.mmrpNotificationSent
    ) || njpCase.remedialActions[0];

    const caseData: CaseData = {
      caseNumber: njpCase.caseNumber,
      caseId: njpCase.id,

      // Accused
      accusedLastName: njpCase.accused.lastName,
      accusedFirstName: njpCase.accused.firstName,
      accusedMiddleName: njpCase.accused.middleName || "",
      accusedRank: njpCase.accused.rank as Rank,
      accusedGrade: njpCase.accused.grade as Grade,
      accusedEdipi: njpCase.accused.edipi,
      accusedUnit: njpCase.accused.unitFullString,
      accusedUnitGcmca: njpCase.accused.unitFullString,
      component: njpCase.component,

      // NJP Authority
      njpAuthorityName: njpCase.njpAuthorityName || undefined,
      njpAuthorityTitle: njpCase.njpAuthorityTitle || undefined,
      njpAuthorityUnit: njpCase.njpAuthorityUnit || undefined,
      njpAuthorityRank: njpCase.njpAuthorityRank || undefined,
      njpAuthorityGrade: njpCase.njpAuthorityGrade || undefined,
      commanderGradeLevel: njpCase.commanderGradeLevel as CommanderGradeLevel,

      vesselException: njpCase.vesselException,

      // Offenses
      offenses: njpCase.offenses.map((o) => ({
        letter: o.offenseLetter,
        ucmjArticle: o.ucmjArticle,
        offenseType: o.offenseType,
        summary: o.offenseSummary,
        offenseDate: o.offenseDate,
        offensePlace: o.offensePlace,
        finding: o.finding || undefined,
        victims: o.victims.map((v) => ({
          letter: v.victimLetter,
          status: v.victimStatus || "Unknown",
          sex: v.victimSex || "Unknown",
          race: v.victimRace || "Unknown",
          ethnicity: v.victimEthnicity || "Unknown",
        })),
      })),

      // Item 2
      item2ElectionAccepted: sig2 ? !sig2.refusalNoted : undefined,
      item2CounselConsulted: sig2 ? true : undefined,
      item2SignedDate: sig2?.signedDate || undefined,
      item2RefusalNoted: sig2?.refusalNoted || undefined,
      item2CoSignedInstead: sig2?.coSignedInstead || undefined,
      item2SignerName: sig2?.signerName || undefined,

      // Item 3
      item3SignedDate: sig3?.signedDate || undefined,
      item3SignerName: sig3?.signerName || undefined,

      // Item 4
      uaApplicable: njpCase.uaApplicable,
      uaPeriodStart: njpCase.uaPeriodStart || undefined,
      uaPeriodEnd: njpCase.uaPeriodEnd || undefined,
      desertionMarks: njpCase.desertionMarks || undefined,

      // Item 6
      item6Punishments: njpCase.punishmentRecord
        ? buildPunishmentList(njpCase.punishmentRecord)
        : [],
      item6Date: njpCase.njpDate || undefined,
      punishmentText: njpCase.punishmentRecord?.punishmentText || undefined,

      // Item 7
      item7SuspensionDetails: njpCase.punishmentRecord?.suspensionText || undefined,
      item7SuspensionMonths: njpCase.punishmentRecord?.suspensionMonths || undefined,
      item7SuspensionStartDate: njpCase.punishmentRecord?.suspensionStartDate || undefined,
      item7SuspensionEndDate: njpCase.punishmentRecord?.suspensionEndDate || undefined,
      item7RemissionTerms: njpCase.punishmentRecord?.suspensionRemissionTerms || undefined,

      // Item 9
      item9SignedDate: sig9?.signedDate || undefined,
      item9SignerName: sig9?.signerName || undefined,

      // Item 10
      dateNoticeToAccused: njpCase.dateNoticeToAccused || undefined,

      // Item 11
      item11SignedDate: sig11?.signedDate || undefined,
      item11SignerName: sig11?.signerName || undefined,

      // Item 12
      appealIntent: appeal?.appealIntent || undefined,
      item12SignedDate: appeal?.item12SignedDate || sig12?.signedDate || undefined,
      item12SignerName: sig12?.signerName || undefined,

      // Item 13
      appealNotFiled: njpCase.appealNotFiled,
      appealFiledDate: appeal?.appealFiledDate || njpCase.appealFiledDate || undefined,

      // Item 14
      appealAuthorityName: appeal?.appealAuthorityName || undefined,
      appealAuthorityRank: appeal?.appealAuthorityRank || undefined,
      appealAuthoritySignedDate: appeal?.appealAuthoritySignedDate || undefined,
      appealOutcome: appeal?.appealOutcome || undefined,
      appealOutcomeDetail: appeal?.appealOutcomeDetail || undefined,

      // Item 15
      dateNoticeAppealDecision: njpCase.dateNoticeAppealDecision || undefined,
      accusedTransferred: njpCase.accusedTransferred,

      // Item 16
      item16SignedDate: njpCase.item16SignedDate || sig16?.signedDate || undefined,
      item16UdNumber: njpCase.item16UdNumber || undefined,
      item16Dtd: njpCase.item16Dtd || undefined,
      item16SignerName: sig16?.signerName || undefined,

      // Item 21
      item21Entries: njpCase.item21Entries.map((e) => ({
        entryDate: e.entryDate,
        entryText: e.entryText,
      })),

      // NJP date
      njpDate: njpCase.njpDate || undefined,

      // Vacation record
      vacationRecord: vacation
        ? {
            vacationDate: vacation.vacationDate,
            coName: vacation.coName,
            coTitle: vacation.coTitle,
            originalSuspendedPunishment: vacation.originalSuspendedPunishment,
            originalSuspensionDate: vacation.originalSuspensionDate,
            vacatedInFull: vacation.vacatedInFull,
            vacatedPortion: vacation.vacatedPortion || undefined,
            triggeringUcmjArticle: vacation.triggeringUcmjArticle,
            triggeringOffenseSummary: vacation.triggeringOffenseSummary,
            triggeringOffenseDate: vacation.triggeringOffenseDate,
            pocName: vacation.figure141PocName || undefined,
            pocContact: vacation.figure141PocContact || undefined,
          }
        : undefined,

      // Remedial action
      remedialAction: remedial
        ? {
            actionType: remedial.actionType,
            actionDate: remedial.actionDate,
            actionAuthorityName: remedial.actionAuthorityName,
            punishmentAffected: remedial.punishmentAffected,
            actionDetail: remedial.actionDetail,
            reason: remedial.reason || undefined,
            restorationLanguage: remedial.restorationLanguage || undefined,
          }
        : undefined,
    };

    let document: string;

    switch (type) {
      case "charge_sheet":
        document = generateChargeSheet(caseData);
        break;
      case "navmc_10132":
        document = generateNavmc10132(caseData, version || "PARTIAL");
        break;
      case "office_hours_script":
        document = generateOfficeHoursScript(caseData);
        break;
      case "figure_14_1":
        document = generateFigure141(caseData);
        break;
      case "mmrp_notification":
        document = generateMmrpNotification(caseData);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid document type. Use: charge_sheet, navmc_10132, office_hours_script, figure_14_1, or mmrp_notification" },
          { status: 400 }
        );
    }

    // Create versioned document record
    const docTypeMap: Record<string, string> = {
      charge_sheet: "CHARGE_SHEET",
      navmc_10132: "NAVMC_10132",
      office_hours_script: "OFFICE_HOURS_SCRIPT",
      figure_14_1: "FIGURE_14_1",
      mmrp_notification: "MMRP_NOTIFICATION",
    };

    if (type === "navmc_10132" && version === "FINAL") {
      // Generate 4 distribution copies
      const distributions = [
        { suffix: "E-SRB", flags: { esrb: true } },
        { suffix: "OMPF", flags: { ompf: true } },
        { suffix: "FILES", flags: { files: true } },
        { suffix: "MEMBER", flags: { member: true } },
      ] as const;
      for (const dist of distributions) {
        await createVersionedDocument(
          id,
          `NAVMC_10132_${dist.suffix}`,
          user.userId,
          dist.flags
        );
      }
    } else {
      await createVersionedDocument(
        id,
        docTypeMap[type!] || type!,
        user.userId
      );
    }

    await prisma.auditLog.create({
      data: {
        caseId: id,
        tableName: "documents",
        recordId: id,
        action: "GENERATE",
        userId: user.userId,
        userRole: user.role,
        userName: user.username,
        notes: `Generated ${type}${version ? ` (${version})` : ""}`,
      },
    });

    return NextResponse.json({
      document,
      type,
      version: version || undefined,
      caseNumber: njpCase.caseNumber,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// Convert flat punishment record to array for document generation
function buildPunishmentList(pr: {
  corrCustodyDays: number | null;
  forfeitureAmount: number | null;
  forfeitureMonths: number | null;
  reductionImposed: boolean;
  reductionToGrade: string | null;
  reductionToRank: string | null;
  reductionFromGrade: string | null;
  extraDutiesDays: number | null;
  restrictionDays: number | null;
  arrestQuartersDays: number | null;
  detentionDays: number | null;
  suspensionImposed: boolean;
  suspensionMonths: number | null;
  suspensionPunishment: string | null;
}): CaseData["item6Punishments"] {
  const list: CaseData["item6Punishments"] = [];

  if (pr.corrCustodyDays) {
    list.push({ type: "CORRECTIONAL_CUSTODY", duration: pr.corrCustodyDays, suspended: false });
  }
  if (pr.forfeitureAmount) {
    list.push({
      type: "FORFEITURE",
      amount: pr.forfeitureAmount,
      months: pr.forfeitureMonths || undefined,
      suspended: false,
    });
  }
  if (pr.reductionImposed) {
    list.push({
      type: "REDUCTION",
      reducedToGrade: pr.reductionToGrade || undefined,
      reducedToRank: pr.reductionToRank || undefined,
      reducedFromGrade: pr.reductionFromGrade || undefined,
      suspended: false,
    });
  }
  if (pr.extraDutiesDays) {
    list.push({ type: "EXTRA_DUTIES", duration: pr.extraDutiesDays, suspended: false });
  }
  if (pr.restrictionDays) {
    list.push({ type: "RESTRICTION", duration: pr.restrictionDays, suspended: false });
  }
  if (pr.arrestQuartersDays) {
    list.push({ type: "ARREST_IN_QUARTERS", duration: pr.arrestQuartersDays, suspended: false });
  }
  if (pr.detentionDays) {
    list.push({ type: "DETENTION_OF_PAY", duration: pr.detentionDays, suspended: false });
  }

  // Mark suspended punishment
  if (pr.suspensionImposed && pr.suspensionPunishment) {
    const idx = list.findIndex((p) =>
      pr.suspensionPunishment!.toLowerCase().includes(p.type.toLowerCase().replace(/_/g, " "))
    );
    if (idx >= 0) {
      list[idx].suspended = true;
      list[idx].suspensionMonths = pr.suspensionMonths || undefined;
    }
  }

  return list;
}
