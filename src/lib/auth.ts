import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";
import type { UserRole } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "legalflow-dev-secret";

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  unitId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("legalflow_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(
  ...allowedRoles: UserRole[]
): Promise<JwtPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return user;
}

// Seed default admin user and unit if none exists
export async function seedDefaultUser() {
  const existing = await prisma.user.findFirst({
    where: { role: "SUITE_ADMIN" },
  });
  if (!existing) {
    // Create a default unit first
    let defaultUnit = await prisma.unit.findFirst({
      where: { unitAbbreviation: "HQ" },
    });
    if (!defaultUnit) {
      defaultUnit = await prisma.unit.create({
        data: {
          unitName: "Headquarters",
          unitAbbreviation: "HQ",
          unitFullString: "Headquarters, LegalFlow",
        },
      });
    }

    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: await hashPassword("admin"),
        firstName: "System",
        lastName: "Admin",
        email: "admin@legalflow.local",
        role: "SUITE_ADMIN",
        unitId: defaultUnit.id,
      },
    });
  }
}
