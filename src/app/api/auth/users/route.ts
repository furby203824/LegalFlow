import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth("SUITE_ADMIN");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        unitId: true,
        edipi: true,
        rank: true,
        grade: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth("SUITE_ADMIN");

    const body = await req.json();
    const { username, password, firstName, lastName, role, unitId, edipi, rank, grade } = body;

    if (!username || !password || !firstName || !lastName || !role || !unitId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        password: await hashPassword(password),
        firstName,
        lastName,
        role,
        unitId,
        edipi: edipi || null,
        rank: rank || null,
        grade: grade || null,
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        unitId: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
