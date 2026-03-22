"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { cn } from "@/lib/utils";
import { Search, Download, ChevronLeft, ChevronRight, FilePlus } from "lucide-react";
import { getCases } from "@/services/api";

interface CaseRow {
  id: string;
  caseNumber: string;
  status: string;
  currentPhase: string;
  accused: { lastName: string; firstName: string; grade: string };
  offenses: { ucmjArticle: string }[];
  punishmentRecord?: { suspensionStatus: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  INITIATED: "bg-gray-100 text-gray-700",
  REFERRED_COURT_MARTIAL: "bg-purple-100 text-purple-700",
  RIGHTS_ADVISED: "bg-blue-100 text-blue-700",
  PUNISHMENT_IMPOSED: "bg-orange-100 text-orange-700",
  NOTIFICATION_COMPLETE: "bg-blue-100 text-blue-700",
  APPEAL_PENDING: "bg-yellow-100 text-yellow-700",
  APPEAL_COMPLETE: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-200 text-gray-600",
  CLOSED_SUSPENSION_ACTIVE: "bg-orange-100 text-orange-700",
  CLOSED_SUSPENSION_VACATED: "bg-gray-200 text-gray-600",
  CLOSED_SUSPENSION_REMITTED: "bg-gray-200 text-gray-600",
  DESTROYED: "bg-red-100 text-red-600",
};

const STATUSES = [
  "INITIATED", "REFERRED_COURT_MARTIAL", "RIGHTS_ADVISED", "PUNISHMENT_IMPOSED",
  "NOTIFICATION_COMPLETE", "APPEAL_PENDING", "APPEAL_COMPLETE",
  "CLOSED", "CLOSED_SUSPENSION_ACTIVE", "DESTROYED",
];

export default function CasesListPage() {
  return (
    <Suspense fallback={<AppShell><div className="text-center py-8 text-neutral-mid">Loading...</div></AppShell>}>
      <CasesListContent />
    </Suspense>
  );
}

function CasesListContent() {
  const searchParams = useSearchParams();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    getCases({ status: statusFilter || undefined, name: search || undefined })
      .then((data) => setCases((data.cases || []) as CaseRow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  const totalPages = Math.ceil(cases.length / pageSize);
  const paginatedCases = cases.slice((page - 1) * pageSize, page * pageSize);

  function daysOpen(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-dark">
            All Cases
          </h1>
          <div className="flex gap-2">
            <Link href="/cases/new" className="btn-primary">
              <FilePlus size={16} /> New Case
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
              <input
                type="text"
                placeholder="Search by name or EDIPI..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field w-auto"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-5 py-12 text-center text-neutral-mid text-sm">Loading cases...</div>
          ) : paginatedCases.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-4xl mb-2">&#128203;</div>
              <p className="text-sm text-neutral-mid mb-3">No cases found.</p>
              <Link href="/cases/new" className="btn-primary">+ New Case</Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Case #</th>
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Marine</th>
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Article(s)</th>
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Phase</th>
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Days</th>
                      <th className="text-left px-5 py-3 font-medium text-neutral-mid">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCases.map((c) => {
                      const days = daysOpen(c.createdAt);
                      const overdue = days > 14 && !c.status.startsWith("CLOSED");
                      const hasSusp = c.punishmentRecord?.suspensionStatus === "ACTIVE";

                      return (
                        <tr key={c.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/cases/view?id=${c.id}`} className="font-mono text-primary font-medium hover:underline">
                              {c.caseNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-3">
                            <span className="font-medium">{c.accused.lastName}, {c.accused.firstName}</span>
                            <span className="text-neutral-mid ml-1">({c.accused.grade})</span>
                          </td>
                          <td className="px-5 py-3 text-neutral-mid">
                            {c.offenses.map((o) => `Art. ${o.ucmjArticle}`).join(", ")}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("badge", STATUS_BADGE[c.status] || "bg-gray-100")}>
                              {c.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-neutral-mid text-xs">
                            {c.currentPhase.replace(/_/g, " ")}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn(overdue ? "text-error font-semibold" : "text-neutral-mid")}>
                              {days}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1">
                              {overdue && <span className="badge bg-error/10 text-error text-[10px]">!</span>}
                              {hasSusp && <span className="badge bg-orange-100 text-orange-700 text-[10px]">SUSP</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface">
                  <span className="text-xs text-neutral-mid">
                    Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, cases.length)} of {cases.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="btn-ghost p-1.5"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="flex items-center px-3 text-sm text-neutral-mid">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="btn-ghost p-1.5"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
