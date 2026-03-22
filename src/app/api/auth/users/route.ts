import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/lib/db";
import { requireAuth, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth("SUITE_ADMIN");

    const users = usersStore.findAll().map((u) => ({
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      unitId: u.unitId,
      edipi: u.edipi || null,
      rank: u.rank || null,
      grade: u.grade || null,
      email: u.email || null,
      isActive: u.isActive ?? true,
      createdAt: u.createdAt,
      unit: u.unitName
        ? { unitName: u.unitName, unitAbbreviation: u.unitAbbreviation || null }
        : null,
    }));

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

    const existing = usersStore.findByUsername(username);
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const existingEmail = usersStore.findByEmail(email);
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const user = usersStore.create({
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
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        unitId: user.unitId,
        email: user.email,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") || message.includes("Authentication") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
