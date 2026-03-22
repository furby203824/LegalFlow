"use client";

import { useEffect, useState, FormEvent } from "react";
import AppShell from "@/components/ui/AppShell";
import { RANKS, GRADES } from "@/types";

interface UserInfo {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  unitId: string;
  edipi: string | null;
  rank: string | null;
  grade: string | null;
}

const ROLES = [
  "INITIATOR",
  "ADMIN",
  "NJP_AUTHORITY",
  "ACCUSED",
  "APPEAL_AUTHORITY",
  "IPAC_ADMIN",
  "SUITE_ADMIN",
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  function loadUsers() {
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    const body = {
      username: formData.get("username"),
      password: formData.get("password"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      role: formData.get("role"),
      unitId: formData.get("unitId"),
      email: formData.get("email"),
      edipi: formData.get("edipi") || null,
      rank: formData.get("rank") || null,
      grade: formData.get("grade") || null,
    };

    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      form.reset();
      loadUsers();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">
            User Management
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? "Cancel" : "+ Add User"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Create User</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded px-4 py-2 text-red-800 text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input name="username" required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input name="password" type="password" required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select name="role" required className="input-field">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <input name="firstName" required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <input name="lastName" required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit ID *</label>
                <input name="unitId" required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input name="email" type="email" required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">EDIPI</label>
                <input name="edipi" maxLength={10} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rank</label>
                <select name="rank" className="input-field">
                  <option value="">—</option>
                  {RANKS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade</label>
                <select name="grade" className="input-field">
                  <option value="">—</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3">Username</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Unit</th>
                <th className="text-left px-4 py-3">EDIPI</th>
                <th className="text-left px-4 py-3">Rank/Grade</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    Loading...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.unitId}</td>
                    <td className="px-4 py-3">{u.edipi || "—"}</td>
                    <td className="px-4 py-3">
                      {u.rank ? `${u.rank}/${u.grade}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
