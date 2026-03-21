import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  validateEdipi,
  checkStatuteOfLimitations,
  generateCaseNumber,
} from "@/lib/validation";
import type { UserRole } from "@/types";

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
      // Accused can only see their own cases
      const userRecord = await prisma.user.findUnique({ where: { id: user.userId } });
      if (userRecord?.edipi) {
        where.accusedEdipi = userRecord.edipi;
      } else {
        return NextResponse.json({ cases: [] });
      }
    } else if (user.role === "IPAC_ADMIN") {
      // IPAC sees cases routed to IPAC (status CLOSED or item16 signed)
      where.OR = [
        { status: "CLOSED" },
        { status: "CLOSED_SUSPENSION_ACTIVE" },
        { status: "CLOSED_SUSPENSION_VACATED" },
        { status: "CLOSED_SUSPENSION_REMITTED" },
        { item16SignedAt: { not: null } },
      ];
    } else if (user.role !== "SUITE_ADMIN") {
      // INITIATOR, ADMIN, NJP_AUTHORITY, APPEAL_AUTHORITY see their unit's cases
      where.accusedUnit = user.unitId;
    }

    // Apply filters
    if (status) where.status = status;
    if (unit && user.role === "SUITE_ADMIN") where.accusedUnit = unit;
    if (edipi) where.accusedEdipi = edipi;
    if (name) {
      where.OR = [
        { accusedLastName: { contains: name } },
        { accusedFirstName: { contains: name } },
      ];
    }

    const cases = await prisma.njpCase.findMany({
      where,
      include: {
        offenses: true,
        punishments: true,
        suspensions: true,
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
      accusedUnit,
      accusedUnitGcmca,
      commanderGrade,
      component,
      vesselException,
      jurisdictionConfirmed,
      offenses,
    } = body;

    // Validate required fields
    if (!accusedLastName || !accusedFirstName || !accusedRank || !accusedGrade ||
        !accusedEdipi || !accusedUnit || !accusedUnitGcmca || !commanderGrade ||
        !component || !offenses?.length) {
      return NextResponse.json(
        { error: "Missing required fields for case initiation" },
        { status: 400 }
      );
    }

    // Validate EDIPI
    const edipiError = validateEdipi(accusedEdipi);
    if (edipiError) {
      return NextResponse.json({ error: edipiError.message }, { status: 400 });
    }

    // Jurisdiction confirmation
    if (!jurisdictionConfirmed) {
      return NextResponse.json(
        { error: "Jurisdiction confirmation is required" },
        { status: 400 }
      );
    }

    // Check warnings
    const warnings: string[] = [];

    // Statute of limitations check
    for (const offense of offenses) {
      const solWarning = checkStatuteOfLimitations(offense.offenseDate);
      if (solWarning) warnings.push(solWarning.message);
    }

    // Double punishment check
    const existingCases = await prisma.njpCase.findMany({
      where: { accusedEdipi },
      include: { offenses: true },
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
    const activeSuspensions = await prisma.suspension.findMany({
      where: {
        case_: { accusedEdipi },
        status: "ACTIVE",
      },
      include: { case_: true },
    });
    if (activeSuspensions.length > 0) {
      const caseNums = activeSuspensions.map((s) => s.case_.caseNumber).join(", ");
      warnings.push(
        `Active suspension detected on prior NJP case ${caseNums}. Per MCO 5800.16 para 011201, the previously suspended sentence should be vacated before imposing subsequent NJP.`
      );
    }

    // Determine commander grade category
    const gradeNum = parseInt(commanderGrade.replace(/[EOW]/g, ""), 10);
    const isFieldGrade = commanderGrade.startsWith("O") && gradeNum >= 4;
    const commanderGradeCategory = isFieldGrade ? "FIELD_GRADE_AND_ABOVE" : "COMPANY_GRADE";

    // Check if Article 85 or 86 is present (UA/Desertion)
    const item4Applicable = offenses.some(
      (o: { ucmjArticle: string }) => o.ucmjArticle === "85" || o.ucmjArticle === "86"
    );

    // Generate case number
    const year = new Date().getFullYear();
    const caseCount = await prisma.njpCase.count({
      where: {
        caseNumber: { startsWith: `${accusedUnit}-${year}` },
      },
    });
    const caseNumber = generateCaseNumber(accusedUnit, year, caseCount + 1);

    // Create case with offenses and victims
    const njpCase = await prisma.njpCase.create({
      data: {
        caseNumber,
        status: "INITIATED",
        currentPhase: "INITIATION",
        createdById: user.userId,
        accusedLastName,
        accusedFirstName,
        accusedMiddleName: accusedMiddleName || "",
        accusedRank,
        accusedGrade,
        accusedEdipi,
        accusedUnit,
        accusedUnitGcmca,
        commanderGrade,
        commanderGradeCategory,
        component,
        vesselException: vesselException || false,
        jurisdictionConfirmed,
        item4Applicable,
        statuteOfLimitationsWarning: warnings.some((w) => w.includes("statute")),
        doublePunishmentFlag: warnings.some((w) => w.includes("Double punishment")),
        offenses: {
          create: offenses.map(
            (o: {
              letter: string;
              ucmjArticle: string;
              offenseType: string;
              summary: string;
              offenseDate: string;
              offensePlace: string;
              victims?: {
                status: string;
                sex: string;
                race: string;
                ethnicity: string;
              }[];
            }) => ({
              letter: o.letter,
              ucmjArticle: o.ucmjArticle,
              offenseType: o.offenseType,
              summary: o.summary,
              offenseDate: o.offenseDate,
              offensePlace: o.offensePlace,
              victims: {
                create: (o.victims || []).map(
                  (v: { status: string; sex: string; race: string; ethnicity: string }) => ({
                    status: v.status,
                    sex: v.sex,
                    race: v.race,
                    ethnicity: v.ethnicity,
                  })
                ),
              },
            })
          ),
        },
      },
      include: {
        offenses: { include: { victims: true } },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        caseId: njpCase.id,
        userId: user.userId,
        action: "CASE_INITIATED",
        newValue: caseNumber,
      },
    });

    return NextResponse.json({ case: njpCase, warnings }, { status: 201 });
  } catch (error) {
    console.error("Case creation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
