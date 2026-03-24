"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download } from "lucide-react";
import { getCases } from "@/services/api";
import { getSession } from "@/lib/auth";

interface CaseRow {
  id: string;
  caseNumber: string;
  status: string;
  currentPhase: string;
  accused: { lastName: string; firstName: string; middleName?: string; grade: string; edipi: string };
  offenses: { ucmjArticle: string }[];
  punishmentRecord?: { suspensionStatus: string | null } | null;
  createdAt: string;
  updatedAt: string;
  jaReviewRequired?: boolean;
  jaReviewComplete?: boolean;
  pendingForRole?: string | null;
}

const PENDING_ROLE_LABELS: Record<string, string> = {
  ACCUSED: "Accused",
  CERTIFIER: "Certifier",
  NJP_PREPARER: "NJP Preparer",
  APPEAL_AUTHORITY: "Appeal Authority",
  CERTIFIER_REVIEWER: "Certifier Reviewer",
};

const STATUS_OPTIONS = [
  "INITIATED", "REFERRED_COURT_MARTIAL", "RIGHTS_ADVISED", "PUNISHMENT_IMPOSED",
  "NOTIFICATION_COMPLETE", "APPEAL_PENDING", "APPEAL_DECIDED", "APPEAL_COMPLETE",
  "CLOSED", "CLOSED_SUSPENSION_ACTIVE", "DESTROYED",
];

const STATUS_LABEL: Record<string, string> = {
  INITIATED: "Draft",
  REFERRED_COURT_MARTIAL: "Referred",
  RIGHTS_ADVISED: "Rights Advised",
  PUNISHMENT_IMPOSED: "Punishment Imposed",
  NOTIFICATION_COMPLETE: "Post-Notification",
  APPEAL_PENDING: "Appeal Pending",
  APPEAL_DECIDED: "Appeal Decided",
  APPEAL_COMPLETE: "Appeal Complete",
  CLOSED: "Closed",
  CLOSED_SUSPENSION_ACTIVE: "Suspension Active",
  DESTROYED: "Destroyed",
};

