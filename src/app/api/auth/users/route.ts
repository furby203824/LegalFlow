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
        email: true,
        isActive: true,
        createdAt: true,
        unit: {
          select: { unitName: true, unitAbbreviation: true },
        },
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
    const { username, password, firstName, lastName, role, unitId, edipi, rank, grade, email } = body;

    if (!username || !password || !firstName || !lastName || !role || !unitId || !email) {
      return NextResponse.json(
        { error: "Missing required fields: username, password, firstName, lastName, role, unitId, email" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        firstName,
        lastName,
        email,
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
        email: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
