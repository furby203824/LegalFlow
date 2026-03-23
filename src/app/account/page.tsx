"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { getSession } from "@/lib/auth";
import { updateUser } from "@/services/api";
import { RANKS, GRADES } from "@/types";
import { cn } from "@/lib/utils";
import { Save, Check } from "lucide-react";

export default function AccountPage() {
  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [rank, setRank] = useState("");
  const [grade, setGrade] = useState("");
  const [edipi, setEdipi] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = getSession();
    if (s) {
      setSessionState(s);
      setFirstName(s.firstName || "");
      setLastName(s.lastName || "");
      setEmail(s.email || "");
      setRank(s.rank || "");
      setGrade(s.grade || "");
      setEdipi(s.edipi || "");
    }
  }, []);

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateUser(session.userId, {
        firstName,
        lastName,
        email,
        rank,
        grade,
        edipi,
      });
      // Update the session in storage
      const updated = { ...session, firstName, lastName, email, rank, grade, edipi };
      sessionStorage.setItem("legalflow_session", JSON.stringify(updated));
      setSessionState(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return <AppShell><div className="p-6 text-sm text-neutral-mid">Loading...</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <h1 className="text-lg font-semibold text-neutral-dark mb-6">My Account</h1>

        {/* Read-only info */}
        <div className="card p-4 mb-4">
          <h2 className="text-xs font-semibold text-neutral-mid uppercase tracking-wide mb-3">Account Info</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-neutral-mid">Username</span>
              <p className="font-medium">{session.username}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-mid">Role</span>
              <p className="font-medium">{session.role.replace(/_/g, " ")}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-mid">Unit</span>
              <p className="font-medium">{session.unitName || session.unitId}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-mid">User ID</span>
              <p className="font-mono text-xs text-neutral-mid">{session.userId}</p>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="card p-4 mb-4">
          <h2 className="text-xs font-semibold text-neutral-mid uppercase tracking-wide mb-3">Personal Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-mid mb-1">First Name</label>
              <input className="input-field text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-neutral-mid mb-1">Last Name</label>
              <input className="input-field text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-mid mb-1">Email</label>
              <input type="email" className="input-field text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card p-4 mb-4">
          <h2 className="text-xs font-semibold text-neutral-mid uppercase tracking-wide mb-3">Military Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-mid mb-1">Rank</label>
              <select className="input-field text-sm" value={rank} onChange={(e) => setRank(e.target.value)}>
                <option value="">Select</option>
                {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-mid mb-1">Grade</label>
              <select className="input-field text-sm" value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">Select</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-mid mb-1">EDIPI</label>
              <input className="input-field text-sm font-mono" value={edipi} onChange={(e) => setEdipi(e.target.value)} maxLength={10} placeholder="10-digit DoD ID" />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-error mb-3">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn("btn-primary text-sm w-full flex items-center justify-center gap-2", saved && "bg-green-700")}
        >
          {saved ? <><Check size={14} /> Saved</> : saving ? "Saving..." : <><Save size={14} /> Save Changes</>}
        </button>
      </div>
    </AppShell>
  );
}
