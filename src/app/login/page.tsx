"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[var(--color-navy)] text-white px-8 py-6 text-center">
            <h1 className="text-2xl font-bold tracking-wide">LEGALFLOW</h1>
            <p className="text-sm text-blue-200 mt-1">Semper Admin Suite</p>
            <p className="text-xs text-blue-300 mt-2">
              CUI - Privacy Sensitive When Populated
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[var(--color-text)] mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] focus:border-transparent"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-text)] mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] focus:border-transparent"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-navy)] text-white py-2 px-4 rounded font-medium hover:bg-[var(--color-navy-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-xs text-center text-[var(--color-text-muted)] mt-4">
              Default credentials: admin / admin
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
