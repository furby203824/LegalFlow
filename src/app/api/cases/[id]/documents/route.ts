import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  generateChargeSheet,
  generateNavmc10132,
  generateOfficeHoursScript,
} from "@/lib/documents";
import type { Rank, Grade } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const njpCase = await prisma.case.findUnique({
      where: { id },
      include: {
        accused: true,
        offenses: { include: { victims: true }, orderBy: { offenseLetter: "asc" } },
        punishmentRecord: true,
      },
    });

    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const caseData = {
      caseNumber: njpCase.caseNumber,
      accusedLastName: njpCase.accused.lastName,
      accusedFirstName: njpCase.accused.firstName,
      accusedMiddleName: njpCase.accused.middleName || "",
      accusedRank: njpCase.accused.rank as Rank,
      accusedGrade: njpCase.accused.grade as Grade,
      accusedEdipi: njpCase.accused.edipi,
      accusedUnit: njpCase.accused.unitFullString,
      accusedUnitGcmca: njpCase.accused.unitFullString,
      commanderGrade: (njpCase.njpAuthorityGrade || njpCase.commanderGradeLevel) as Grade,
      component: njpCase.component,
      vesselException: njpCase.vesselException,
      offenses: njpCase.offenses.map((o) => ({
        letter: o.offenseLetter,
        ucmjArticle: o.ucmjArticle,
        offenseType: o.offenseType,
        summary: o.offenseSummary,
        offenseDate: o.offenseDate,
        offensePlace: o.offensePlace,
        finding: o.finding || undefined,
        victims: o.victims.map((v) => ({
          status: v.victimStatus || "Unknown",
          sex: v.victimSex || "Unknown",
          race: v.victimRace || "Unknown",
          ethnicity: v.victimEthnicity || "Unknown",
        })),
      })),
      item6Punishments: njpCase.punishmentRecord
        ? buildPunishmentList(njpCase.punishmentRecord)
        : [],
      item6Date: njpCase.njpDate || undefined,
      item7SuspensionDetails: njpCase.punishmentRecord?.suspensionText || undefined,
      item8AuthorityName: njpCase.njpAuthorityName || undefined,
      item8AuthorityTitle: njpCase.njpAuthorityTitle || undefined,
      item8AuthorityUnit: njpCase.njpAuthorityUnit || undefined,
      item8AuthorityRank: njpCase.njpAuthorityRank || undefined,
      item8AuthorityGrade: njpCase.njpAuthorityGrade || undefined,
    };

    let document: string;

    switch (type) {
      case "charge_sheet":
        document = generateChargeSheet(caseData);
        break;
      case "navmc_10132":
        document = generateNavmc10132(caseData);
        break;
      case "office_hours_script":
        document = generateOfficeHoursScript(caseData);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid document type. Use: charge_sheet, navmc_10132, or office_hours_script" },
          { status: 400 }
        );
    }

    // Log document generation
    await prisma.document.create({
      data: {
        caseId: id,
        documentType: type === "charge_sheet" ? "CHARGE_SHEET"
          : type === "navmc_10132" ? "NAVMC_10132"
          : "OFFICE_HOURS_SCRIPT",
        generatedById: user.userId,
        generatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        caseId: id,
        tableName: "documents",
        recordId: id,
        action: "GENERATE",
        userId: user.userId,
        userRole: user.role,
        userName: user.username,
        notes: `Generated ${type}`,
      },
    });

    return NextResponse.json({ document, type });
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
  extraDutiesDays: number | null;
  restrictionDays: number | null;
  arrestQuartersDays: number | null;
  detentionDays: number | null;
  suspensionImposed: boolean;
  suspensionMonths: number | null;
  suspensionPunishment: string | null;
}): { type: string; duration?: number; amount?: number; reducedToGrade?: string; suspended: boolean; suspensionMonths?: number }[] {
  const list: { type: string; duration?: number; amount?: number; reducedToGrade?: string; suspended: boolean; suspensionMonths?: number }[] = [];

  if (pr.corrCustodyDays) {
    list.push({ type: "CORRECTIONAL_CUSTODY", duration: pr.corrCustodyDays, suspended: false });
  }
  if (pr.forfeitureAmount) {
    list.push({ type: "FORFEITURE", amount: pr.forfeitureAmount, duration: pr.forfeitureMonths || undefined, suspended: false });
  }
  if (pr.reductionImposed) {
    list.push({ type: "REDUCTION", reducedToGrade: pr.reductionToGrade || undefined, suspended: false });
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
