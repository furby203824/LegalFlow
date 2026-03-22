"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/ui/AppShell";
import {
  FolderOpen, ClipboardCheck, Timer, AlertTriangle,
  ChevronRight, Scale, Inbox, FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const STATUS_BADGE: Record<string, string> = {
  INITIATED: "bg-gray-100 text-gray-700",
  REFERRED_COURT_MARTIAL: "bg-purple-100 text-purple-700",
  RIGHTS_ADVISED: "bg-blue-100 text-blue-700",
  PUNISHMENT_IMPOSED: "bg-orange-100 text-orange-700",
  NOTIFICATION_COMPLETE: "bg-blue-100 text-blue-700",
  APPEAL_PENDING: "bg-yellow-100 text-yellow-700",
  APPEAL_COMPLETE: "bg-green-100 text-green-700",
  REMEDIAL_ACTION_PENDING: "bg-red-100 text-red-700",
  CLOSED: "bg-gray-200 text-gray-600",
  CLOSED_SUSPENSION_ACTIVE: "bg-orange-100 text-orange-700",
  CLOSED_SUSPENSION_VACATED: "bg-gray-200 text-gray-600",
  CLOSED_SUSPENSION_REMITTED: "bg-gray-200 text-gray-600",
  DESTROYED: "bg-red-100 text-red-600",
};

function FlagBadge({ type, label }: { type: string; label: string }) {
  const colors: Record<string, string> = {
    overdue: "bg-error/10 text-error",
    ja: "bg-warning/10 text-warning",
    "5d": "bg-info/10 text-info",
    susp: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={cn("badge text-[10px]", colors[type] || "bg-gray-100 text-gray-600")}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const pendingCases = cases
    .filter((c) => !c.status.startsWith("CLOSED") && c.status !== "DESTROYED")
    .sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return b.daysInCurrentPhase - a.daysInCurrentPhase;
    })
    .slice(0, 10);

  const suspensionCases = cases
    .filter((c) => c.suspensionActive)
    .sort((a, b) => a.daysInCurrentPhase - b.daysInCurrentPhase);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-dark">
            Dashboard
          </h1>
          <Link href="/cases/new" className="btn-primary">
            + New Case
          </Link>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<FolderOpen size={20} />}
              label="Open Cases"
              value={stats.open}
              href="/cases?status=open"
              color="text-primary"
            />
            <StatCard
              icon={<ClipboardCheck size={20} />}
              label="Pending Signature"
              value={stats.pendingAppeal + stats.jaReviewPending}
              href="/dashboard?filter=signatures"
              color="text-info"
            />
            <StatCard
              icon={<Timer size={20} />}
              label="Suspensions Active"
              value={stats.activeSuspensions}
              href="/cases?filter=suspensions"
              color="text-warning"
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Overdue Actions"
              value={stats.overdue}
              href="/cases?filter=overdue"
              color="text-error"
              urgent={stats.overdue > 0}
            />
          </div>
        )}

        {/* Pending Actions Table */}
        <div className="card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-dark">Actions Required</h2>
            <Link href="/cases" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All Cases <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-neutral-mid text-sm">Loading...</div>
          ) : pendingCases.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-success text-3xl mb-2">&#10003;</div>
              <p className="text-sm text-neutral-mid">No pending actions. All cases are current.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Case #</th>
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Marine</th>
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Action Needed</th>
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Days</th>
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCases.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-mono text-primary font-medium hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium">{c.marineName}</span>
                        <span className="text-neutral-mid ml-1">({c.marineGrade})</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-neutral-dark">{c.nextActionRequired}</div>
                        <div className="text-xs text-neutral-mid">{c.nextActionOwner}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(c.overdue ? "text-error font-semibold" : "text-neutral-mid")}>
                          {c.daysInCurrentPhase}d
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {c.overdue && <FlagBadge type="overdue" label="!" />}
                          {c.jaReviewRequired && <FlagBadge type="ja" label="JA" />}
                          {c.suspensionActive && <FlagBadge type="susp" label="SUSP" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Active Suspensions */}
        {suspensionCases.length > 0 && (
          <div className="card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-neutral-dark">Active Suspensions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Case #</th>
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Marine</th>
                    <th className="text-left px-5 py-3 font-medium text-neutral-mid">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suspensionCases.map((c) => (
                    <tr key={c.id} className="border-b border-border hover:bg-surface/50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-mono text-primary font-medium hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{c.marineName}</td>
                      <td className="px-5 py-3">
                        <span className={cn("badge", STATUS_BADGE[c.status] || "bg-gray-100")}>
                          {c.status.replace(/_/g, " ")}
                        </span>
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

function StatCard({
  icon,
  label,
  value,
  href,
  color,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  color: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href} className="card p-5 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-lg bg-neutral-light", color)}>{icon}</div>
        {urgent && (
          <span className="badge bg-error text-white animate-pulse">!</span>
        )}
      </div>
      <div className="mt-3">
        <div className={cn("text-3xl font-semibold tracking-tight", color)}>{value}</div>
        <div className="text-sm text-neutral-mid mt-0.5">{label}</div>
      </div>
    </Link>
  );
}
