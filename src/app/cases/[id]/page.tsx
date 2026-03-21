"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import PhaseTracker from "@/components/cases/PhaseTracker";
import PhaseActions from "@/components/cases/PhaseActions";
import CaseInfo from "@/components/cases/CaseInfo";
import DocumentPanel from "@/components/documents/DocumentPanel";
import RemarksPanel from "@/components/cases/RemarksPanel";

interface CaseDetail {
  id: string;
  caseNumber: string;
  status: string;
  currentPhase: string;
  accusedLastName: string;
  accusedFirstName: string;
  accusedMiddleName: string;
  accusedRank: string;
  accusedGrade: string;
  accusedEdipi: string;
  accusedUnit: string;
  accusedUnitGcmca: string;
  commanderGrade: string;
  commanderGradeCategory: string;
  component: string;
  vesselException: boolean;
  item2AcceptsNjp: boolean | null;
  item2CounselProvided: boolean | null;
  item2SignedAt: string | null;
  item3SignedAt: string | null;
  item4Applicable: boolean;
  item6Date: string | null;
  item6NoPunishment: boolean;
  item7SuspensionDetails: string | null;
  item8AuthorityName: string | null;
  item9SignedAt: string | null;
  item10Date: string | null;
  item11SignedAt: string | null;
  item12IntendsToAppeal: boolean | null;
  item12SignedAt: string | null;
  item13AppealDate: string | null;
  item14Outcome: string | null;
  item14SignedAt: string | null;
  item15Date: string | null;
  item16SignedAt: string | null;
  item16UdNumber: string | null;
  item16UdDate: string | null;
  jaReviewRequired: boolean;
  jaReviewCompleted: boolean;
  ompfConfirmed: boolean;
  statuteOfLimitationsWarning: boolean;
  doublePunishmentFlag: boolean;
  offenses: {
    id: string;
    letter: string;
    ucmjArticle: string;
    offenseType: string;
    summary: string;
    offenseDate: string;
    offensePlace: string;
    finding: string | null;
    victims: {
      id: string;
      status: string;
      sex: string;
      race: string;
      ethnicity: string;
    }[];
  }[];
  punishments: {
    id: string;
    type: string;
    duration: number | null;
    amount: number | null;
    reducedToGrade: string | null;
    suspended: boolean;
    suspensionMonths: number | null;
  }[];
  remarks: {
    id: string;
    date: string;
    itemReference: string;
    text: string;
    confirmed: boolean;
  }[];
  suspensions: {
    id: string;
    punishment: string;
    status: string;
    startDate: string;
    endDate: string;
  }[];
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"actions" | "documents" | "remarks" | "info">(
    "actions"
  );
  const router = useRouter();

  function loadCase() {
    fetch(`/api/cases/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load case");
        return res.json();
      })
      .then((data) => setCaseData(data.case))
      .catch((err) => {
        console.error(err);
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCase();
  }, [id]);

  if (loading || !caseData) {
    return (
      <AppShell>
        <div className="text-center py-8">Loading case...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Case Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-navy)]">
              {caseData.caseNumber}
            </h1>
            <p className="text-[var(--color-text-muted)]">
              {caseData.accusedRank} {caseData.accusedLastName},{" "}
              {caseData.accusedFirstName} {caseData.accusedMiddleName} (
              {caseData.accusedGrade}) &middot; EDIPI: {caseData.accusedEdipi}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              caseData.status.startsWith("CLOSED")
                ? "bg-gray-100 text-gray-800"
                : caseData.status === "DESTROYED"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {caseData.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Warnings */}
        {caseData.statuteOfLimitationsWarning && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800">
            Offense may be outside NJP statute of limitations per MCO 5800.16
            para 010702.
          </div>
        )}
        {caseData.doublePunishmentFlag && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800">
            Prior NJP action detected for this offense. Double punishment is
            prohibited under Article 15, UCMJ.
          </div>
        )}

        {/* Phase Tracker */}
        <PhaseTracker
          currentPhase={caseData.currentPhase}
          status={caseData.status}
        />

        {/* Tabs */}
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex gap-6">
            {(
              [
                { key: "actions", label: "Phase Actions" },
                { key: "documents", label: "Documents" },
                { key: "remarks", label: "Item 21 Remarks" },
                { key: "info", label: "Case Info" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "actions" && (
            <PhaseActions caseData={caseData} onUpdate={loadCase} />
          )}
          {activeTab === "documents" && (
            <DocumentPanel caseId={caseData.id} component={caseData.component} commanderGradeCategory={caseData.commanderGradeCategory} />
          )}
          {activeTab === "remarks" && (
            <RemarksPanel caseId={caseData.id} remarks={caseData.remarks} onUpdate={loadCase} />
          )}
          {activeTab === "info" && <CaseInfo caseData={caseData} />}
        </div>
      </div>
    </AppShell>
  );
}
