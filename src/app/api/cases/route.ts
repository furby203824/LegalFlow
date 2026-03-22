import { NextRequest, NextResponse } from "next/server";
import { casesStore, usersStore, auditStore, caseWithIncludes } from "@/lib/db";
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
    const statusFilter = searchParams.get("status");
    const unitFilter = searchParams.get("unit");
    const edipiFilter = searchParams.get("edipi");
    const nameFilter = searchParams.get("name");

    let cases = casesStore.findAll();

    // Role-based filtering
    if (user.role === "ACCUSED") {
      const userRecord = usersStore.findById(user.userId);
      if (userRecord?.edipi) {
        cases = cases.filter((c) => c.accusedEdipi === userRecord.edipi);
      } else {
        return NextResponse.json({ cases: [] });
      }
    } else if (user.role === "IPAC_ADMIN") {
      cases = cases.filter(
        (c) =>
          c.status === "CLOSED" ||
          c.status === "CLOSED_SUSPENSION_ACTIVE" ||
          c.status === "CLOSED_SUSPENSION_VACATED" ||
          c.status === "CLOSED_SUSPENSION_REMITTED" ||
          c.item16SignedDate
      );
    } else if (user.role !== "SUITE_ADMIN") {
      cases = cases.filter((c) => c.unitId === user.unitId);
    }

    // Query filters
    if (statusFilter) cases = cases.filter((c) => c.status === statusFilter);
    if (unitFilter && user.role === "SUITE_ADMIN") cases = cases.filter((c) => c.unitId === unitFilter);
    if (edipiFilter) cases = cases.filter((c) => c.accusedEdipi === edipiFilter);
    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      cases = cases.filter(
        (c) =>
          (c.accusedLastName || "").toLowerCase().includes(q) ||
          (c.accusedFirstName || "").toLowerCase().includes(q)
      );
    }

    // Sort by updatedAt desc
    cases.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    // Return with Prisma-compatible includes
    return NextResponse.json({ cases: cases.map(caseWithIncludes) });
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
    const edipiError = vrInit005(accusedEdipi);
    if (edipiError) {
      return NextResponse.json({ error: edipiError.message, ruleId: edipiError.ruleId }, { status: 400 });
    }

    // Jurisdiction confirmed
    const jurisdError = vrInit004(jurisdictionConfirmed);
    if (jurisdError) {
      return NextResponse.json({ error: jurisdError.message, ruleId: jurisdError.ruleId }, { status: 400 });
    }

    // Validate rank and grade
    const rankGradeCheck = vrCv001(accusedRank, accusedGrade);
    if (rankGradeCheck) {
      return NextResponse.json({ error: rankGradeCheck.message, ruleId: rankGradeCheck.ruleId }, { status: 400 });
    }

    // Validate victim demographics
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

    for (const offense of offenses) {
      const sol001 = vrInit001(offense.offenseDate);
      if (sol001) warnings.push(sol001.message);
      const sol002 = vrInit002(offense.offenseDate);
      if (sol002) warnings.push(sol002.message);
    }

    const rankCheck = vrInit006(accusedRank, accusedGrade);
    if (rankCheck) warnings.push(rankCheck.message);

    // Double punishment check
    const existingCases = casesStore.findMany((c) => c.accusedEdipi === accusedEdipi);
    for (const offense of offenses) {
      for (const ec of existingCases) {
        for (const eo of (ec.offenses || [])) {
          if (eo.ucmjArticle === offense.ucmjArticle && eo.offenseDate === offense.offenseDate) {
            warnings.push(
              "Prior NJP action detected for this offense. Double punishment is prohibited under Article 15, UCMJ."
            );
          }
        }
      }
    }

    // Active suspension warning
    const activeSuspensions = existingCases.filter(
      (c) => c.punishment?.suspensionStatus === "ACTIVE"
    );
    if (activeSuspensions.length > 0) {
      const caseNums = activeSuspensions.map((s) => s.caseNumber).join(", ");
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

    const unitId = accusedUnitId || user.unitId;

    // Generate case number
    const year = new Date().getFullYear();
    const unitAbbrev = body.unitAbbreviation || "CASE";
    const caseCount = casesStore.count(
      (c) => c.caseNumber && c.caseNumber.startsWith(`${unitAbbrev}-${year}`)
    );
    const caseNumber = generateCaseNumber(unitAbbrev, year, caseCount + 1);

    // Earliest offense date
    const offenseDates = offenses.map((o: { offenseDate: string }) => o.offenseDate).sort();
    const offenseDateEarliest = offenseDates[0] || null;

    // Build offenses array with IDs
    const offenseRecords = offenses.map(
      (o: {
        letter: string;
        ucmjArticle: string;
        offenseType: string;
        summary: string;
        offenseDate: string;
        offensePlace: string;
      }) => ({
        id: `off-${Date.now()}-${o.letter}`,
        offenseLetter: o.letter,
        ucmjArticle: o.ucmjArticle,
        offenseType: o.offenseType,
        offenseSummary: o.summary,
        offenseDate: o.offenseDate,
        offensePlace: o.offensePlace,
        finding: null,
        locked: false,
      })
    );

    // Build victims array
    const victimRecords: { id: string; offenseId: string; victimLetter: string; victimStatus: string; victimSex: string; victimRace: string; victimEthnicity: string; locked: boolean }[] = [];
    for (const o of offenses as { letter: string; victims?: { status: string; sex: string; race: string; ethnicity: string }[] }[]) {
      const offenseRecord = offenseRecords.find((or: { offenseLetter: string }) => or.offenseLetter === o.letter);
      if (!offenseRecord || !o.victims?.length) continue;
      for (const v of o.victims) {
        victimRecords.push({
          id: `v-${Date.now()}-${o.letter}`,
          offenseId: offenseRecord.id,
          victimLetter: o.letter,
          victimStatus: v.status,
          victimSex: v.sex,
          victimRace: v.race,
          victimEthnicity: v.ethnicity,
          locked: false,
        });
      }
    }

    // Create the case
    const njpCase = casesStore.create({
      caseNumber,
      status: "INITIATED",
      currentPhase: "INITIATION",
      unitId,
      unitFullString: accusedUnitFullString,
      unitAbbreviation: unitAbbrev,
      accusedName: `${accusedLastName}, ${accusedFirstName}${accusedMiddleName ? " " + accusedMiddleName : ""}`,
      accusedLastName,
      accusedFirstName,
      accusedMiddleName: accusedMiddleName || null,
      accusedRank,
      accusedGrade,
      accusedEdipi,
      component: component || "ACTIVE",
      vesselException: vesselException || false,
      commanderGradeLevel,
      jurisdictionConfirmed,
      uaApplicable,
      offenseDateEarliest,
      doublePunishmentChecked: true,
      statuteWarningAcknowledged: warnings.some((w) => w.includes("statute")),
      formLocked: false,
      jaReviewRequired: false,
      jaReviewComplete: false,
      jaReviewerName: null,
      jaReviewDate: null,
      jaReviewNotes: null,
      njpDate: null,
      executionDate: null,
      dateNoticeToAccused: null,
      item16SignedDate: null,
      item16UdNumber: null,
      item16Dtd: null,
      ompfScanConfirmed: false,
      ompfConfirmedBy: null,
      ompfConfirmedDate: null,
      appealNotFiled: false,
      accusedTransferred: false,
      dateNoticeAppealDecision: null,
      parentCaseId: null,
      isVacationChild: false,
      njpAuthorityName: null,
      njpAuthorityRank: null,
      njpAuthorityGrade: null,
      njpAuthorityEdipi: null,
      njpAuthorityTitle: null,
      njpAuthorityUnit: null,
      initiatedById: user.userId,
      offenses: offenseRecords,
      victims: victimRecords,
    });

    auditStore.append({
      caseId: njpCase.id,
      caseNumber: njpCase.caseNumber,
      userId: user.userId,
      userRole: user.role,
      userName: user.username,
      action: "INSERT",
      notes: `Case ${caseNumber} initiated`,
    });

    return NextResponse.json({ case: caseWithIncludes(njpCase), warnings }, { status: 201 });
  } catch (error) {
    console.error("Case creation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
