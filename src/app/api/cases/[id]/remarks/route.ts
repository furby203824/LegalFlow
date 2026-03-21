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

    const remarks = await prisma.remark.findMany({
      where: { caseId: id },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ remarks });
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
    const { date, itemReference, text } = body;

    if (!date || !itemReference || !text) {
      return NextResponse.json(
        { error: "Date, item reference, and text are required" },
        { status: 400 }
      );
    }

    const remark = await prisma.remark.create({
      data: {
        caseId: id,
        date,
        itemReference,
        text,
        confirmed: false,
      },
    });

    return NextResponse.json({ remark }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH /api/cases/[id]/remarks - Confirm a remark
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("ADMIN", "SUITE_ADMIN");
    const body = await req.json();
    const { remarkId } = body;

    const remark = await prisma.remark.update({
      where: { id: remarkId },
      data: {
        confirmed: true,
        confirmedBy: user.userId,
        confirmedAt: new Date(),
      },
    });

    return NextResponse.json({ remark });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
