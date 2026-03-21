"use client";

interface CaseData {
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
  item6Date: string | null;
  item8AuthorityName: string | null;
  item9SignedAt: string | null;
  item11SignedAt: string | null;
  item12IntendsToAppeal: boolean | null;
  item12SignedAt: string | null;
  item14Outcome: string | null;
  item14SignedAt: string | null;
  item16SignedAt: string | null;
  item16UdNumber: string | null;
  item16UdDate: string | null;
  jaReviewRequired: boolean;
  jaReviewCompleted: boolean;
  ompfConfirmed: boolean;
  offenses: {
    letter: string;
    ucmjArticle: string;
    offenseType: string;
    summary: string;
    offenseDate: string;
    offensePlace: string;
    finding: string | null;
    victims: { status: string; sex: string; race: string; ethnicity: string }[];
  }[];
  punishments: {
    type: string;
    duration: number | null;
    amount: number | null;
    reducedToGrade: string | null;
    suspended: boolean;
    suspensionMonths: number | null;
  }[];
  suspensions: {
    punishment: string;
    status: string;
    startDate: string;
    endDate: string;
  }[];
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-gray-100">
      <span className="w-48 text-sm text-[var(--color-text-muted)] shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function punishmentLabel(type: string): string {
  const labels: Record<string, string> = {
    CORRECTIONAL_CUSTODY: "Correctional Custody",
    FORFEITURE: "Forfeiture",
    REDUCTION: "Reduction in Grade",
    EXTRA_DUTIES: "Extra Duties",
    RESTRICTION: "Restriction",
    ARREST_IN_QUARTERS: "Arrest in Quarters",
    DETENTION_OF_PAY: "Detention of Pay",
  };
  return labels[type] || type;
}

export default function CaseInfo({ caseData }: { caseData: CaseData }) {
  return (
    <div className="space-y-6">
      {/* Accused */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Accused (Items 17-20)
        </h3>
        <InfoRow
          label="Name"
          value={`${caseData.accusedLastName}, ${caseData.accusedFirstName} ${caseData.accusedMiddleName}`}
        />
        <InfoRow label="Rank / Grade" value={`${caseData.accusedRank} / ${caseData.accusedGrade}`} />
        <InfoRow label="EDIPI" value={caseData.accusedEdipi} />
        <InfoRow label="Unit" value={caseData.accusedUnit} />
        <InfoRow label="GCMCA" value={caseData.accusedUnitGcmca} />
        <InfoRow label="Component" value={caseData.component.replace("_", " ")} />
        <InfoRow label="Vessel Exception" value={caseData.vesselException ? "Yes" : "No"} />
      </section>

      {/* Commander */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Commander
        </h3>
        <InfoRow label="Commander Grade" value={caseData.commanderGrade} />
        <InfoRow
          label="Grade Category"
          value={
            caseData.commanderGradeCategory === "FIELD_GRADE_AND_ABOVE"
              ? "Field Grade and Above (Major+)"
              : "Company Grade (Capt/Lt and below)"
          }
        />
        {caseData.item8AuthorityName && (
          <InfoRow label="NJP Authority" value={caseData.item8AuthorityName} />
        )}
      </section>

      {/* Offenses */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Offenses (Item 1)
        </h3>
        {caseData.offenses.map((o) => (
          <div key={o.letter} className="mb-4 border-b border-gray-100 pb-4 last:border-0">
            <div className="font-medium">
              {o.letter}. Article {o.ucmjArticle} - {o.offenseType}
            </div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">
              {o.summary}
            </div>
            <div className="text-sm mt-1">
              Date: {formatDate(o.offenseDate)} | Place: {o.offensePlace}
            </div>
            {o.finding && (
              <div className={`text-sm font-bold mt-1 ${o.finding === "G" ? "text-red-600" : "text-green-600"}`}>
                Finding: {o.finding === "G" ? "GUILTY" : "NOT GUILTY"}
              </div>
            )}
            {o.victims.length > 0 && (
              <div className="text-xs text-[var(--color-text-muted)] mt-1">
                Victims:{" "}
                {o.victims
                  .map((v) => `${v.status}/${v.sex}/${v.race}/${v.ethnicity}`)
                  .join("; ")}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Punishments */}
      {caseData.punishments.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
            Punishment (Item 6)
          </h3>
          <InfoRow label="Date Imposed" value={formatDate(caseData.item6Date)} />
          {caseData.punishments.map((p, i) => (
            <div key={i} className="py-2 border-b border-gray-100">
              <span className="font-medium text-sm">{punishmentLabel(p.type)}</span>
              {p.duration && <span className="text-sm"> - {p.duration} days</span>}
              {p.amount && <span className="text-sm"> - ${p.amount}</span>}
              {p.reducedToGrade && <span className="text-sm"> to {p.reducedToGrade}</span>}
              {p.suspended && (
                <span className="text-amber-600 text-sm ml-2">
                  (Suspended {p.suspensionMonths} months)
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Suspensions */}
      {caseData.suspensions.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
            Active Suspensions (Item 7)
          </h3>
          {caseData.suspensions.map((s, i) => (
            <div key={i} className="py-2 border-b border-gray-100">
              <InfoRow label="Punishment" value={punishmentLabel(s.punishment)} />
              <InfoRow label="Status" value={s.status} />
              <InfoRow label="Start" value={formatDate(s.startDate)} />
              <InfoRow label="End" value={formatDate(s.endDate)} />
            </div>
          ))}
        </section>
      )}

      {/* Signature Status */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Signature Status
        </h3>
        <InfoRow label="Item 2 (Accused)" value={caseData.item2SignedAt ? formatDate(caseData.item2SignedAt) : "Pending"} />
        <InfoRow label="Item 3 (CO Cert)" value={caseData.item3SignedAt ? formatDate(caseData.item3SignedAt) : "Pending"} />
        <InfoRow label="Item 9 (NJP Auth)" value={caseData.item9SignedAt ? formatDate(caseData.item9SignedAt) : "Pending"} />
        <InfoRow label="Item 11 (Notification)" value={caseData.item11SignedAt ? formatDate(caseData.item11SignedAt) : "Pending"} />
        <InfoRow label="Item 12 (Appeal Intent)" value={caseData.item12SignedAt ? formatDate(caseData.item12SignedAt) : "Pending"} />
        {caseData.item12IntendsToAppeal && (
          <InfoRow label="Item 14 (Appeal Decision)" value={caseData.item14SignedAt ? `${formatDate(caseData.item14SignedAt)} - ${caseData.item14Outcome}` : "Pending"} />
        )}
        <InfoRow label="Item 16 (Closure)" value={caseData.item16SignedAt ? formatDate(caseData.item16SignedAt) : "Pending"} />
        {caseData.item16UdNumber && (
          <InfoRow label="UD Number" value={`${caseData.item16UdNumber} DTD ${caseData.item16UdDate}`} />
        )}
        <InfoRow label="JA Review" value={
          !caseData.jaReviewRequired ? "Not Required" :
          caseData.jaReviewCompleted ? "Completed" : "Required - Pending"
        } />
        <InfoRow label="OMPF Confirmed" value={caseData.ompfConfirmed ? "Yes" : "No"} />
      </section>
    </div>
  );
}
