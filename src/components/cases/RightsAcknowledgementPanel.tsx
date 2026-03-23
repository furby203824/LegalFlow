"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Save, Printer, ChevronDown, ChevronUp } from "lucide-react";
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
  const locked = ra.locked || false;

  // Header fields
  const [accusedName, setAccusedName] = useState(ra.accusedName || `${accused.lastName || ""}, ${accused.firstName || ""}${accused.middleName ? " " + accused.middleName.charAt(0) + "." : ""}`);
  const [accusedRateRank, setAccusedRateRank] = useState(ra.accusedRateRank || `${accused.grade || ""}/${accused.rank || ""}`);
  const [accusedService, setAccusedService] = useState(ra.accusedService || "USN");
  const [activityUnit, setActivityUnit] = useState(ra.activityUnit || accused.unitFullString || "");
  const [dateOfBirth, setDateOfBirth] = useState(ra.dateOfBirth || "");
  const [interviewerName, setInterviewerName] = useState(ra.interviewerName || "");
  const [interviewerRateRank, setInterviewerRateRank] = useState(ra.interviewerRateRank || "");
  const [interviewerService, setInterviewerService] = useState(ra.interviewerService || "USN");
  const [interviewerOrg, setInterviewerOrg] = useState(ra.interviewerOrg || "");
  const [interviewerBillet, setInterviewerBillet] = useState(ra.interviewerBillet || "");
  const [interviewLocation, setInterviewLocation] = useState(ra.interviewLocation || "");
  const [interviewTime, setInterviewTime] = useState(ra.interviewTime || "");
  const [interviewDate, setInterviewDate] = useState(ra.interviewDate || "");

  // Rights section - suspected offenses text
  const [suspectedOffenses, setSuspectedOffenses] = useState(ra.suspectedOffenses || "");

  // Rights initials (1-6)
  const [rightsInitials, setRightsInitials] = useState<Record<string, string>>({
    r1: ra.rightsInitials?.r1 || "",
    r2: ra.rightsInitials?.r2 || "",
    r3: ra.rightsInitials?.r3 || "",
    r4: ra.rightsInitials?.r4 || "",
    r5: ra.rightsInitials?.r5 || "",
    r6: ra.rightsInitials?.r6 || "",
  });

  // Waiver initials (1-6) + acknowledgement
  const [waiverInitials, setWaiverInitials] = useState<Record<string, string>>({
    ack: ra.waiverInitials?.ack || "",
    w1: ra.waiverInitials?.w1 || "",
    w2: ra.waiverInitials?.w2 || "",
    w3: ra.waiverInitials?.w3 || "",
    w4: ra.waiverInitials?.w4 || "",
    w5: ra.waiverInitials?.w5 || "",
    w6: ra.waiverInitials?.w6 || "",
  });

  // Signatures
  const [accusedSignDate, setAccusedSignDate] = useState(ra.accusedSignDate || "");
  const [accusedSignTime, setAccusedSignTime] = useState(ra.accusedSignTime || "");
  const [interviewerSignDate, setInterviewerSignDate] = useState(ra.interviewerSignDate || "");
  const [interviewerSignTime, setInterviewerSignTime] = useState(ra.interviewerSignTime || "");
  const [witnessName, setWitnessName] = useState(ra.witnessName || "");
  const [witnessSignDate, setWitnessSignDate] = useState(ra.witnessSignDate || "");
  const [witnessSignTime, setWitnessSignTime] = useState(ra.witnessSignTime || "");

  // Statement
  const [statementText, setStatementText] = useState(ra.statementText || "");

  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    header: true,
    rights: true,
    waiver: false,
    previousStatements: false,
    signatures: false,
    statement: false,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setRightsInitial(key: string, val: string) {
    setRightsInitials((prev) => ({ ...prev, [key]: val }));
  }

  function setWaiverInitial(key: string, val: string) {
    setWaiverInitials((prev) => ({ ...prev, [key]: val }));
  }

  async function saveAll() {
    setSaving(true);
    try {
      await updateRightsAcknowledgement(caseId, {
        accusedName, accusedRateRank, accusedService,
        activityUnit, dateOfBirth,
        interviewerName, interviewerRateRank, interviewerService,
        interviewerOrg, interviewerBillet,
        interviewLocation, interviewTime, interviewDate,
        suspectedOffenses,
        rightsInitials, waiverInitials,
        accusedSignDate, accusedSignTime,
        interviewerSignDate, interviewerSignTime,
        witnessName, witnessSignDate, witnessSignTime,
        statementText,
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
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Accused / Suspect</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Label>Full Name (Last, First MI)</Label>
              <input className="input-field" value={accusedName} onChange={(e) => setAccusedName(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Rate/Rank</Label>
              <input className="input-field" value={accusedRateRank} onChange={(e) => setAccusedRateRank(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Service</Label>
              <select className="input-field" value={accusedService} onChange={(e) => setAccusedService(e.target.value)} disabled={locked}>
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
              <Label>Activity/Unit</Label>
              <input className="input-field" value={activityUnit} onChange={(e) => setActivityUnit(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <input type="date" className="input-field" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={locked} />
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

      {/* RIGHTS */}
      <CollapsibleSection
        title="Rights"
        open={openSections.rights}
        onToggle={() => toggleSection("rights")}
      >
        <div className="space-y-4">
          <p className="text-xs text-neutral-mid italic">
            I certify and acknowledge by my signature and initials set forth below that, before the
            interviewer requested a statement from me, the interviewer warned me that:
          </p>

          {/* (1) Suspected offenses */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm mb-2"><span className="font-medium">(1)</span> I am suspected of having committed the following offense(s):</p>
                <textarea
                  className="input-field min-h-[80px]"
                  value={suspectedOffenses}
                  onChange={(e) => setSuspectedOffenses(e.target.value)}
                  placeholder="Describe suspected offense(s)..."
                  disabled={locked}
                />
              </div>
              <InitialsBox value={rightsInitials.r1} onChange={(v) => setRightsInitial("r1", v)} disabled={locked} />
            </div>
          </div>

          {/* (2) Right to remain silent */}
          <RightsItem
            number="(2)"
            text="I have the right to remain silent."
            value={rightsInitials.r2}
            onChange={(v) => setRightsInitial("r2", v)}
            disabled={locked}
          />

          {/* (3) Statements may be used as evidence */}
          <RightsItem
            number="(3)"
            text="Any statement I do make may be considered by the convening authority and used as evidence against me in trial by court-martial."
            value={rightsInitials.r3}
            onChange={(v) => setRightsInitial("r3", v)}
            disabled={locked}
          />

          {/* (4) Right to consult with lawyer */}
          <RightsItem
            number="(4)"
            text="I have the right to consult with lawyer counsel before any questioning. This lawyer counsel may be a civilian lawyer retained by me at my own expense, a military lawyer appointed to act as my counsel without cost to me, or both."
            value={rightsInitials.r4}
            onChange={(v) => setRightsInitial("r4", v)}
            disabled={locked}
          />

          {/* (5) Right to have lawyer present */}
          <RightsItem
            number="(5)"
            text="I have the right to have such retained civilian lawyer or appointed military lawyer present during this interview."
            value={rightsInitials.r5}
            onChange={(v) => setRightsInitial("r5", v)}
            disabled={locked}
          />

          {/* (6) Right to stop interview */}
          <RightsItem
            number="(6)"
            text="If I decide to answer questions now without a lawyer present, I will have the right to stop this interview at any time."
            value={rightsInitials.r6}
            onChange={(v) => setRightsInitial("r6", v)}
            disabled={locked}
          />
        </div>
      </CollapsibleSection>

      {/* WAIVER OF RIGHTS */}
      <CollapsibleSection
        title="Waiver of Rights"
        open={openSections.waiver}
        onToggle={() => toggleSection("waiver")}
      >
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm flex-1">
                I further certify and acknowledge that I have read the above statement of my rights
                and fully understand them, and that:
              </p>
              <InitialsBox value={waiverInitials.ack} onChange={(v) => setWaiverInitial("ack", v)} disabled={locked} />
            </div>
          </div>

          <RightsItem
            number="(1)"
            text="I expressly desire to waive my right to remain silent."
            value={waiverInitials.w1}
            onChange={(v) => setWaiverInitial("w1", v)}
            disabled={locked}
          />

          <RightsItem
            number="(2)"
            text="I expressly desire to make a statement."
            value={waiverInitials.w2}
            onChange={(v) => setWaiverInitial("w2", v)}
            disabled={locked}
          />

          <RightsItem
            number="(3)"
            text="I expressly do not desire to consult with either a civilian lawyer retained by me or a military lawyer appointed as my counsel without cost to me before any questioning."
            value={waiverInitials.w3}
            onChange={(v) => setWaiverInitial("w3", v)}
            disabled={locked}
          />

          <RightsItem
            number="(4)"
            text="I expressly do not desire to have such a lawyer present with me during this interview."
            value={waiverInitials.w4}
            onChange={(v) => setWaiverInitial("w4", v)}
            disabled={locked}
          />

          <RightsItem
            number="(5)"
            text="This acknowledgement and waiver of rights is made freely and voluntarily by me, and without any promises or threats having been made to me or pressure or coercion of any kind having been used against me."
            value={waiverInitials.w5}
            onChange={(v) => setWaiverInitial("w5", v)}
            disabled={locked}
          />

          <RightsItem
            number="(6)"
            text="I understand that, even though I initially waive my rights to counsel and to remain silent, I may, during the interview, assert my right to counsel or to remain silent."
            value={waiverInitials.w6}
            onChange={(v) => setWaiverInitial("w6", v)}
            disabled={locked}
          />
        </div>
      </CollapsibleSection>

      {/* PREVIOUS STATEMENTS */}
      <CollapsibleSection
        title="Previous Statements"
        open={openSections.previousStatements}
        onToggle={() => toggleSection("previousStatements")}
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-mid italic">
            NOTE: If the suspect indicates he or she is willing to make a statement, he or she should
            first be asked whether he or she has made a statement in response to questions about the
            suspected offense to anyone he or she believed was acting in a law enforcement capacity
            before the present interview. If the suspect indicates he or she has previously made such
            a statement, advise the suspect as follows:
          </p>
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm italic">
              I certify and acknowledge by my signature and initials set forth below that, before the
              interviewer requested a statement from me, the interviewer warned me that:
            </p>
            <p className="text-sm">
              <span className="font-medium">(1)</span> My previous statement may not be admissible at
              courts-martial and may not be usable against me. (It may not be possible to determine
              whether a previous statement made by the suspect will be admissible at some future
              court-martial; this suggests it may be wise to treat it as inadmissible and provide
              the cleansing warning).
            </p>
            <p className="text-sm">
              <span className="font-medium">(2)</span> Regardless of the fact that I have talked about
              this offense before, I still have the right to remain silent now.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* SIGNATURES */}
      <CollapsibleSection
        title="Signatures"
        open={openSections.signatures}
        onToggle={() => toggleSection("signatures")}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Accused / Suspect</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Time</Label>
              <input type="time" className="input-field" value={accusedSignTime} onChange={(e) => setAccusedSignTime(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" className="input-field" value={accusedSignDate} onChange={(e) => setAccusedSignDate(e.target.value)} disabled={locked} />
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Interviewer</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Time</Label>
              <input type="time" className="input-field" value={interviewerSignTime} onChange={(e) => setInterviewerSignTime(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" className="input-field" value={interviewerSignDate} onChange={(e) => setInterviewerSignDate(e.target.value)} disabled={locked} />
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-xs font-medium text-neutral-mid uppercase tracking-wide">Witness</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Witness Name</Label>
              <input className="input-field" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Time</Label>
              <input type="time" className="input-field" value={witnessSignTime} onChange={(e) => setWitnessSignTime(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Date</Label>
              <input type="date" className="input-field" value={witnessSignDate} onChange={(e) => setWitnessSignDate(e.target.value)} disabled={locked} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* STATEMENT */}
      <CollapsibleSection
        title="Statement"
        open={openSections.statement}
        onToggle={() => toggleSection("statement")}
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-mid italic">
            The statement which appears on this page (and the following pages, all of which are signed
            by me), is made freely and voluntarily by me, and without any promises or threats having
            been made to me or pressure or coercion of any kind having been used against me.
          </p>
          <textarea
            className="input-field min-h-[300px] font-mono text-sm"
            value={statementText}
            onChange={(e) => setStatementText(e.target.value)}
            placeholder="Enter statement here..."
            disabled={locked}
          />
        </div>
      </CollapsibleSection>

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

function RightsItem({
  number, text, value, onChange, disabled,
}: {
  number: string; text: string; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm flex-1"><span className="font-medium">{number}</span> {text}</p>
        <InitialsBox value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

function InitialsBox({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <div className="shrink-0">
      <input
        className="w-16 h-10 text-center text-sm font-mono border border-border rounded bg-surface uppercase"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        maxLength={4}
        placeholder="Init."
        disabled={disabled}
      />
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
