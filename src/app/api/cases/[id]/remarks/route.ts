import { NextRequest, NextResponse } from "next/server";
import { casesStore, usersStore, auditStore } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/cases/[id]/remarks
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const njpCase = casesStore.findById(id);
    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const entries = (njpCase.item21Entries || [])
      .sort((a: { entrySequence: number }, b: { entrySequence: number }) =>
        (a.entrySequence || 0) - (b.entrySequence || 0)
      )
      .map((e: Record<string, unknown>) => {
        const confirmedBy = e.confirmedById
          ? usersStore.findById(e.confirmedById as string)
          : null;
        return {
          ...e,
          confirmedBy: confirmedBy
            ? { firstName: confirmedBy.firstName, lastName: confirmedBy.lastName }
            : null,
        };
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

    const njpCase = casesStore.findById(id);
    if (!njpCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get next sequence number
    const entries = njpCase.item21Entries || [];
    const maxSeq = entries.reduce(
      (max: number, e: { entrySequence?: number }) => Math.max(max, e.entrySequence || 0),
      0
    );

    const entry = casesStore.addItem21Entry(id, {
      entryDate: date,
      entrySequence: maxSeq + 1,
      entryType: entryType || "OTHER",
      entryText: text,
      systemGenerated: false,
      confirmed: false,
      locked: false,
    });

    auditStore.append({
      caseId: id,
      caseNumber: njpCase.caseNumber,
      userId: user.userId,
      userRole: user.role,
      userName: user.username,
      action: "INSERT",
      notes: `Item 21 entry added: ${entryType}`,
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
    const { id } = await params;
    const body = await req.json();
    const { remarkId } = body;

    const entry = casesStore.updateItem21Entry(id, remarkId, {
      confirmedById: user.userId,
      confirmedAt: new Date().toISOString(),
      confirmed: true,
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ remark: entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
