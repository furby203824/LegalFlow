import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { usersStore } from "@/lib/db";

export async function GET() {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = usersStore.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        unitId: user.unitId,
        edipi: user.edipi || null,
        rank: user.rank || null,
        grade: user.grade || null,
        email: user.email || null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
