"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
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
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-white mb-4">
            <Scale size={32} />
          </div>
          <div className="text-xs text-neutral-mid tracking-widest uppercase mb-1">
            Semper Admin Suite
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-dark">
            LegalFlow
          </h1>
        </div>

        {/* Login Card */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-neutral-dark mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="input-field"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-dark mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-field"
                placeholder="Enter password"
              />
            </div>

            <div>
              <label htmlFor="mfa" className="block text-sm font-medium text-neutral-dark mb-1.5">
                MFA Code <span className="text-neutral-mid font-normal">(if enabled)</span>
              </label>
              <input
                id="mfa"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                className="input-field font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-xs text-center text-neutral-mid mt-4">
            Default: admin / admin
          </p>
        </div>

        {/* CUI Notice */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-cui-text font-medium">
            CUI - Privacy Sensitive When Populated
          </p>
          <p className="text-[10px] text-neutral-mid">
            Unauthorized access is prohibited. All activity is monitored.
          </p>
        </div>
      </div>
    </div>
  );
}
