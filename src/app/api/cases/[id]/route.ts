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

    const njpCase = await prisma.njpCase.findUnique({
      where: { id },
      include: {
        offenses: { include: { victims: true } },
        punishments: true,
        remarks: { orderBy: { date: "asc" } },
        suspensions: true,
        vacationRecords: true,
        auditLogs: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        createdBy: {
          select: { firstName: true, lastName: true, role: true },
        },
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
