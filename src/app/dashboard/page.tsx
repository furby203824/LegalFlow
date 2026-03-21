"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/ui/AppShell";

interface DashboardCase {
  id: string;
  caseNumber: string;
  marineName: string;
  marineGrade: string;
  ucmjArticles: string[];
  status: string;
  currentPhase: string;
  daysInCurrentPhase: number;
  nextActionRequired: string;
  nextActionOwner: string;
  overdue: boolean;
  suspensionActive: boolean;
  jaReviewRequired: boolean;
}

interface Stats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
  pendingAppeal: number;
  jaReviewPending: number;
  activeSuspensions: number;
}

const STATUS_COLORS: Record<string, string> = {
  INITIATED: "bg-blue-100 text-blue-800",
  REFERRED_COURT_MARTIAL: "bg-purple-100 text-purple-800",
  RIGHTS_ADVISED: "bg-cyan-100 text-cyan-800",
  PUNISHMENT_IMPOSED: "bg-orange-100 text-orange-800",
  NOTIFICATION_COMPLETE: "bg-teal-100 text-teal-800",
  APPEAL_PENDING: "bg-yellow-100 text-yellow-800",
  APPEAL_COMPLETE: "bg-green-100 text-green-800",
  REMEDIAL_ACTION_PENDING: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-100 text-gray-800",
  CLOSED_SUSPENSION_ACTIVE: "bg-amber-100 text-amber-800",
  CLOSED_SUSPENSION_VACATED: "bg-gray-100 text-gray-600",
  CLOSED_SUSPENSION_REMITTED: "bg-gray-100 text-gray-600",
  DESTROYED: "bg-red-50 text-red-600",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export default function DashboardPage() {
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setCases(data.cases || []);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredCases = cases.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      return (
        c.caseNumber.toLowerCase().includes(q) ||
        c.marineName.toLowerCase().includes(q) ||
        c.ucmjArticles.some((a) => a.includes(q))
      );
    }
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">
            Case Dashboard
          </h1>
          <Link
            href="/cases/new"
            className="bg-[var(--color-navy)] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors"
          >
            + New Case
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Total", value: stats.total, color: "bg-gray-50" },
              { label: "Open", value: stats.open, color: "bg-blue-50" },
              { label: "Closed", value: stats.closed, color: "bg-green-50" },
              { label: "Overdue", value: stats.overdue, color: "bg-red-50" },
              { label: "Pending Appeal", value: stats.pendingAppeal, color: "bg-yellow-50" },
              { label: "JA Review", value: stats.jaReviewPending, color: "bg-orange-50" },
              { label: "Suspensions", value: stats.activeSuspensions, color: "bg-amber-50" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.color} border border-[var(--color-border)] rounded-lg p-3 text-center`}
              >
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by case #, name, or article..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-[var(--color-border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Case Table */}
        {loading ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            Loading cases...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
            No cases found.{" "}
            <Link href="/cases/new" className="text-[var(--color-navy)] underline">
              Create a new case
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[var(--color-border)]">
                    <th className="text-left px-4 py-3 font-medium">Case #</th>
                    <th className="text-left px-4 py-3 font-medium">Marine</th>
                    <th className="text-left px-4 py-3 font-medium">Articles</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Phase</th>
                    <th className="text-left px-4 py-3 font-medium">Days</th>
                    <th className="text-left px-4 py-3 font-medium">Next Action</th>
                    <th className="text-left px-4 py-3 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--color-border)] hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/cases/${c.id}`}
                          className="text-[var(--color-navy)] font-medium hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{c.marineName}</span>
                        <span className="text-[var(--color-text-muted)] ml-1">
                          ({c.marineGrade})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.ucmjArticles.map((a) => `Art. ${a}`).join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_COLORS[c.status] || "bg-gray-100"
                          }`}
                        >
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {c.currentPhase.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            c.overdue ? "text-[var(--color-error)] font-bold" : ""
                          }
                        >
                          {c.daysInCurrentPhase}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{c.nextActionRequired}</div>
                        <div className="text-[var(--color-text-muted)]">
                          Owner: {c.nextActionOwner}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {c.overdue && (
                            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs">
                              OVERDUE
                            </span>
                          )}
                          {c.suspensionActive && (
                            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-xs">
                              SUSP
                            </span>
                          )}
                          {c.jaReviewRequired && (
                            <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-xs">
                              JA
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
