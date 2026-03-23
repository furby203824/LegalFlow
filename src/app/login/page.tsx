"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Scale, User, Shield, FileCheck, Eye, Gavel, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGitHubConfig, isGitHubConfigured } from "@/lib/github";
import { login, seedDefaultUser, autoLogin } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  {
    username: "admin",
    password: "admin",
    label: "System Admin",
    description: "Full system access — manage users, all cases, settings",
    icon: <Shield size={16} />,
    rank: "",
    color: "text-primary",
    group: "system",
  },
  // --- Company Level ---
  {
    username: "co-preparer",
    password: "co-preparer",
    label: "Co Preparer",
    description: "Initiates and prepares NJP packages at company level",
    icon: <User size={16} />,
    rank: "Sgt Rodriguez",
    color: "text-info",
    group: "Alpha Co, 1st Bn, 5th Mar",
  },
  {
    username: "co-reviewer",
    password: "co-reviewer",
    label: "Co Reviewer",
    description: "Reviews packages prior to routing to Company Commander",
    icon: <Eye size={16} />,
    rank: "GySgt Mitchell",
    color: "text-warning",
    group: "Alpha Co, 1st Bn, 5th Mar",
  },
  {
    username: "co-certifier",
    password: "co-certifier",
    label: "Co Certifier",
    description: "Company Commander — Capt and below. Appeals go to Battalion",
    icon: <FileCheck size={16} />,
    rank: "Capt Park",
    color: "text-success",
    group: "Alpha Co, 1st Bn, 5th Mar",
  },
  // --- Battalion Level ---
  {
    username: "bn-preparer",
    password: "bn-preparer",
    label: "Bn Preparer",
    description: "Initiates and prepares NJP packages at battalion level",
    icon: <User size={16} />,
    rank: "Sgt Torres",
    color: "text-info",
    group: "1st Bn, 5th Marines",
  },
  {
    username: "bn-reviewer",
    password: "bn-reviewer",
    label: "Bn Reviewer",
    description: "Reviews packages prior to routing to Battalion Commander",
    icon: <Eye size={16} />,
    rank: "MSgt Nguyen",
    color: "text-warning",
    group: "1st Bn, 5th Marines",
  },
  {
    username: "bn-certifier",
    password: "bn-certifier",
    label: "Bn Certifier",
    description: "Battalion Commander — handles Co appeals. Own appeals go to Regiment",
    icon: <FileCheck size={16} />,
    rank: "LtCol Chen",
    color: "text-success",
    group: "1st Bn, 5th Marines",
  },
  // --- Regiment Level ---
  {
    username: "regt-certifier",
    password: "regt-certifier",
    label: "Regt Certifier",
    description: "Regimental CO — handles Bn appeals. Does not initiate NJP",
    icon: <Gavel size={16} />,
    rank: "Col Hayes",
    color: "text-purple-600",
    group: "5th Marine Regiment",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const ghConfigured = isGitHubConfigured();
  const [step, setStep] = useState<"github" | "login">(
    ghConfigured ? "login" : "github"
  );
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    autoLogin().then((session) => {
      if (session) router.push("/dashboard");
    });
  }, [router]);

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
      await seedDefaultUser();
      await login(username, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(acct: { username: string; password: string }) {
    setUsername(acct.username);
    setPassword(acct.password);
    // Submit after state update
    setTimeout(async () => {
      setError("");
      setLoading(true);
      try {
        await seedDefaultUser();
        await login(acct.username, acct.password);
        router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid credentials");
      } finally {
        setLoading(false);
      }
    }, 0);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 text-white mb-3 backdrop-blur-sm">
            <Scale size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Command Legal Action
          </h1>
          <div className="text-xs text-white/40 tracking-widest uppercase mt-1">
            LegalFlow Suite
          </div>
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
                <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} className="input-field" placeholder="github-username" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Repo Name</label>
                <input type="text" value={repo} onChange={(e) => setRepo(e.target.value)} className="input-field" placeholder="LegalFlow" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Branch</label>
                <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} className="input-field" placeholder="main" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Personal Access Token</label>
                <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className="input-field" placeholder="ghp_..." required />
                <p className="text-xs text-neutral-mid mt-1">Requires repo read/write scope</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Connecting..." : "Connect"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Login form */}
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
              {!ghConfigured && (
                <button
                  onClick={() => { setStep("github"); setError(""); }}
                  className="text-xs text-primary hover:underline w-full text-center mt-3"
                >
                  Change GitHub connection
                </button>
              )}
            </div>

            {/* Demo accounts quick login */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-neutral-dark mb-3 uppercase tracking-wider">
                Demo Accounts — Quick Login
              </h3>
              <div className="space-y-3">
                {(() => {
                  const groups: string[] = [];
                  DEMO_ACCOUNTS.forEach((a) => { if (!groups.includes(a.group)) groups.push(a.group); });
                  return groups.map((group) => (
                    <div key={group}>
                      <div className="text-[10px] font-semibold text-neutral-mid uppercase tracking-wider mb-1.5 px-1">
                        {group}
                      </div>
                      <div className="space-y-1.5">
                        {DEMO_ACCOUNTS.filter((a) => a.group === group).map((acct) => (
                  <button
                    key={acct.username}
                    onClick={() => quickLogin(acct)}
                    disabled={loading}
                    className="w-full flex items-start gap-3 px-3 py-2 rounded-md border border-border hover:bg-surface hover:border-primary/20 transition-colors text-left disabled:opacity-50"
                  >
                    <div className={cn("mt-0.5 p-1.5 rounded bg-neutral-light", acct.color)}>
                      {acct.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-dark">{acct.label}</span>
                        {acct.rank && (
                          <span className="text-[10px] text-neutral-mid">({acct.rank})</span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-mid mt-0.5">{acct.description}</div>
                      <div className="text-[10px] text-neutral-mid/60 mt-0.5 font-mono">
                        {acct.username} / {acct.password}
                      </div>
                    </div>
                  </button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 text-center space-y-1">
          <p className="text-xs text-white/40 font-medium">
            CUI - Privacy Sensitive When Populated
          </p>
          <p className="text-[10px] text-white/25">
            Unauthorized access is prohibited. All activity is monitored.
          </p>
        </div>
      </div>
    </div>
  );
}
