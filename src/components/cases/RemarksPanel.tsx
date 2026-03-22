"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Plus } from "lucide-react";
import { addRemark as addRemarkService, confirmRemark as confirmRemarkService } from "@/services/api";

interface Remark {
  id: string;
  date: string;
  itemReference: string;
  text: string;
  confirmed: boolean;
  systemGenerated?: boolean;
}

const ENTRY_TYPES = [
  "ADDITIONAL_OFFENSE", "FORWARDING_RECOMMENDATION", "SUSPENSION_VACATED",
  "STAY_RESTRICTION", "STAY_EXTRA_DUTIES", "APPEAL_DENIED", "APPEAL_GRANTED",
  "SET_ASIDE", "ADDITIONAL_VICTIM", "OTHER",
];

export default function RemarksPanel({
  caseId,
  remarks,
  onUpdate,
  locked,
}: {
  caseId: string;
  remarks: Remark[];
  onUpdate: () => void;
  locked?: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState("");
  const [entryType, setEntryType] = useState("OTHER");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmed = remarks.filter((r) => r.confirmed);
  const pending = remarks.filter((r) => !r.confirmed);

  async function addRemark() {
    if (!date || !text) return;
    setLoading(true);
    try {
      await addRemarkService(caseId, date, entryType, text);
      setDate(""); setText(""); setShowAdd(false);
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  async function confirmRemark(remarkId: string) {
    await confirmRemarkService(caseId, remarkId);
    onUpdate();
  }

  return (
    <div className="space-y-4">
      {/* Confirmed entries */}
      {confirmed.length > 0 && (
        <div className="space-y-2">
          {confirmed.map((r) => (
            <div key={r.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <Check size={14} className="text-success shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-mono">{r.text}</p>
                <p className="text-xs text-neutral-mid mt-0.5">
                  {r.systemGenerated ? "System generated" : "Manual entry"} &middot; Confirmed
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending confirmation */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-warning uppercase tracking-wide mb-2">
            Pending Confirmation
          </h4>
          {pending.map((r) => (
            <div key={r.id} className="rounded-md bg-amber-50 border border-amber-200 p-3 mb-2">
              <p className="text-sm font-mono">{r.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Clock size={12} /> Awaiting confirmation
                </span>
                <button onClick={() => confirmRemark(r.id)} className="btn-primary text-xs py-1 px-3">
                  Confirm
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {remarks.length === 0 && (
        <p className="text-sm text-neutral-mid py-4 text-center">No Item 21 remarks recorded.</p>
      )}

      {/* Add remark */}
      {!locked && (
        <>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="btn-ghost text-xs gap-1">
              <Plus size={14} /> Add Manual Remark
            </button>
          ) : (
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="input-field">
                    {ENTRY_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Entry Text</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} className="input-field h-16" placeholder="YYYY-MM-DD ITEM X: ..." />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">Cancel</button>
                <button onClick={addRemark} disabled={loading || !date || !text} className="btn-primary text-xs">Add</button>
              </div>
            </div>
          )}
        </>
      )}

      {locked && (
        <p className="text-xs text-neutral-mid italic">
          Form is locked. No new entries can be added to Item 21.
        </p>
      )}
    </div>
  );
}
