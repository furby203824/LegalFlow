"use client";

import { useState } from "react";
import { Save, ChevronDown, ChevronUp } from "lucide-react";
import { updateRightsAcknowledgement } from "@/services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

interface RightsAcknowledgementPanelProps {
  caseId: string;
  caseData: Rec;
  onUpdate: () => void;
}

export default function RightsAcknowledgementPanel({ caseId, caseData, onUpdate }: RightsAcknowledgementPanelProps) {
  const ra = caseData.rightsAcknowledgement || {};
  const accused = caseData.accused || {};
  const offenses = caseData.offenses || [];
  const locked = ra.locked || false;

  // Accused data is read-only — pulled from case record
  const accusedName = `${accused.lastName || ""}, ${accused.firstName || ""}${accused.middleName ? " " + accused.middleName.charAt(0) + "." : ""}`;
  const accusedRateRank = accused.rank ? `${accused.grade || ""}/${accused.rank}` : accused.grade || "";
  const accusedService = accused.serviceBranch || "USMC";
  const activityUnit = accused.unitFullString || "";
  const dateOfBirth = accused.dateOfBirth || "";

  // Auto-populate suspected offenses from case offenses
  const defaultOffensesText = offenses
    .map((o: Rec) => `Violation of UCMJ, Article ${o.ucmjArticle}${o.offenseType ? ` (${o.offenseType})` : ""}${o.offenseSummary ? `: ${o.offenseSummary}` : ""}`)
    .join("\n");

  // Interviewer fields (form-specific, not on case record)
  const [interviewerName, setInterviewerName] = useState(ra.interviewerName || "");
  const [interviewerRateRank, setInterviewerRateRank] = useState(ra.interviewerRateRank || "");
  const [interviewerService, setInterviewerService] = useState(ra.interviewerService || "USN");
  const [interviewerOrg, setInterviewerOrg] = useState(ra.interviewerOrg || "");
  const [interviewerBillet, setInterviewerBillet] = useState(ra.interviewerBillet || "");
  const [interviewLocation, setInterviewLocation] = useState(ra.interviewLocation || "");
  const [interviewTime, setInterviewTime] = useState(ra.interviewTime || "");
  const [interviewDate, setInterviewDate] = useState(ra.interviewDate || "");

  // Allow override of auto-populated offenses text only if previously saved
  const [suspectedOffenses, setSuspectedOffenses] = useState(ra.suspectedOffenses || defaultOffensesText);

  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    header: true,
    offenses: true,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      await updateRightsAcknowledgement(caseId, {
        interviewerName, interviewerRateRank, interviewerService,
        interviewerOrg, interviewerBillet,
        interviewLocation, interviewTime, interviewDate,
        suspectedOffenses,
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-dark">Suspect&apos;s Rights Acknowledgement/Statement</h2>
          <p className="text-xs text-neutral-mid">JAGINST 5800.7G, CH-1 &mdash; See JAGMAN 0175</p>
        </div>
        <div className="flex gap-2">
          {!locked && (
            <button onClick={saveAll} disabled={saving} className="btn-primary text-xs gap-1">
              <Save size={14} /> {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Header / Identification */}
      <CollapsibleSection
        title="Identification"
        open={openSections.header}
        onToggle={() => toggleSection("header")}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Accused / Suspect <span className="text-neutral-mid font-normal">(from case record)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Label>Full Name (Last, First MI)</Label>
              <input className="input-field bg-gray-50" value={accusedName} disabled />
            </div>
            <div>
              <Label>Rate/Rank</Label>
              <input className="input-field bg-gray-50" value={accusedRateRank} disabled />
            </div>
            <div>
              <Label>Service</Label>
              <input className="input-field bg-gray-50" value={accusedService} disabled />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Activity/Unit</Label>
              <input className="input-field bg-gray-50" value={activityUnit} disabled />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <input className="input-field bg-gray-50" value={dateOfBirth || "Not provided"} disabled />
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Interviewer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Name (Last, First MI)</Label>
              <input className="input-field" value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Rate/Rank</Label>
              <input className="input-field" value={interviewerRateRank} onChange={(e) => setInterviewerRateRank(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Service</Label>
              <select className="input-field" value={interviewerService} onChange={(e) => setInterviewerService(e.target.value)} disabled={locked}>
                <option value="USN">USN</option>
                <option value="USMC">USMC</option>
                <option value="USCG">USCG</option>
                <option value="USA">USA</option>
                <option value="USAF">USAF</option>
                <option value="USSF">USSF</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Organization</Label>
              <input className="input-field" value={interviewerOrg} onChange={(e) => setInterviewerOrg(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Billet</Label>
              <input className="input-field" value={interviewerBillet} onChange={(e) => setInterviewerBillet(e.target.value)} disabled={locked} />
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Interview Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Location of Interview</Label>
              <input className="input-field" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Time</Label>
              <input type="time" className="input-field" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" className="input-field" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} disabled={locked} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Suspected Offenses */}
      <CollapsibleSection
        title="Suspected Offenses"
        open={openSections.offenses}
        onToggle={() => toggleSection("offenses")}
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-mid italic">
            Auto-populated from case offenses. Edit if needed.
          </p>
          <textarea
            className="input-field min-h-[80px]"
            value={suspectedOffenses}
            onChange={(e) => setSuspectedOffenses(e.target.value)}
            placeholder="Describe suspected offense(s)..."
            disabled={locked}
          />
        </div>
      </CollapsibleSection>

      <p className="text-xs text-neutral-mid italic text-center py-2">
        Rights, waiver, signatures, and statement sections are completed manually on the printed form.
      </p>

      {/* Bottom action */}
      <div className="flex gap-2 justify-end pt-2">
        {!locked && (
          <button onClick={saveAll} disabled={saving} className="btn-primary text-xs gap-1">
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-neutral-dark">{title}</h3>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="p-4 border-t border-border">{children}</div>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-neutral-mid mb-1">{children}</label>;
}