type SortField = "caseNumber" | "edipi" | "name" | "status" | "phase" | "articles" | "updatedAt";
type SortDir = "asc" | "desc";

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<SortField>("caseNumber");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Per-column filters
  const [filterCaseNum, setFilterCaseNum] = useState("");
  const [filterEdipi, setFilterEdipi] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterArticle, setFilterArticle] = useState("");

  // view=pending means filter to only cases pending the current user's role
  const viewMode = searchParams.get("view") || "all";
  const session = getSession();
  const userRole = session?.role || "SUITE_ADMIN";

  const VIEW_TITLES: Record<string, Record<string, string>> = {
    pending: {
      NJP_PREPARER: "Packages Pending Your Action",
      CERTIFIER_REVIEWER: "Packages Pending Review",
      CERTIFIER: "Packages Awaiting Your Action",
      SUITE_ADMIN: "All Packages",
    },
    all: { default: "Available Packages" },
  };

  const pageTitle = viewMode === "pending"
    ? (VIEW_TITLES.pending[userRole] || "Packages Pending Your Role")
    : "Available Packages";

  useEffect(() => {
    const filters: { status?: string; name?: string; pendingRole?: string } = {};
    if (viewMode === "pending" && userRole !== "SUITE_ADMIN") {
      filters.pendingRole = userRole;
    }
    getCases(filters)
      .then((data) => setCases((data.cases || []) as CaseRow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [viewMode, userRole]);

  // Filter + sort
  const filteredCases = useMemo(() => {
    let result = [...cases];

    if (filterCaseNum) {
      const q = filterCaseNum.toLowerCase();
      result = result.filter((c) => c.caseNumber.toLowerCase().includes(q));
    }
    if (filterEdipi) {
      result = result.filter((c) => c.accused.edipi.includes(filterEdipi));
    }
    if (filterName) {
      const q = filterName.toLowerCase();
      result = result.filter((c) =>
        `${c.accused.lastName} ${c.accused.firstName}`.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (filterPhase) {
      const q = filterPhase.toLowerCase();
      result = result.filter((c) => c.currentPhase.toLowerCase().includes(q));
    }
    if (filterArticle) {
      const q = filterArticle.toLowerCase();
      result = result.filter((c) =>
        c.offenses.some((o) => o.ucmjArticle.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "caseNumber": cmp = a.caseNumber.localeCompare(b.caseNumber); break;
        case "edipi": cmp = a.accused.edipi.localeCompare(b.accused.edipi); break;
        case "name": cmp = `${a.accused.lastName}`.localeCompare(`${b.accused.lastName}`); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "phase": cmp = a.currentPhase.localeCompare(b.currentPhase); break;
        case "articles": cmp = (a.offenses[0]?.ucmjArticle || "").localeCompare(b.offenses[0]?.ucmjArticle || ""); break;
        case "updatedAt": cmp = a.updatedAt.localeCompare(b.updatedAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [cases, filterCaseNum, filterEdipi, filterName, filterStatus, filterPhase, filterArticle, sortField, sortDir]);

  const totalPages = Math.ceil(filteredCases.length / pageSize);
  const paginatedCases = filteredCases.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown size={12} className="text-neutral-mid/40" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  }

  function exportCSV() {
    const headers = ["Case #", "EDIPI", "Name", "Status", "Phase", "Articles", "Pending", "Updated"];
    const rows = filteredCases.map((c) => [
      c.caseNumber,
      c.accused.edipi,
      `${c.accused.lastName} ${c.accused.firstName}`,
      STATUS_LABEL[c.status] || c.status,
      c.currentPhase.replace(/_/g, " "),
      c.offenses.map((o) => `Art. ${o.ucmjArticle}`).join("; "),
      c.pendingForRole ? (PENDING_ROLE_LABELS[c.pendingForRole] || c.pendingForRole) : "",
      c.updatedAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cases-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function daysOpen(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header bar — matches CLA "Available Packages" style */}
        <div className="card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-neutral-dark">{pageTitle}</h1>
            {viewMode === "pending" && (
              <Link href="/cases" className="btn-ghost text-xs">
                View All
              </Link>
            )}
            <button
              onClick={() => {
                setFilterCaseNum(""); setFilterEdipi(""); setFilterName("");
                setFilterStatus(""); setFilterPhase(""); setFilterArticle("");
              }}
              className="btn-ghost text-xs"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn-ghost text-xs flex items-center gap-1">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Results count + pagination controls */}
        <div className="flex items-center justify-between text-xs text-neutral-mid">
          <span>{filteredCases.length} results</span>
          <div className="flex items-center gap-2">
            {/* Page buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">|&lt;</button>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">&lt;&lt;</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "px-2 py-1 text-xs border",
                        p === page
                          ? "bg-primary text-white border-primary"
                          : "btn-ghost border-border"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">&gt;&gt;</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn-ghost px-2 py-1 text-xs disabled:opacity-30">&gt;|</button>
              </div>
            )}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="input-underline text-xs w-16 py-1"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="px-5 py-12 text-center text-neutral-mid text-sm">Loading packages...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Column headers with sort */}
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-4 py-2">
                      <button onClick={() => toggleSort("caseNumber")} className="flex items-center gap-1 font-medium text-neutral-dark text-xs">
                        Pkg ID <SortIcon field="caseNumber" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">
                      <button onClick={() => toggleSort("edipi")} className="flex items-center gap-1 font-medium text-neutral-dark text-xs">
                        EDIPI <SortIcon field="edipi" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1 font-medium text-neutral-dark text-xs">
                        Name <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">
                      <button onClick={() => toggleSort("status")} className="flex items-center gap-1 font-medium text-neutral-dark text-xs">
                        Package Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">
                      <span className="font-medium text-neutral-dark text-xs">NJP Authority</span>
                    </th>
                    <th className="text-left px-4 py-2">
                      <span className="font-medium text-neutral-dark text-xs">Articles</span>
                    </th>
                    <th className="text-left px-4 py-2">
                      <span className="font-medium text-neutral-dark text-xs">Pending</span>
                    </th>
                    <th className="text-left px-4 py-2">
                      <button onClick={() => toggleSort("updatedAt")} className="flex items-center gap-1 font-medium text-neutral-dark text-xs">
                        Updated <SortIcon field="updatedAt" />
                      </button>
                    </th>
                  </tr>
                  {/* Column filter inputs */}
                  <tr className="border-b border-border bg-white">
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={filterCaseNum}
                        onChange={(e) => { setFilterCaseNum(e.target.value); setPage(1); }}
                        className="input-underline text-xs py-1 w-full"
                        placeholder=""
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={filterEdipi}
                        onChange={(e) => { setFilterEdipi(e.target.value); setPage(1); }}
                        className="input-underline text-xs py-1 w-full"
                        placeholder=""
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={filterName}
                        onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
                        className="input-underline text-xs py-1 w-full"
                        placeholder=""
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <select
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                        className="input-underline text-xs py-1 w-full"
                      >
                        <option value="">Package Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={filterPhase}
                        onChange={(e) => { setFilterPhase(e.target.value); setPage(1); }}
                        className="input-underline text-xs py-1 w-full"
                        placeholder=""
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={filterArticle}
                        onChange={(e) => { setFilterArticle(e.target.value); setPage(1); }}
                        className="input-underline text-xs py-1 w-full"
                        placeholder=""
                      />
                    </td>
                    <td className="px-4 py-1.5" />
                    <td className="px-4 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-neutral-mid">
                        {viewMode === "pending" ? "No packages pending your action." : "No packages found."}
                      </td>
                    </tr>
                  ) : (
                    paginatedCases.map((c) => {
                      const days = daysOpen(c.createdAt);
                      const overdue = days > 14 && !c.status.startsWith("CLOSED") && c.status !== "DESTROYED";

                      return (
                        <tr key={c.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/cases/view?id=${c.id}`}
                              className="font-mono text-primary font-medium hover:underline text-xs"
                            >
                              {c.caseNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-neutral-mid">
                            {c.accused.edipi}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <span className="font-medium">{c.accused.lastName}, {c.accused.firstName}</span>
                            <span className="text-neutral-mid ml-1">({c.accused.grade})</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {STATUS_LABEL[c.status] || c.status.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-neutral-mid">
                            {c.currentPhase.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-neutral-mid">
                            {c.offenses.map((o) => `Art. ${o.ucmjArticle}`).join(", ")}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            {c.pendingForRole ? (
                              <span className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                                c.pendingForRole === userRole && "bg-primary/10 text-primary",
                                c.pendingForRole === "CERTIFIER" && userRole === "CERTIFIER_REVIEWER" && "bg-warning/10 text-warning",
                                c.pendingForRole !== userRole && !(c.pendingForRole === "CERTIFIER" && userRole === "CERTIFIER_REVIEWER") && "bg-neutral-light text-neutral-mid",
                              )}>
                                {PENDING_ROLE_LABELS[c.pendingForRole] || c.pendingForRole}
                              </span>
                            ) : (
                              <span className="text-neutral-mid/50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <span className={cn(overdue ? "text-error font-bold" : "text-neutral-mid")}>
                              {c.updatedAt?.slice(0, 10) || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
