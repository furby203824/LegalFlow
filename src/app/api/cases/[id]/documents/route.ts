import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  generateChargeSheet,
  generateNavmc10132,
  generateOfficeHoursScript,
  generateVacationNotice,
} from "@/lib/documents";
import type { Rank, Grade } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const njpCase = await prisma.njpCase.findUnique({
      where: { id },
      include: {
        offenses: { include: { victims: true } },
        punishments: true,
      },
    });

    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const caseData = {
      caseNumber: njpCase.caseNumber,
      accusedLastName: njpCase.accusedLastName,
      accusedFirstName: njpCase.accusedFirstName,
      accusedMiddleName: njpCase.accusedMiddleName,
      accusedRank: njpCase.accusedRank as Rank,
      accusedGrade: njpCase.accusedGrade as Grade,
      accusedEdipi: njpCase.accusedEdipi,
      accusedUnit: njpCase.accusedUnit,
      accusedUnitGcmca: njpCase.accusedUnitGcmca,
      commanderGrade: njpCase.commanderGrade as Grade,
      component: njpCase.component,
      vesselException: njpCase.vesselException,
      offenses: njpCase.offenses.map((o) => ({
        letter: o.letter,
        ucmjArticle: o.ucmjArticle,
        offenseType: o.offenseType,
        summary: o.summary,
        offenseDate: o.offenseDate,
        offensePlace: o.offensePlace,
        finding: o.finding || undefined,
        victims: o.victims.map((v) => ({
          status: v.status,
          sex: v.sex,
          race: v.race,
          ethnicity: v.ethnicity,
        })),
      })),
      item6Punishments: njpCase.punishments.map((p) => ({
        type: p.type,
        duration: p.duration || undefined,
        amount: p.amount || undefined,
        reducedToGrade: p.reducedToGrade || undefined,
        suspended: p.suspended,
        suspensionMonths: p.suspensionMonths || undefined,
      })),
      item6Date: njpCase.item6Date || undefined,
      item7SuspensionDetails: njpCase.item7SuspensionDetails || undefined,
      item8AuthorityName: njpCase.item8AuthorityName || undefined,
      item8AuthorityTitle: njpCase.item8AuthorityTitle || undefined,
      item8AuthorityUnit: njpCase.item8AuthorityUnit || undefined,
      item8AuthorityRank: njpCase.item8AuthorityRank || undefined,
      item8AuthorityGrade: njpCase.item8AuthorityGrade || undefined,
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

    return NextResponse.json({ document, type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
