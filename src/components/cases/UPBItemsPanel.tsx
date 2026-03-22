"use client";

import { cn } from "@/lib/utils";
import { Lock, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

interface ItemCardProps {
  number: string;
  title: string;
  state: "LOCKED" | "COMPLETE" | "CURRENT" | "PENDING" | "NA";
  pendingOwner?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

function ItemCard({ number, title, state, pendingOwner, children, defaultOpen }: ItemCardProps) {
  const [open, setOpen] = useState(defaultOpen || state === "CURRENT");

  const stateStyles = {
    LOCKED: "bg-gray-50 border-gray-200",
    COMPLETE: "bg-bg border-border",
    CURRENT: "bg-bg border-secondary ring-1 ring-secondary/20",
    PENDING: "bg-surface border-border",
    NA: "bg-surface border-dashed border-border",
  };

  const stateIcons = {
    LOCKED: <Lock size={14} className="text-neutral-mid" />,
    COMPLETE: <Check size={14} className="text-success" />,
    CURRENT: <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />,
    PENDING: null,
    NA: null,
  };

  return (
    <div className={cn("rounded-lg border", stateStyles[state])}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-mono text-neutral-mid w-12 shrink-0">
          Item {number}
        </span>
        <span className="flex-1 text-sm font-medium text-neutral-dark truncate">
          {title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {state === "NA" && (
            <span className="text-xs text-neutral-mid">N/A</span>
          )}
          {state === "PENDING" && pendingOwner && (
            <span className="text-xs text-neutral-mid">{pendingOwner}</span>
          )}
          {stateIcons[state]}
          {children ? (
            open ? <ChevronDown size={14} className="text-neutral-mid" /> : <ChevronRight size={14} className="text-neutral-mid" />
          ) : null}
        </div>
      </button>
      {open && children && (
        <div className="px-4 pb-4 text-sm">
          {children}
        </div>
      )}
    </div>
  );
}

export default function UPBItemsPanel({ caseData, onUpdate }: { caseData: CaseData; onUpdate: () => void }) {
  const sigs = (caseData.signatures || []) as { itemNumber: string; signedDate: string; signerName: string }[];
  const hasSig = (item: string) => sigs.some((s) => s.itemNumber === item);
  const getSig = (item: string) => sigs.find((s) => s.itemNumber === item);
  const offenses = caseData.offenses || [];
  const pr = caseData.punishmentRecord;
  const appeal = caseData.appealRecord;
  const accused = caseData.accused;

  function itemState(item: string): "LOCKED" | "COMPLETE" | "CURRENT" | "PENDING" | "NA" {
    if (caseData.formLocked) return "LOCKED";
    if (hasSig(item)) return "LOCKED";
    // Determine based on phase
    if (item === "2" && !hasSig("2")) {
      return caseData.currentPhase === "INITIATION" || caseData.currentPhase === "RIGHTS_ADVISEMENT" ? "CURRENT" : "PENDING";
    }
    if (item === "3" && hasSig("2") && !hasSig("3")) return "CURRENT";
    if (item === "5" && hasSig("3") && caseData.currentPhase === "HEARING" && !offenses.every((o: { finding: string | null }) => o.finding)) return "CURRENT";
    if (item === "6" && offenses.every((o: { finding: string | null }) => o.finding) && !pr) return "CURRENT";
    if (item === "9" && pr && !hasSig("9")) return "CURRENT";
    if (item === "11" && hasSig("9") && !hasSig("11")) return "CURRENT";
    if (item === "12" && hasSig("11") && !hasSig("12")) return "CURRENT";
    if (item === "14" && appeal?.appealFiled && !hasSig("14")) return "CURRENT";
    if (item === "16" && !hasSig("16")) {
      const canClose = hasSig("12") && (appeal?.appealIntent !== "INTENDS_TO_APPEAL" || hasSig("14"));
      return canClose ? "CURRENT" : "PENDING";
    }
    return "COMPLETE";
  }

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-neutral-dark mb-3">UPB Form Items</h2>

      {/* Item 1 - Offenses */}
      <ItemCard number="1" title="UCMJ Offenses Alleged" state={hasSig("2") ? "LOCKED" : "COMPLETE"} defaultOpen>
        {offenses.map((o: { offenseLetter: string; ucmjArticle: string; offenseType: string; offenseSummary: string; offenseDate: string; offensePlace: string; finding?: string }) => (
          <div key={o.offenseLetter} className="mb-2 last:mb-0">
            <div className="font-medium">{o.offenseLetter}. Art. {o.ucmjArticle} - {o.offenseType}</div>
            <div className="text-neutral-mid text-xs mt-0.5">{o.offenseSummary}</div>
            <div className="text-neutral-mid text-xs">{o.offenseDate} at {o.offensePlace}</div>
          </div>
        ))}
      </ItemCard>

      {/* Item 2 - Rights */}
      <ItemCard number="2" title="Rights Advisement" state={itemState("2")} pendingOwner="ACCUSED">
        {hasSig("2") ? (
          <div className="text-neutral-mid">
            Signed: {getSig("2")?.signerName} - {getSig("2")?.signedDate}
          </div>
        ) : (
          <div className="text-neutral-mid">Awaiting accused signature</div>
        )}
      </ItemCard>

      {/* Item 3 - CO Cert */}
      <ItemCard number="3" title="CO Certification" state={itemState("3")} pendingOwner="NJP_AUTHORITY">
        {hasSig("3") && (
          <div className="text-neutral-mid">
            Signed: {getSig("3")?.signerName} - {getSig("3")?.signedDate}
          </div>
        )}
      </ItemCard>

      {/* Item 4 - UA (conditional) */}
      <ItemCard number="4" title="UA/Desertion Data" state={caseData.uaApplicable ? "COMPLETE" : "NA"}>
        {caseData.uaApplicable ? (
          <div className="text-neutral-mid">UA period and marks of desertion recorded</div>
        ) : (
          <div className="text-neutral-mid">N/A - No Art. 85/86 charges</div>
        )}
      </ItemCard>

      {/* Item 5 - Findings */}
      <ItemCard number="5" title="Findings" state={offenses.every((o: { finding: string | null }) => o.finding) ? (hasSig("9") ? "LOCKED" : "COMPLETE") : itemState("5")}>
        {offenses.map((o: { offenseLetter: string; ucmjArticle: string; finding: string | null }) => (
          <div key={o.offenseLetter} className="flex items-center gap-2">
            <span className="w-32">{o.offenseLetter}. Art. {o.ucmjArticle}</span>
            <span className={cn("font-medium", o.finding === "G" ? "text-error" : o.finding === "NG" ? "text-success" : "text-neutral-mid")}>
              {o.finding === "G" ? "GUILTY" : o.finding === "NG" ? "NOT GUILTY" : "Pending"}
            </span>
          </div>
        ))}
      </ItemCard>

      {/* Item 6 - Punishment */}
      <ItemCard number="6" title="Punishment Imposed" state={pr ? (hasSig("9") ? "LOCKED" : "COMPLETE") : "PENDING"} pendingOwner="NJP_AUTHORITY">
        {pr && (
          <div>
            <div className="text-neutral-dark">{pr.punishmentText}</div>
            <div className="text-xs text-neutral-mid mt-1">Date: {pr.punishmentDate}</div>
          </div>
        )}
      </ItemCard>

      {/* Item 7 - Suspension */}
      <ItemCard number="7" title="Suspension" state={pr ? (hasSig("9") ? "LOCKED" : "COMPLETE") : "PENDING"}>
        {pr && (
          <div className="text-neutral-mid">{pr.suspensionText || "NONE"}</div>
        )}
      </ItemCard>

      {/* Items 8-9 */}
      <ItemCard number="8-9" title="NJP Authority & Signature" state={hasSig("9") ? "LOCKED" : (pr ? "CURRENT" : "PENDING")} pendingOwner="NJP_AUTHORITY">
        {caseData.njpAuthorityName && (
          <div className="text-neutral-mid">
            {caseData.njpAuthorityName} - {caseData.njpAuthorityTitle}
            {hasSig("9") && <div className="mt-1">Signed: {getSig("9")?.signedDate}</div>}
          </div>
        )}
      </ItemCard>

      {/* Items 10-11 */}
      <ItemCard number="10-11" title="Notification & Appeal Rights" state={hasSig("11") ? "LOCKED" : itemState("11")} pendingOwner="NJP_AUTHORITY">
        {caseData.dateNoticeToAccused && (
          <div className="text-neutral-mid">
            Notice date: {caseData.dateNoticeToAccused}
            {hasSig("11") && <div>Signed: {getSig("11")?.signedDate}</div>}
          </div>
        )}
      </ItemCard>

      {/* Item 12 */}
      <ItemCard number="12" title="Accused Appeal Election" state={hasSig("12") ? "LOCKED" : itemState("12")} pendingOwner="ACCUSED">
        {appeal && (
          <div className="text-neutral-mid">
            {appeal.appealIntent?.replace(/_/g, " ")}
            {hasSig("12") && <div>Signed: {getSig("12")?.signedDate}</div>}
          </div>
        )}
      </ItemCard>

      {/* Items 13-14 - Appeal */}
      {appeal?.appealIntent === "INTENDS_TO_APPEAL" && (
        <>
          <ItemCard number="13" title="Date of Appeal" state={appeal.appealFiled ? "COMPLETE" : "CURRENT"}>
            {appeal.appealFiledDate && <div className="text-neutral-mid">Filed: {appeal.appealFiledDate}</div>}
          </ItemCard>
          <ItemCard number="14" title="Appeal Authority Decision" state={hasSig("14") ? "LOCKED" : itemState("14")} pendingOwner="APPEAL_AUTHORITY">
            {appeal.appealOutcome && (
              <div className="text-neutral-mid">
                {appeal.appealOutcome.replace(/_/g, " ")}
                {appeal.appealOutcomeDetail && <div className="mt-1">{appeal.appealOutcomeDetail}</div>}
              </div>
            )}
          </ItemCard>
          <ItemCard number="15" title="Notice of Appeal Decision" state={caseData.dateNoticeAppealDecision ? "COMPLETE" : "PENDING"}>
            {caseData.dateNoticeAppealDecision && (
              <div className="text-neutral-mid">Date: {caseData.dateNoticeAppealDecision}</div>
            )}
          </ItemCard>
        </>
      )}

      {/* Item 16 */}
      <ItemCard number="16" title="Administrative Completion" state={hasSig("16") ? "LOCKED" : itemState("16")} pendingOwner="ADMIN">
        {caseData.item16SignedDate && (
          <div className="text-neutral-mid">
            UD# {caseData.item16UdNumber} DTD {caseData.item16Dtd}
            <div>Signed: {caseData.item16SignedDate}</div>
          </div>
        )}
      </ItemCard>

      {/* Items 17-20, 22-25 - Accused Data */}
      <ItemCard number="17-20" title="Accused Biographical Data" state={hasSig("2") ? "LOCKED" : "COMPLETE"} defaultOpen>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="text-neutral-mid">Name:</span> {accused.lastName}, {accused.firstName} {accused.middleName || ""}</div>
          <div><span className="text-neutral-mid">Rank/Grade:</span> {accused.rank}/{accused.grade}</div>
          <div><span className="text-neutral-mid">EDIPI:</span> <span className="font-mono">{accused.edipi}</span></div>
          <div><span className="text-neutral-mid">Unit:</span> {accused.unitFullString}</div>
          <div><span className="text-neutral-mid">Component:</span> {caseData.component}</div>
        </div>
      </ItemCard>

      {/* Item 22 - Victims */}
      <ItemCard number="22" title="Victim Demographics" state={hasSig("2") ? "LOCKED" : "COMPLETE"}>
        {offenses.map((o: { offenseLetter: string; victims: { victimStatus: string; victimSex: string; victimRace: string; victimEthnicity: string }[] }) => (
          o.victims?.map((v, vi) => (
            <div key={`${o.offenseLetter}-${vi}`} className="text-xs text-neutral-mid">
              {o.offenseLetter}. {v.victimStatus} / {v.victimSex} / {v.victimRace} / {v.victimEthnicity}
            </div>
          ))
        ))}
      </ItemCard>
    </div>
  );
}
