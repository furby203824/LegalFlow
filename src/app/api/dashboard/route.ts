import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { differenceInDays } from "date-fns";
import type { CasePhase, CaseStatus, Grade, UserRole } from "@/types";

function getNextAction(phase: string, status: string): { action: string; owner: UserRole } {
  switch (status) {
    case "INITIATED":
      return { action: "Complete Item 2 - Rights advisement", owner: "ACCUSED" };
    case "REFERRED_COURT_MARTIAL":
      return { action: "Route to court-martial jurisdiction", owner: "ADMIN" };
    case "RIGHTS_ADVISED":
      return { action: "Conduct hearing - Enter findings", owner: "NJP_AUTHORITY" };
    case "PUNISHMENT_IMPOSED":
      return { action: "Notify accused of punishment", owner: "NJP_AUTHORITY" };
    case "NOTIFICATION_COMPLETE":
      return { action: "Complete admin actions", owner: "ADMIN" };
    case "APPEAL_PENDING":
      return { action: "Process appeal", owner: "APPEAL_AUTHORITY" };
    case "APPEAL_COMPLETE":
      return { action: "Complete admin actions", owner: "ADMIN" };
    case "REMEDIAL_ACTION_PENDING":
      return { action: "Process remedial action", owner: "NJP_AUTHORITY" };
    default:
      return { action: "No action required", owner: "ADMIN" };
  }
}

export async function GET() {
  try {
    const user = await requireAuth();

    const where: Record<string, unknown> = {};

    if (user.role === "ACCUSED") {
      const userRecord = await prisma.user.findUnique({ where: { id: user.userId } });
      if (userRecord?.edipi) {
        where.accusedEdipi = userRecord.edipi;
      } else {
        return NextResponse.json({ cases: [], stats: {} });
      }
    } else if (user.role === "IPAC_ADMIN") {
      where.item16SignedAt = { not: null };
    } else if (user.role !== "SUITE_ADMIN") {
      where.accusedUnit = user.unitId;
    }

    // Exclude destroyed cases
    where.status = { not: "DESTROYED" };

    const cases = await prisma.njpCase.findMany({
      where,
      include: {
        offenses: true,
        suspensions: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const dashboardCases = cases.map((c) => {
      const daysInPhase = differenceInDays(new Date(), c.updatedAt);
      const { action, owner } = getNextAction(c.currentPhase, c.status);
      const hasSuspension = c.suspensions.some((s) => s.status === "ACTIVE");

      return {
        id: c.id,
        caseNumber: c.caseNumber,
        marineName: `${c.accusedLastName}, ${c.accusedFirstName}`,
        marineGrade: c.accusedGrade as Grade,
        ucmjArticles: c.offenses.map((o) => o.ucmjArticle),
        status: c.status as CaseStatus,
        currentPhase: c.currentPhase as CasePhase,
        daysInCurrentPhase: daysInPhase,
        nextActionRequired: action,
        nextActionOwner: owner,
        overdue: daysInPhase > 14 && !c.status.startsWith("CLOSED"),
        suspensionActive: hasSuspension,
        jaReviewRequired: c.jaReviewRequired && !c.jaReviewCompleted,
      };
    });

    // Stats
    const stats = {
      total: dashboardCases.length,
      open: dashboardCases.filter((c) => !c.status.startsWith("CLOSED")).length,
      closed: dashboardCases.filter((c) => c.status.startsWith("CLOSED")).length,
      overdue: dashboardCases.filter((c) => c.overdue).length,
      pendingAppeal: dashboardCases.filter((c) => c.status === "APPEAL_PENDING").length,
      jaReviewPending: dashboardCases.filter((c) => c.jaReviewRequired).length,
      activeSuspensions: dashboardCases.filter((c) => c.suspensionActive).length,
    };

    return NextResponse.json({ cases: dashboardCases, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
