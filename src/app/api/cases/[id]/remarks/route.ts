import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/cases/[id]/remarks
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const entries = await prisma.item21Entry.findMany({
      where: { caseId: id },
      orderBy: { entrySequence: "asc" },
      include: {
        confirmedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ remarks: entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/cases/[id]/remarks
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("ADMIN", "SUITE_ADMIN");
    const { id } = await params;
    const body = await req.json();
    const { date, entryType, text } = body;

    if (!date || !entryType || !text) {
      return NextResponse.json(
        { error: "Date, entry type, and text are required" },
        { status: 400 }
      );
    }

    // Get next sequence number
    const lastEntry = await prisma.item21Entry.findFirst({
      where: { caseId: id },
      orderBy: { entrySequence: "desc" },
    });
    const nextSequence = (lastEntry?.entrySequence ?? 0) + 1;

    const entry = await prisma.item21Entry.create({
      data: {
        caseId: id,
        entryDate: date,
        entrySequence: nextSequence,
        entryType: entryType || "OTHER",
        entryText: text,
        systemGenerated: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        caseId: id,
        tableName: "item_21_entries",
        recordId: entry.id,
        action: "INSERT",
        userId: user.userId,
        userRole: user.role,
        userName: user.username,
        notes: `Item 21 entry added: ${entryType}`,
      },
    });

    return NextResponse.json({ remark: entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH /api/cases/[id]/remarks - Confirm an entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("ADMIN", "SUITE_ADMIN");
    const body = await req.json();
    const { remarkId } = body;

    const entry = await prisma.item21Entry.update({
      where: { id: remarkId },
      data: {
        confirmedById: user.userId,
        confirmedAt: new Date(),
      },
    });

    return NextResponse.json({ remark: entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
