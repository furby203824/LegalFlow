import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  vrInit001,
  vrInit002,
  vrInit004,
  vrInit005,
  vrInit006,
  vrInit007,
  vrCv001,
  vrCv002,
  generateCaseNumber,
} from "@/lib/validation";
import { getCommanderGradeLevel } from "@/types";
import type { Grade } from "@/types";

// GET /api/cases - List cases based on role
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const unit = searchParams.get("unit");
    const edipi = searchParams.get("edipi");
    const name = searchParams.get("name");

    // Build where clause based on role
    const where: Record<string, unknown> = {};

    if (user.role === "ACCUSED") {
      const userRecord = await prisma.user.findUnique({ where: { id: user.userId } });
      if (userRecord?.edipi) {
        where.accused = { edipi: userRecord.edipi };
      } else {
        return NextResponse.json({ cases: [] });
      }
    } else if (user.role === "IPAC_ADMIN") {
      where.OR = [
        { status: "CLOSED" },
        { status: "CLOSED_SUSPENSION_ACTIVE" },
        { status: "CLOSED_SUSPENSION_VACATED" },
        { status: "CLOSED_SUSPENSION_REMITTED" },
        { item16SignedDate: { not: null } },
      ];
    } else if (user.role !== "SUITE_ADMIN") {
      where.unitId = user.unitId;
    }

    if (status) where.status = status;
    if (unit && user.role === "SUITE_ADMIN") where.unitId = unit;
    if (edipi) where.accused = { edipi };
    if (name) {
      where.accused = {
        OR: [
          { lastName: { contains: name } },
          { firstName: { contains: name } },
        ],
      };
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        accused: true,
        offenses: true,
        punishmentRecord: true,
        unit: { select: { unitName: true, unitAbbreviation: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ cases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/cases - Create new NJP case (Phase 1 - Initiation)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("INITIATOR", "NJP_AUTHORITY", "ADMIN", "SUITE_ADMIN");
    const body = await req.json();

    const {
      accusedLastName,
      accusedFirstName,
      accusedMiddleName,
      accusedRank,
      accusedGrade,
      accusedEdipi,
      accusedUnitId,
      accusedUnitFullString,
      commanderGrade,
      component,
      vesselException,
      jurisdictionConfirmed,
      offenses,
    } = body;

    // Validate required fields
    if (!accusedLastName || !accusedFirstName || !accusedRank || !accusedGrade ||
        !accusedEdipi || !accusedUnitFullString || !commanderGrade ||
        !component || !offenses?.length) {
      return NextResponse.json(
        { error: "Missing required fields for case initiation" },
        { status: 400 }
      );
    }

    // Validate EDIPI
    // VR-INIT-005: EDIPI format
    const edipiError = vrInit005(accusedEdipi);
    if (edipiError) {
      return NextResponse.json({ error: edipiError.message, ruleId: edipiError.ruleId }, { status: 400 });
    }

    // VR-INIT-004: Jurisdiction confirmed
    const jurisdError = vrInit004(jurisdictionConfirmed);
    if (jurisdError) {
      return NextResponse.json({ error: jurisdError.message, ruleId: jurisdError.ruleId }, { status: 400 });
    }

    // VR-CV-001: Validate rank and grade
    const rankGradeCheck = vrCv001(accusedRank, accusedGrade);
    if (rankGradeCheck) {
      return NextResponse.json({ error: rankGradeCheck.message, ruleId: rankGradeCheck.ruleId }, { status: 400 });
    }

    // VR-CV-002: Validate victim demographics
    for (const offense of offenses) {
      for (const v of (offense.victims || [])) {
        const victimCheck = vrCv002(v.status, v.sex, v.race, v.ethnicity);
        if (victimCheck) {
          return NextResponse.json({ error: victimCheck.message, ruleId: victimCheck.ruleId }, { status: 400 });
        }
      }
    }

    // Warnings
    const warnings: string[] = [];

    // VR-INIT-001/002: Statute of limitations
    for (const offense of offenses) {
      const sol001 = vrInit001(offense.offenseDate);
      if (sol001) warnings.push(sol001.message);
      const sol002 = vrInit002(offense.offenseDate);
      if (sol002) warnings.push(sol002.message);
    }

    // VR-INIT-006: Rank/grade mismatch
    const rankCheck = vrInit006(accusedRank, accusedGrade);
    if (rankCheck) warnings.push(rankCheck.message);

    // Double punishment check
    const existingCases = await prisma.case.findMany({
      where: { accused: { edipi: accusedEdipi } },
      include: { offenses: true, accused: true },
    });
    for (const offense of offenses) {
      for (const ec of existingCases) {
        for (const eo of ec.offenses) {
          if (eo.ucmjArticle === offense.ucmjArticle && eo.offenseDate === offense.offenseDate) {
            warnings.push(
              "Prior NJP action detected for this offense. Double punishment is prohibited under Article 15, UCMJ."
            );
          }
        }
      }
    }

    // Active suspension warning
    const activeSuspensions = await prisma.punishmentRecord.findMany({
      where: {
        case_: { accused: { edipi: accusedEdipi } },
        suspensionStatus: "ACTIVE",
      },
      include: { case_: true },
    });
    if (activeSuspensions.length > 0) {
      const caseNums = activeSuspensions.map((s) => s.case_.caseNumber).join(", ");
      warnings.push(
        `Active suspension detected on prior NJP case ${caseNums}. Per MCO 5800.16 para 011201, the previously suspended sentence should be vacated before imposing subsequent NJP.`
      );
    }

    // Determine commander grade level
    const commanderGradeLevel = getCommanderGradeLevel(commanderGrade as Grade);

    // Check if Article 85 or 86 is present
    const uaApplicable = offenses.some(
      (o: { ucmjArticle: string }) => o.ucmjArticle === "85" || o.ucmjArticle === "86"
    );

    // Resolve or create unit
    const unitId = accusedUnitId || user.unitId;

    // Create or find accused profile
    let accusedProfile = await prisma.accusedProfile.findFirst({
      where: { edipi: accusedEdipi },
    });
    if (!accusedProfile) {
      accusedProfile = await prisma.accusedProfile.create({
        data: {
          lastName: accusedLastName,
          firstName: accusedFirstName,
          middleName: accusedMiddleName || null,
          rank: accusedRank,
          grade: accusedGrade,
          edipi: accusedEdipi,
          unitId,
          unitFullString: accusedUnitFullString,
          component: component || "ACTIVE",
        },
      });
    }

    // Generate case number
    const year = new Date().getFullYear();
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    const unitAbbrev = unit?.unitAbbreviation || "CASE";
    const caseCount = await prisma.case.count({
      where: {
        caseNumber: { startsWith: `${unitAbbrev}-${year}` },
      },
    });
    const caseNumber = generateCaseNumber(unitAbbrev, year, caseCount + 1);

    // Earliest offense date
    const offenseDates = offenses.map((o: { offenseDate: string }) => o.offenseDate).sort();
    const offenseDateEarliest = offenseDates[0] || null;

    // Create case with offenses
    const njpCase = await prisma.case.create({
      data: {
        caseNumber,
        status: "INITIATED",
        currentPhase: "INITIATION",
        unitId,
        accusedId: accusedProfile.id,
        initiatedById: user.userId,
        commanderGradeLevel,
        component: component || "ACTIVE",
        vesselException: vesselException || false,
        jurisdictionConfirmed,
        uaApplicable,
        offenseDateEarliest,
        doublePunishmentChecked: true,
        statuteWarningAcknowledged: warnings.some((w) => w.includes("statute")),
        offenses: {
          create: offenses.map(
            (o: {
              letter: string;
              ucmjArticle: string;
              offenseType: string;
              summary: string;
              offenseDate: string;
              offensePlace: string;
            }) => ({
              offenseLetter: o.letter,
              ucmjArticle: o.ucmjArticle,
              offenseType: o.offenseType,
              offenseSummary: o.summary,
              offenseDate: o.offenseDate,
              offensePlace: o.offensePlace,
            })
          ),
        },
      },
      include: {
        accused: true,
        offenses: true,
      },
    });

    // Create victims separately (they need both caseId and offenseId)
    for (const o of offenses as { letter: string; victims?: { status: string; sex: string; race: string; ethnicity: string }[] }[]) {
      const offense = njpCase.offenses.find((off) => off.offenseLetter === o.letter);
      if (!offense || !o.victims?.length) continue;
      for (const v of o.victims) {
        await prisma.victim.create({
          data: {
            caseId: njpCase.id,
            offenseId: offense.id,
            victimLetter: o.letter,
            victimStatus: v.status,
            victimSex: v.sex,
            victimRace: v.race,
            victimEthnicity: v.ethnicity,
          },
        });
      }
    }

    // Reload with victims
    const fullCase = await prisma.case.findUnique({
      where: { id: njpCase.id },
      include: { accused: true, offenses: { include: { victims: true } } },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: njpCase.id,
        tableName: "cases",
        recordId: njpCase.id,
        action: "INSERT",
        userId: user.userId,
        userRole: user.role,
        userName: user.username,
        notes: `Case ${caseNumber} initiated`,
      },
    });

    return NextResponse.json({ case: fullCase, warnings }, { status: 201 });
  } catch (error) {
    console.error("Case creation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
