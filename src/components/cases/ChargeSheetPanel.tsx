"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Save, Printer, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { updateChargeSheet } from "@/services/api";
import ChargeSheetPrint from "./ChargeSheetPrint";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

interface ChargeSheetPanelProps {
  caseId: string;
  caseData: Rec;
  onUpdate: () => void;
}

export default function ChargeSheetPanel({ caseId, caseData, onUpdate }: ChargeSheetPanelProps) {
  const cs = caseData.chargeSheet || {};
  const accused = caseData.accused || {};
  const offenses = caseData.offenses || [];
  const isCourtMartial = caseData.status === "REFERRED_COURT_MARTIAL";
  const locked = cs.locked || false;
  const [showPrint, setShowPrint] = useState(false);

  // Section I: Personal Data (auto-populated from case, editable overrides)
  const [accusedName, setAccusedName] = useState(cs.accusedName || `${accused.lastName || ""}, ${accused.firstName || ""}${accused.middleName ? " " + accused.middleName.charAt(0) + "." : ""}`);
  const [ssn, setSsn] = useState(cs.ssn || "");
  const [gradeOrRank, setGradeOrRank] = useState(cs.gradeOrRank || `${accused.grade || ""}/${accused.rank || ""}`);
  const [payGrade, setPayGrade] = useState(cs.payGrade || accused.grade || "");
  const [unitOrOrg, setUnitOrOrg] = useState(cs.unitOrOrg || accused.unitFullString || "");
  const [serviceInitialDate, setServiceInitialDate] = useState(cs.serviceInitialDate || "");
  const [serviceTerm, setServiceTerm] = useState(cs.serviceTerm || "");
  const [payBasic, setPayBasic] = useState(cs.payBasic || "");
  const [paySeaForeign, setPaySeaForeign] = useState(cs.paySeaForeign || "");
  const [payTotal, setPayTotal] = useState(cs.payTotal || "");
  const [natureOfRestraint, setNatureOfRestraint] = useState(cs.natureOfRestraint || "None");
  const [datesImposed, setDatesImposed] = useState(cs.datesImposed || "");

  // Section II: Charges and Specifications
  const [charges, setCharges] = useState<{ article: string; specification: string }[]>(
    cs.charges || offenses.map((o: Rec) => ({
      article: o.ucmjArticle || "",
      specification: o.offenseSummary || o.summary || "",
    }))
  );

  // Section III: Preferral
  const [accuserName, setAccuserName] = useState(cs.accuserName || "");
  const [accuserGrade, setAccuserGrade] = useState(cs.accuserGrade || "");
  const [accuserOrg, setAccuserOrg] = useState(cs.accuserOrg || "");
  const [accuserSignedDate, setAccuserSignedDate] = useState(cs.accuserSignedDate || "");
  const [oathOfficerName, setOathOfficerName] = useState(cs.oathOfficerName || "");
  const [oathOfficerOrg, setOathOfficerOrg] = useState(cs.oathOfficerOrg || "");
  const [oathOfficerGrade, setOathOfficerGrade] = useState(cs.oathOfficerGrade || "");
  const [oathOfficerCapacity, setOathOfficerCapacity] = useState(cs.oathOfficerCapacity || "");

  // Item 12: Notification
  const [notificationDate, setNotificationDate] = useState(cs.notificationDate || "");
  const [notificationCmdrName, setNotificationCmdrName] = useState(cs.notificationCmdrName || "");
  const [notificationCmdrOrg, setNotificationCmdrOrg] = useState(cs.notificationCmdrOrg || "");
  const [notificationCmdrGrade, setNotificationCmdrGrade] = useState(cs.notificationCmdrGrade || "");

  // Item 13: Receipt by SCM Convening Authority
  const [receiptDate, setReceiptDate] = useState(cs.receiptDate || "");
  const [receiptTime, setReceiptTime] = useState(cs.receiptTime || "");
  const [receiptLocation, setReceiptLocation] = useState(cs.receiptLocation || "");
  const [receiptDesignation, setReceiptDesignation] = useState(cs.receiptDesignation || "");
  const [receiptOfficerName, setReceiptOfficerName] = useState(cs.receiptOfficerName || "");
  const [receiptOfficerCapacity, setReceiptOfficerCapacity] = useState(cs.receiptOfficerCapacity || "");
  const [receiptOfficerGrade, setReceiptOfficerGrade] = useState(cs.receiptOfficerGrade || "");

  // Section V: Referral & Service
  const [conveningAuthority, setConveningAuthority] = useState(cs.conveningAuthority || "");
  const [referralPlace, setReferralPlace] = useState(cs.referralPlace || "");
  const [referralDate, setReferralDate] = useState(cs.referralDate || "");
  const [courtMartialType, setCourtMartialType] = useState(cs.courtMartialType || "");
  const [referralConvenedBy, setReferralConvenedBy] = useState(cs.referralConvenedBy || "");
  const [referralInstructions, setReferralInstructions] = useState(cs.referralInstructions || "");
  const [referralCommandOrOrder, setReferralCommandOrOrder] = useState(cs.referralCommandOrOrder || "");
  const [referralOfficerName, setReferralOfficerName] = useState(cs.referralOfficerName || "");
  const [referralOfficerCapacity, setReferralOfficerCapacity] = useState(cs.referralOfficerCapacity || "");
  const [referralOfficerGrade, setReferralOfficerGrade] = useState(cs.referralOfficerGrade || "");

  // Item 15: Service of Charges
  const [serviceDate, setServiceDate] = useState(cs.serviceDate || "");
  const [trialCounselName, setTrialCounselName] = useState(cs.trialCounselName || "");
  const [trialCounselGrade, setTrialCounselGrade] = useState(cs.trialCounselGrade || "");

  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personalData: true,
    charges: true,
    preferral: false,
    notification: false,
    receipt: false,
    referral: false,
    service: false,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function updateCharge(idx: number, field: "article" | "specification", value: string) {
    const updated = [...charges];
    updated[idx] = { ...updated[idx], [field]: value };
    setCharges(updated);
  }

  async function saveAll() {
    setSaving(true);
    try {
      await updateChargeSheet(caseId, {
        // Section I
        accusedName, ssn, gradeOrRank, payGrade, unitOrOrg,
        serviceInitialDate, serviceTerm,
        payBasic, paySeaForeign, payTotal,
        natureOfRestraint, datesImposed,
        // Section II
        charges,
        // Section III
        accuserName, accuserGrade, accuserOrg, accuserSignedDate,
        oathOfficerName, oathOfficerOrg, oathOfficerGrade, oathOfficerCapacity,
        // Item 12
        notificationDate, notificationCmdrName, notificationCmdrOrg, notificationCmdrGrade,
        // Item 13
        receiptDate, receiptTime, receiptLocation, receiptDesignation,
        receiptOfficerName, receiptOfficerCapacity, receiptOfficerGrade,
        // Section V
        conveningAuthority, referralPlace, referralDate, courtMartialType,
        referralConvenedBy, referralInstructions, referralCommandOrOrder,
        referralOfficerName, referralOfficerCapacity, referralOfficerGrade,
        // Item 15
        serviceDate, trialCounselName, trialCounselGrade,
        _section: "all",
      });
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  if (showPrint) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4 print:hidden">
          <button onClick={() => setShowPrint(false)} className="btn-ghost text-xs">
            Back to Editor
          </button>
          <button onClick={() => window.print()} className="btn-primary text-xs gap-1">
            <Printer size={14} /> Print
          </button>
        </div>
        <ChargeSheetPrint
          data={{
            accusedName, ssn, gradeOrRank, payGrade, unitOrOrg,
            serviceInitialDate, serviceTerm,
            payBasic, paySeaForeign, payTotal,
            natureOfRestraint, datesImposed,
            charges,
            accuserName, accuserGrade, accuserOrg, accuserSignedDate,
            oathOfficerName, oathOfficerOrg, oathOfficerGrade, oathOfficerCapacity,
            notificationDate, notificationCmdrName, notificationCmdrOrg, notificationCmdrGrade,
            receiptDate, receiptTime, receiptLocation, receiptDesignation,
            receiptOfficerName, receiptOfficerCapacity, receiptOfficerGrade,
            conveningAuthority, referralPlace, referralDate, courtMartialType,
            referralConvenedBy, referralInstructions, referralCommandOrOrder,
            referralOfficerName, referralOfficerCapacity, referralOfficerGrade,
            serviceDate, trialCounselName, trialCounselGrade,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!isCourtMartial && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <span>This case has not been referred to court-martial. The charge sheet can still be prepared in advance.</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setShowPrint(true)} className="btn-ghost text-xs gap-1">
          <Printer size={14} /> Preview / Print
        </button>
        {!locked && (
          <button onClick={saveAll} disabled={saving} className="btn-primary text-xs gap-1">
            <Save size={14} /> {saving ? "Saving..." : "Save Charge Sheet"}
          </button>
        )}
      </div>

      {/* Section I: Personal Data */}
      <CollapsibleSection
        title="I. Personal Data"
        sectionKey="personalData"
        open={openSections.personalData}
        onToggle={() => toggleSection("personalData")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>1. Name of Accused (Last, First, Middle Initial)</Label>
            <input className="input-field" value={accusedName} onChange={(e) => setAccusedName(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>2. SSN (last 4 only)</Label>
            <input className="input-field font-mono" value={ssn} onChange={(e) => setSsn(e.target.value)} maxLength={4} placeholder="XXXX" disabled={locked} />
          </div>
          <div>
            <Label>3. Grade or Rank</Label>
            <input className="input-field" value={gradeOrRank} onChange={(e) => setGradeOrRank(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>4. Pay Grade</Label>
            <input className="input-field" value={payGrade} onChange={(e) => setPayGrade(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>5. Unit or Organization</Label>
            <input className="input-field" value={unitOrOrg} onChange={(e) => setUnitOrOrg(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>6a. Initial Date of Current Service</Label>
            <input type="date" className="input-field" value={serviceInitialDate} onChange={(e) => setServiceInitialDate(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>6b. Term</Label>
            <input className="input-field" value={serviceTerm} onChange={(e) => setServiceTerm(e.target.value)} placeholder="e.g., 4 years" disabled={locked} />
          </div>
          <div>
            <Label>7a. Pay - Basic</Label>
            <input className="input-field font-mono" value={payBasic} onChange={(e) => setPayBasic(e.target.value)} placeholder="$0.00" disabled={locked} />
          </div>
          <div>
            <Label>7b. Pay - Sea/Foreign Duty</Label>
            <input className="input-field font-mono" value={paySeaForeign} onChange={(e) => setPaySeaForeign(e.target.value)} placeholder="$0.00" disabled={locked} />
          </div>
          <div>
            <Label>7c. Pay - Total</Label>
            <input className="input-field font-mono" value={payTotal} onChange={(e) => setPayTotal(e.target.value)} placeholder="$0.00" disabled={locked} />
          </div>
          <div>
            <Label>8. Nature of Restraint of Accused</Label>
            <select className="input-field" value={natureOfRestraint} onChange={(e) => setNatureOfRestraint(e.target.value)} disabled={locked}>
              <option value="None">None</option>
              <option value="Restriction">Restriction in lieu of arrest</option>
              <option value="Arrest">Arrest</option>
              <option value="Confinement">Confinement</option>
              <option value="Conditions on Liberty">Conditions on Liberty</option>
            </select>
          </div>
          <div>
            <Label>9. Date(s) Imposed</Label>
            <input className="input-field" value={datesImposed} onChange={(e) => setDatesImposed(e.target.value)} placeholder="YYYYMMDD" disabled={locked} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Section II: Charges and Specifications */}
      <CollapsibleSection
        title="II. Charges and Specifications"
        sectionKey="charges"
        open={openSections.charges}
        onToggle={() => toggleSection("charges")}
      >
        {charges.map((c, i) => (
          <div key={i} className="border border-border rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Charge {charges.length > 1 ? String.fromCharCode(73 + i) : ""}</h4>
              {charges.length > 1 && !locked && (
                <button
                  type="button"
                  onClick={() => setCharges(charges.filter((_, ci) => ci !== i))}
                  className="text-error text-xs hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <Label>10. Charge: Violation of the UCMJ, Article</Label>
                <input className="input-field" value={c.article} onChange={(e) => updateCharge(i, "article", e.target.value)} placeholder="e.g., 86" disabled={locked} />
              </div>
              <div>
                <Label>Specification</Label>
                <textarea
                  className="input-field min-h-[120px]"
                  value={c.specification}
                  onChange={(e) => updateCharge(i, "specification", e.target.value)}
                  placeholder="In that [rank] [name], [unit], did, [on/between dates], at [place], [description of offense]..."
                  disabled={locked}
                />
              </div>
            </div>
          </div>
        ))}
        {!locked && (
          <button
            type="button"
            onClick={() => setCharges([...charges, { article: "", specification: "" }])}
            className="btn-ghost text-xs"
          >
            + Add Additional Charge
          </button>
        )}
      </CollapsibleSection>

      {/* Section III: Preferral */}
      <CollapsibleSection
        title="III. Preferral"
        sectionKey="preferral"
        open={openSections.preferral}
        onToggle={() => toggleSection("preferral")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label>11a. Name of Accuser (Last, First, MI)</Label>
            <input className="input-field" value={accuserName} onChange={(e) => setAccuserName(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>11b. Grade</Label>
            <input className="input-field" value={accuserGrade} onChange={(e) => setAccuserGrade(e.target.value)} disabled={locked} />
          </div>
          <div className="sm:col-span-2">
            <Label>11c. Organization of Accuser</Label>
            <input className="input-field" value={accuserOrg} onChange={(e) => setAccuserOrg(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>11e. Date (YYYYMMDD)</Label>
            <input className="input-field font-mono" value={accuserSignedDate} onChange={(e) => setAccuserSignedDate(e.target.value)} placeholder="YYYYMMDD" disabled={locked} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-neutral-mid mb-3 italic">
            Affidavit: Officer administering oath (R.C.M. 307(b) — must be commissioned officer)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Typed Name of Officer</Label>
              <input className="input-field" value={oathOfficerName} onChange={(e) => setOathOfficerName(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Organization of Officer</Label>
              <input className="input-field" value={oathOfficerOrg} onChange={(e) => setOathOfficerOrg(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Grade</Label>
              <input className="input-field" value={oathOfficerGrade} onChange={(e) => setOathOfficerGrade(e.target.value)} disabled={locked} />
            </div>
            <div>
              <Label>Official Capacity</Label>
              <input className="input-field" value={oathOfficerCapacity} onChange={(e) => setOathOfficerCapacity(e.target.value)} placeholder="e.g., Commissioned Officer" disabled={locked} />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Item 12: Notification */}
      <CollapsibleSection
        title="12. Notification to Accused"
        sectionKey="notification"
        open={openSections.notification}
        onToggle={() => toggleSection("notification")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Date of Notification</Label>
            <input type="date" className="input-field" value={notificationDate} onChange={(e) => setNotificationDate(e.target.value)} disabled={locked} />
          </div>
          <div />
          <div>
            <Label>Typed Name of Immediate Commander</Label>
            <input className="input-field" value={notificationCmdrName} onChange={(e) => setNotificationCmdrName(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Organization of Immediate Commander</Label>
            <input className="input-field" value={notificationCmdrOrg} onChange={(e) => setNotificationCmdrOrg(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Grade</Label>
            <input className="input-field" value={notificationCmdrGrade} onChange={(e) => setNotificationCmdrGrade(e.target.value)} disabled={locked} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Item 13: Receipt */}
      <CollapsibleSection
        title="IV. Receipt by Summary Court-Martial Convening Authority"
        sectionKey="receipt"
        open={openSections.receipt}
        onToggle={() => toggleSection("receipt")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Date Received</Label>
            <input type="date" className="input-field" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Time (hours)</Label>
            <input type="time" className="input-field" value={receiptTime} onChange={(e) => setReceiptTime(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Location</Label>
            <input className="input-field" value={receiptLocation} onChange={(e) => setReceiptLocation(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Designation of Command/Officer (R.C.M. 403)</Label>
            <input className="input-field" value={receiptDesignation} onChange={(e) => setReceiptDesignation(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Typed Name of Officer</Label>
            <input className="input-field" value={receiptOfficerName} onChange={(e) => setReceiptOfficerName(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Official Capacity of Officer Signing</Label>
            <input className="input-field" value={receiptOfficerCapacity} onChange={(e) => setReceiptOfficerCapacity(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Grade</Label>
            <input className="input-field" value={receiptOfficerGrade} onChange={(e) => setReceiptOfficerGrade(e.target.value)} disabled={locked} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Section V: Referral */}
      <CollapsibleSection
        title="V. Referral; Service of Charges"
        sectionKey="referral"
        open={openSections.referral}
        onToggle={() => toggleSection("referral")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label>14a. Designation of Command of Convening Authority</Label>
            <input className="input-field" value={conveningAuthority} onChange={(e) => setConveningAuthority(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>14b. Place</Label>
            <input className="input-field" value={referralPlace} onChange={(e) => setReferralPlace(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>14c. Date (YYYYMMDD)</Label>
            <input className="input-field font-mono" value={referralDate} onChange={(e) => setReferralDate(e.target.value)} placeholder="YYYYMMDD" disabled={locked} />
          </div>
          <div>
            <Label>Court-Martial Type</Label>
            <select className="input-field" value={courtMartialType} onChange={(e) => setCourtMartialType(e.target.value)} disabled={locked}>
              <option value="">Select type</option>
              <option value="SCM">Summary Court-Martial</option>
              <option value="SPCM">Special Court-Martial</option>
              <option value="GCM">General Court-Martial</option>
            </select>
          </div>
          <div>
            <Label>Convened by</Label>
            <input className="input-field" value={referralConvenedBy} onChange={(e) => setReferralConvenedBy(e.target.value)} disabled={locked} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Instructions (R.C.M. 601(e))</Label>
          <textarea className="input-field min-h-[60px]" value={referralInstructions} onChange={(e) => setReferralInstructions(e.target.value)} disabled={locked} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <Label>By Command or Order</Label>
            <input className="input-field" value={referralCommandOrOrder} onChange={(e) => setReferralCommandOrOrder(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Typed Name of Officer</Label>
            <input className="input-field" value={referralOfficerName} onChange={(e) => setReferralOfficerName(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Official Capacity of Officer Signing</Label>
            <input className="input-field" value={referralOfficerCapacity} onChange={(e) => setReferralOfficerCapacity(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Grade</Label>
            <input className="input-field" value={referralOfficerGrade} onChange={(e) => setReferralOfficerGrade(e.target.value)} disabled={locked} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Item 15: Service */}
      <CollapsibleSection
        title="15. Service of Charges"
        sectionKey="service"
        open={openSections.service}
        onToggle={() => toggleSection("service")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Date of Service</Label>
            <input type="date" className="input-field" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} disabled={locked} />
          </div>
          <div />
          <div>
            <Label>Typed Name of Trial Counsel</Label>
            <input className="input-field" value={trialCounselName} onChange={(e) => setTrialCounselName(e.target.value)} disabled={locked} />
          </div>
          <div>
            <Label>Grade or Rank of Trial Counsel</Label>
            <input className="input-field" value={trialCounselGrade} onChange={(e) => setTrialCounselGrade(e.target.value)} disabled={locked} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Bottom action buttons */}
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={() => setShowPrint(true)} className="btn-ghost text-xs gap-1">
          <Printer size={14} /> Preview / Print
        </button>
        {!locked && (
          <button onClick={saveAll} disabled={saving} className="btn-primary text-xs gap-1">
            <Save size={14} /> {saving ? "Saving..." : "Save Charge Sheet"}
          </button>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title, sectionKey, open, onToggle, children,
}: {
  title: string; sectionKey: string; open: boolean; onToggle: () => void; children: React.ReactNode;
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
