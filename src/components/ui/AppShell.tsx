"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  unitId: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    INITIATOR: "Initiator",
    ADMIN: "Admin",
    NJP_AUTHORITY: "NJP Authority",
    ACCUSED: "Accused",
    APPEAL_AUTHORITY: "Appeal Authority",
    IPAC_ADMIN: "IPAC Admin",
    SUITE_ADMIN: "System Admin",
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <header className="bg-[var(--color-navy)] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold tracking-wide">
              LEGALFLOW
            </Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link
                href="/dashboard"
                className="hover:text-blue-200 transition-colors"
              >
                Dashboard
              </Link>
              {(user.role === "INITIATOR" ||
                user.role === "NJP_AUTHORITY" ||
                user.role === "ADMIN" ||
                user.role === "SUITE_ADMIN") && (
                <Link
                  href="/cases/new"
                  className="hover:text-blue-200 transition-colors"
                >
                  New Case
                </Link>
              )}
              {user.role === "SUITE_ADMIN" && (
                <Link
                  href="/admin/users"
                  className="hover:text-blue-200 transition-colors"
                >
                  Users
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm hidden sm:block">
              <div className="font-medium">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-blue-200 text-xs">
                {roleLabel[user.role] || user.role} &middot; {user.unitId}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm bg-[var(--color-navy-light)] px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* CUI Banner */}
      <div className="bg-yellow-100 border-b border-yellow-300 text-center py-1 text-xs text-yellow-800 font-medium">
        CUI - PRIVACY SENSITIVE WHEN POPULATED
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-navy)] text-blue-200 text-xs text-center py-3">
        LegalFlow v1.0 &middot; Semper Admin Suite &middot; MCO 5800.16 Vol 14
      </footer>
    </div>
  );
}
