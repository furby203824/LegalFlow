"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, autoLogin } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      if (isAuthenticated()) {
        router.push("/dashboard");
        return;
      }
      // Try auto-login when env config is present
      const session = await autoLogin();
      if (session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
    init();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--color-navy)]">
          LegalFlow
        </h1>
        <p className="text-[var(--color-text-muted)] mt-2">
          Semper Admin Suite
        </p>
        <div className="mt-4 animate-pulse">Loading...</div>
      </div>
    </div>
  );
}
