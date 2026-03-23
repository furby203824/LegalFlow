"use client";

import { useEffect, useState, FormEvent } from "react";
import AppShell from "@/components/ui/AppShell";
import { RANKS, GRADES } from "@/types";
import { cn } from "@/lib/utils";
import { Plus, X, Search, UserCircle } from "lucide-react";
import { getUsers, createUser } from "@/services/api";

interface UserInfo {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  unitId: string;
  unitName: string;
  edipi: string | null;
  rank: string | null;
  grade: string | null;
  email: string;
  isActive: boolean;
}

const ROLES = [
  "NJP_PREPARER", "CERTIFIER_REVIEWER", "CERTIFIER",
  "NJP_AUTHORITY", "APPEAL_AUTHORITY",
  "IPAC_ADMIN", "SUITE_ADMIN",
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  function loadUsers() {
    getUsers()
      .then((data) => setUsers((data.users || []) as UserInfo[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      await createUser({
        username: fd.get("username"), password: fd.get("password"),
        firstName: fd.get("firstName"), lastName: fd.get("lastName"),
        role: fd.get("role"),
        unitId: "unit-3bn7mar", unitName: "3d Bn, 7th Marines",
        email: fd.get("email"),
        edipi: fd.get("edipi") || null, rank: fd.get("rank") || null, grade: fd.get("grade") || null,
      });
      setShowForm(false); form.reset(); loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating user");
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q);
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-dark">User Management</h1>
          <button onClick={() => { setShowForm(!showForm); setSelectedUser(null); }} className="btn-primary gap-1">
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add User</>}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card p-5">
            <h3 className="text-base font-semibold mb-4">Create User</h3>
            {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-error mb-4">{error}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Username *</label><input name="username" required className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Password *</label><input name="password" type="password" required className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Email *</label><input name="email" type="email" required className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">First Name *</label><input name="firstName" required className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Last Name *</label><input name="lastName" required className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Role *</label>
                <select name="role" required className="input-field">{ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Unit</label>
                <input value="3d Bn, 7th Marines" readOnly className="input-field bg-surface text-neutral-mid" /></div>
              <div><label className="block text-sm font-medium mb-1">EDIPI</label><input name="edipi" maxLength={10} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Rank</label>
                <select name="rank" className="input-field"><option value="">—</option>{RANKS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="sm:col-span-3"><button type="submit" className="btn-primary">Create User</button></div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" />
        </div>

        {/* Users table + detail panel */}
        <div className="flex gap-4">
          <div className={cn("card overflow-hidden flex-1", selectedUser && "lg:flex-[2]")}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-neutral-mid">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-mid">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-mid">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-mid">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-mid">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-mid">Loading...</td></tr>
                ) : filteredUsers.map((u) => (
                  <tr key={u.id} onClick={() => setSelectedUser(u)} className={cn(
                    "border-b border-border cursor-pointer transition-colors",
                    selectedUser?.id === u.id ? "bg-blue-50" : "hover:bg-surface"
                  )}>
                    <td className="px-4 py-3 font-medium">{u.lastName}, {u.firstName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3"><span className="badge bg-primary/10 text-primary">{u.role.replace(/_/g, " ")}</span></td>
                    <td className="px-4 py-3 text-neutral-mid">{u.unitName || u.unitId}</td>
                    <td className="px-4 py-3">
                      <span className={cn("badge", u.isActive ? "bg-success/10 text-success" : "bg-gray-100 text-gray-500")}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selectedUser && (
            <div className="card p-5 w-80 shrink-0 hidden lg:block">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">User Detail</h3>
                <button onClick={() => setSelectedUser(null)} className="btn-ghost p-1"><X size={16} /></button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UserCircle size={24} />
                </div>
                <div>
                  <div className="font-medium">{selectedUser.lastName}, {selectedUser.firstName}</div>
                  <div className="text-xs text-neutral-mid">{selectedUser.username}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <DetailRow label="Role" value={selectedUser.role.replace(/_/g, " ")} />
                <DetailRow label="Email" value={selectedUser.email} />
                <DetailRow label="Unit" value={selectedUser.unitName || selectedUser.unitId} />
                <DetailRow label="Rank/Grade" value={selectedUser.rank ? `${selectedUser.rank}/${selectedUser.grade}` : "—"} />
                <DetailRow label="EDIPI" value={selectedUser.edipi || "—"} />
                <DetailRow label="Status" value={selectedUser.isActive ? "Active" : "Inactive"} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-neutral-mid">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
