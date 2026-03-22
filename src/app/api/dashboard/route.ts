import { NextResponse } from "next/server";
import { casesStore, usersStore, caseWithIncludes } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { differenceInDays } from "date-fns";
import type { CasePhase, CaseStatus, UserRole } from "@/types";

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

    let cases = casesStore.findMany((c) => c.status !== "DESTROYED");

    // Role-based filtering
    if (user.role === "ACCUSED") {
      const userRecord = usersStore.findById(user.userId);
      if (userRecord?.edipi) {
        cases = cases.filter((c) => c.accusedEdipi === userRecord.edipi);
      } else {
        return NextResponse.json({ cases: [], stats: {} });
      }
    } else if (user.role === "IPAC_ADMIN") {
      cases = cases.filter((c) => c.item16SignedDate);
    } else if (user.role !== "SUITE_ADMIN") {
      cases = cases.filter((c) => c.unitId === user.unitId);
    }

    const dashboardCases = cases.map((c) => {
      const full = caseWithIncludes(c);
      const daysInPhase = differenceInDays(new Date(), new Date(c.updatedAt));
      const { action, owner } = getNextAction(c.currentPhase, c.status);
      const hasSuspension = c.punishment?.suspensionStatus === "ACTIVE";

      return {
        id: c.id,
        caseNumber: c.caseNumber,
        marineName: `${c.accusedLastName}, ${c.accusedFirstName}`,
        marineGrade: c.accusedGrade,
        ucmjArticles: (c.offenses || []).map((o: { ucmjArticle: string }) => o.ucmjArticle),
        status: c.status as CaseStatus,
        currentPhase: c.currentPhase as CasePhase,
        daysInCurrentPhase: daysInPhase,
        nextActionRequired: action,
        nextActionOwner: owner,
        overdue: daysInPhase > 14 && !c.status.startsWith("CLOSED"),
        suspensionActive: hasSuspension || false,
        jaReviewRequired: c.jaReviewRequired && !c.jaReviewComplete,
      };
    });

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
