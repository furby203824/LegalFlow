import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/lib/db";
import { verifyPassword, signToken, seedDefaultUser } from "@/lib/auth";
import type { UserRole } from "@/types";

export async function POST(req: NextRequest) {
  try {
    await seedDefaultUser();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = usersStore.findByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role as UserRole,
      unitId: user.unitId || "",
    });

    // Update last login
    usersStore.update(user.id, { lastLogin: new Date().toISOString() });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        unitId: user.unitId,
      },
    });

    response.cookies.set("legalflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
