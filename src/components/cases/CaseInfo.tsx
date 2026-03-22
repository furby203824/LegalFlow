"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-gray-100">
      <span className="w-48 text-sm text-[var(--color-text-muted)] shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export default function CaseInfo({ caseData }: { caseData: CaseData }) {
  const accused = caseData.accused;
  const pr = caseData.punishmentRecord;
  const appeal = caseData.appealRecord;
  const sigs = (caseData.signatures || []) as { itemNumber: string; signedDate: string; signerName: string }[];
  const getSigDate = (item: string) => sigs.find((s) => s.itemNumber === item)?.signedDate;

  return (
    <div className="space-y-6">
      {/* Accused */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Accused (Items 17-20)</h3>
        <InfoRow label="Name" value={`${accused.lastName}, ${accused.firstName} ${accused.middleName || ""}`} />
        <InfoRow label="Rank / Grade" value={`${accused.rank} / ${accused.grade}`} />
        <InfoRow label="EDIPI" value={accused.edipi} />
        <InfoRow label="Unit" value={accused.unitFullString} />
        <InfoRow label="Component" value={caseData.component} />
        <InfoRow label="Vessel Exception" value={caseData.vesselException ? "Yes" : "No"} />
      </section>

      {/* Commander */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Commander</h3>
        <InfoRow label="Grade Level" value={
          caseData.commanderGradeLevel === "FIELD_GRADE_AND_ABOVE"
            ? "Field Grade and Above (Major+)" : "Company Grade (Capt/Lt and below)"
        } />
        {caseData.njpAuthorityName && (
          <>
            <InfoRow label="NJP Authority" value={caseData.njpAuthorityName} />
            <InfoRow label="Title" value={caseData.njpAuthorityTitle || "\u2014"} />
            <InfoRow label="Rank/Grade" value={`${caseData.njpAuthorityRank || ""} / ${caseData.njpAuthorityGrade || ""}`} />
          </>
        )}
      </section>

      {/* Offenses */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Offenses (Item 1)</h3>
        {caseData.offenses.map((o: { offenseLetter: string; ucmjArticle: string; offenseType: string; offenseSummary: string; offenseDate: string; offensePlace: string; finding: string | null; victims: { victimStatus: string; victimSex: string; victimRace: string; victimEthnicity: string }[] }) => (
          <div key={o.offenseLetter} className="mb-4 border-b border-gray-100 pb-4 last:border-0">
            <div className="font-medium">{o.offenseLetter}. Article {o.ucmjArticle} - {o.offenseType}</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-1">{o.offenseSummary}</div>
            <div className="text-sm mt-1">Date: {formatDate(o.offenseDate)} | Place: {o.offensePlace}</div>
            {o.finding && (
              <div className={`text-sm font-bold mt-1 ${o.finding === "G" ? "text-red-600" : "text-green-600"}`}>
                Finding: {o.finding === "G" ? "GUILTY" : "NOT GUILTY"}
              </div>
            )}
            {o.victims?.length > 0 && (
              <div className="text-xs text-[var(--color-text-muted)] mt-1">
                Victims: {o.victims.map((v) => `${v.victimStatus}/${v.victimSex}/${v.victimRace}/${v.victimEthnicity}`).join("; ")}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Punishment */}
      {pr && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Punishment (Item 6)</h3>
          <InfoRow label="Date Imposed" value={formatDate(pr.punishmentDate)} />
          <InfoRow label="Punishment" value={pr.punishmentText} />
          {pr.suspensionImposed && (
            <>
              <InfoRow label="Suspension (Item 7)" value={pr.suspensionText} />
              <InfoRow label="Suspension Status" value={pr.suspensionStatus} />
              <InfoRow label="Suspension End" value={formatDate(pr.suspensionEndDate)} />
            </>
          )}
          {pr.anyJaThresholdMet && (
            <InfoRow label="JA Review Required" value="Yes - threshold met" />
          )}
        </section>
      )}

      {/* Appeal */}
      {appeal && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Appeal</h3>
          <InfoRow label="Intent" value={appeal.appealIntent?.replace(/_/g, " ") || "\u2014"} />
          <InfoRow label="Appeal Filed" value={appeal.appealFiled ? formatDate(appeal.appealFiledDate) : "No"} />
          {appeal.appealOutcome && (
            <>
              <InfoRow label="Outcome" value={appeal.appealOutcome.replace(/_/g, " ")} />
              <InfoRow label="Detail" value={appeal.appealOutcomeDetail || "\u2014"} />
              <InfoRow label="Decision Date" value={formatDate(appeal.appealAuthoritySignedDate)} />
            </>
          )}
        </section>
      )}

      {/* Signature Status */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Signature Status</h3>
        {["2", "3", "9", "11", "12", "14", "16"].map((item) => (
          <InfoRow key={item} label={`Item ${item}`} value={getSigDate(item) ? formatDate(getSigDate(item)!) : "Pending"} />
        ))}
        {caseData.item16UdNumber && (
          <InfoRow label="UD Number" value={`${caseData.item16UdNumber} DTD ${caseData.item16Dtd}`} />
        )}
        <InfoRow label="JA Review" value={
          !caseData.jaReviewRequired ? "Not Required" :
          caseData.jaReviewComplete ? "Completed" : "Required - Pending"
        } />
        <InfoRow label="OMPF Confirmed" value={caseData.ompfScanConfirmed ? "Yes" : "No"} />
        <InfoRow label="Form Locked" value={caseData.formLocked ? "Yes" : "No"} />
      </section>

      {/* Suspension Monitor */}
      {caseData.suspensionMonitor && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Suspension Monitor</h3>
          <InfoRow label="Status" value={caseData.suspensionMonitor.monitorStatus} />
          <InfoRow label="Start" value={formatDate(caseData.suspensionMonitor.suspensionStart)} />
          <InfoRow label="End" value={formatDate(caseData.suspensionMonitor.suspensionEnd)} />
          <InfoRow label="Punishment" value={caseData.suspensionMonitor.suspendedPunishment} />
          {caseData.suspensionMonitor.daysRemaining !== null && (
            <InfoRow label="Days Remaining" value={caseData.suspensionMonitor.daysRemaining} />
          )}
        </section>
      )}
    </div>
  );
}
