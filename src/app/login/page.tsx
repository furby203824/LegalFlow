"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { setGitHubConfig, isGitHubConfigured } from "@/lib/github";
import { login, seedDefaultUser } from "@/lib/auth";

export default function LoginPage() {
  const [step, setStep] = useState<"github" | "login">(
    isGitHubConfigured() ? "login" : "github"
  );
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGitHubSetup(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!owner || !repo || !token) {
      setError("All GitHub fields are required");
      return;
    }
    setLoading(true);
    try {
      setGitHubConfig({ owner, repo, branch: branch || "main", token });
      // Seed default user if needed
      await seedDefaultUser();
      setStep("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to GitHub");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
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

        {step === "github" ? (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-neutral-dark mb-4">GitHub Repository Setup</h2>
            <form onSubmit={handleGitHubSetup} className="space-y-3">
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-error">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Repo Owner</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="input-field"
                  placeholder="github-username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Repo Name</label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="input-field"
                  placeholder="LegalFlow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="input-field"
                  placeholder="main"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-field"
                  placeholder="ghp_..."
                  required
                />
                <p className="text-xs text-neutral-mid mt-1">Requires repo read/write scope</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Connecting..." : "Connect"}
              </button>
            </form>
          </div>
        ) : (
          <div className="card p-6">
            <form onSubmit={handleLogin} className="space-y-4">
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
                  className="input-field"
                  placeholder="Enter password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <p className="text-xs text-center text-neutral-mid mt-4">
              Default: admin / admin
            </p>
            <button
              onClick={() => { setStep("github"); setError(""); }}
              className="text-xs text-primary hover:underline w-full text-center mt-2"
            >
              Change GitHub connection
            </button>
          </div>
        )}

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
