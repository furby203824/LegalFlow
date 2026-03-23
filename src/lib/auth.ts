"use client";

// =============================================================================
// Client-Side Authentication
// Uses GitHub PAT for data access, users.json for identity/roles
// =============================================================================

import { usersStore } from "./db";
import { isGitHubConfigured, isEnvConfigured, clearGitHubConfig } from "./github";
import type { UserRole } from "@/types";

export interface SessionUser {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  unitId: string;
  unitName?: string;
  rank?: string;
  grade?: string;
  edipi?: string;
  email?: string;
}

let currentSession: SessionUser | null = null;

export function getSession(): SessionUser | null {
  if (currentSession) return currentSession;
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem("legalflow_session");
  if (!stored) return null;
  currentSession = JSON.parse(stored);
  return currentSession;
}

function setSession(user: SessionUser) {
  currentSession = user;
  sessionStorage.setItem("legalflow_session", JSON.stringify(user));
}

export function clearSession() {
  currentSession = null;
  sessionStorage.removeItem("legalflow_session");
  clearGitHubConfig();
}

export function isAuthenticated(): boolean {
  return !!getSession() && isGitHubConfigured();
}

// Simple password comparison (plaintext for demo - users.json stores plain passwords)
// In production, use bcrypt in a Web Worker or server-side verification
function verifyPassword(input: string, stored: string): boolean {
  // Support both plaintext and bcrypt-hashed passwords
  // For client-side demo, compare plaintext directly
  return input === stored;
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const user = await usersStore.findByUsername(username);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Check password (stored as passwordHash field, but for client-side demo it's plaintext)
  if (!verifyPassword(password, user.passwordHash || user.password || "")) {
    throw new Error("Invalid credentials");
  }

  // Update last login
  await usersStore.update(user.id, { lastLogin: new Date().toISOString() });

  const session: SessionUser = {
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    unitId: user.unitId || "",
    unitName: user.unitName || "",
    rank: user.rank,
    grade: user.grade,
    edipi: user.edipi,
    email: user.email,
  };

  setSession(session);
  return session;
}

export function logout() {
  clearSession();
}

export function requireAuth(...allowedRoles: UserRole[]): SessionUser {
  const user = getSession();
  if (!user) {
    throw new Error("Authentication required");
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return user;
}

// Auto-login when GitHub env config is present (no manual login needed)
export async function autoLogin(): Promise<SessionUser | null> {
  if (!isEnvConfigured()) return null;
  await seedDefaultUser();
  const users = await usersStore.findAll();
  if (users.length === 0) return null;
  const user = users[0];
  const session: SessionUser = {
    userId: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    unitId: user.unitId || "",
    unitName: user.unitName || "",
    rank: user.rank,
    grade: user.grade,
    edipi: user.edipi,
    email: user.email,
  };
  setSession(session);
  return session;
}

// Demo user profiles for different CLA roles
const DEMO_USERS = [
  {
    username: "admin",
    passwordHash: "admin",
    firstName: "System",
    lastName: "Admin",
    email: "admin@legalflow.local",
    role: "SUITE_ADMIN",
    unitId: "unit-3bn7mar",
    unitName: "3d Bn, 7th Marines",
    rank: "",
    grade: "",
    edipi: "",
  },
  {
    username: "preparer",
    passwordHash: "preparer",
    firstName: "James",
    lastName: "Rodriguez",
    email: "james.rodriguez@usmc.mil",
    role: "NJP_PREPARER",
    unitId: "unit-3bn7mar",
    unitName: "3d Bn, 7th Marines",
    rank: "Sgt",
    grade: "E5",
    edipi: "1234567890",
  },
  {
    username: "reviewer",
    passwordHash: "reviewer",
    firstName: "Sarah",
    lastName: "Mitchell",
    email: "sarah.mitchell@usmc.mil",
    role: "CERTIFIER_REVIEWER",
    unitId: "unit-3bn7mar",
    unitName: "3d Bn, 7th Marines",
    rank: "GySgt",
    grade: "E7",
    edipi: "2345678901",
  },
  {
    username: "certifier",
    passwordHash: "certifier",
    firstName: "Michael",
    lastName: "Chen",
    email: "michael.chen@usmc.mil",
    role: "CERTIFIER",
    unitId: "unit-3bn7mar",
    unitName: "3d Bn, 7th Marines",
    rank: "LtCol",
    grade: "O5",
    edipi: "3456789012",
  },
  {
    username: "appeal",
    passwordHash: "appeal",
    firstName: "Robert",
    lastName: "Hayes",
    email: "robert.hayes@usmc.mil",
    role: "CERTIFIER",
    unitId: "unit-5mar",
    unitName: "5th Marine Regiment",
    rank: "Col",
    grade: "O6",
    edipi: "4567890123",
  },
];

// Seed default users if users.json is empty
export async function seedDefaultUser(): Promise<void> {
  const users = await usersStore.findAll();
  if (users.length === 0) {
    for (const u of DEMO_USERS) {
      await usersStore.create(u);
    }
  }
}
