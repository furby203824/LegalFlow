import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const njpCase = await prisma.case.findUnique({
      where: { id },
      include: {
        accused: true,
        unit: { select: { unitName: true, unitAbbreviation: true, unitFullString: true } },
        initiatedBy: { select: { firstName: true, lastName: true, role: true } },
        njpAuthority: { select: { firstName: true, lastName: true, role: true } },
        offenses: { include: { victims: true }, orderBy: { offenseLetter: "asc" } },
        punishmentRecord: true,
        appealRecord: true,
        remedialActions: { orderBy: { createdAt: "desc" } },
        item21Entries: { orderBy: { entrySequence: "asc" } },
        signatures: { orderBy: { createdAt: "asc" } },
        documents: { where: { isCurrent: true }, orderBy: { createdAt: "desc" } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 50 },
        suspensionMonitor: true,
        vacationRecordsAsParent: true,
      },
    });

    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: njpCase });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
