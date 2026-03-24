"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import { confirmJepes } from "@/services/api";
import { JEPES_GRADES } from "@/types";
import type { Grade } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

interface Props {
  c: CaseData;
  onUpdate: () => void;
}

/**
 * Evaluate JEPES applicability.
 * Returns "jepes" | "pes" | null.
 */
function jepesApplicability(c: CaseData): "jepes" | "pes" | null {
  const pun = c.punishment || c.punishmentRecord;
  if (!pun?.reductionImposed) return null;

  const hasGuilty = (c.offenses || []).some(
    (o: { finding?: string | null }) => o.finding === "G" || o.finding === "GUILTY"
  );
  if (!hasGuilty) return null;

  const fromGrade = (pun.reductionFromGrade || c.accusedGrade) as Grade;
  if (JEPES_GRADES.includes(fromGrade)) return "jepes";
  if (fromGrade === "E5") return "pes";
  return null;
}

/**
 * Calculate TO DATE = njpDate - 1 calendar day.
 * Per MCO 1616.1 Ch.2 para 2.b.(10): last day at previous rank.
 */
function calcToDate(njpDate: string | undefined): string | null {
  if (!njpDate) return null;
  const d = new Date(njpDate);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export default function JepesRdSection({ c, onUpdate }: Props) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicability = jepesApplicability(c);
  if (!applicability) return null;

  // ── PES Advisory (E5 reduction) ──
  if (applicability === "pes") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} className="text-blue-600 shrink-0" />
          <h3 className="text-sm font-semibold text-blue-900">Performance Evaluation — Reduction</h3>
          <span className="ml-auto text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            PES — NOT JEPES
          </span>
        </div>
        <p className="text-xs text-blue-800">
          This reduction is from Sgt (E5). Sgt and above fall under the Performance Evaluation System (PES),
          not JEPES. Consult the command legal officer and refer to MCO P1610.7 for SNCO evaluation procedures.
        </p>
      </div>
    );
  }

  // ── JEPES RD Occasion ──
  const jepes = c.jepes;
  const pun = c.punishment || c.punishmentRecord;
  const fromGrade = pun?.reductionFromGrade || c.accusedGrade;
  const toGrade = pun?.reductionToGrade;
  const prevRank = jepes?.previousRank || c.accusedRank || fromGrade;
  const newRank = jepes?.newRank || toGrade;
  const toDate = calcToDate(c.njpDate);
  const edipi = c.accused?.edipi || c.accusedEdipi;

  // ── State 3: SUBMITTED IN MOL ──
  if (jepes?.rdOccasionCompleted) {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <h3 className="text-sm font-semibold text-green-900">JEPES RD Occasion</h3>
          <span className="ml-auto text-xs font-medium bg-green-200 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle size={10} /> SUBMITTED IN MOL
          </span>
        </div>
        <div className="text-xs text-green-800 space-y-1">
          <p>Reduction: {prevRank} ({fromGrade}) &rarr; {newRank} ({toGrade})</p>
          <p>Confirmed: {jepes.rdOccasionCompletedDate}</p>
        </div>
      </div>
    );
  }

  // ── State 1: PENDING CASE CLOSURE ──
  if (!c.formLocked) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-yellow-600 shrink-0" />
          <h3 className="text-sm font-semibold text-yellow-900">JEPES RD Occasion</h3>
          <span className="ml-auto text-xs font-medium bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
            PENDING CASE CLOSURE
          </span>
        </div>
        <p className="text-xs text-yellow-800">
          A JEPES RD Occasion must be entered in the JEPES module of MOL after case closure.
          This confirmation will activate after Item 16 is signed.
        </p>
      </div>
    );
  }

  // ── State 2: ACTION REQUIRED ──
  async function handleConfirm() {
    if (!checked) return;
    setLoading(true);
    setError(null);
    try {
      await confirmJepes(c.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-red-300 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-red-600 shrink-0" />
        <h3 className="text-sm font-semibold text-red-900">JEPES RD Occasion — Reduction</h3>
        <span className="ml-auto text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          ACTION REQUIRED
        </span>
      </div>

      {/* Notification content per Section 5 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3 text-xs text-neutral-dark space-y-2">
        <p className="font-semibold">
          JEPES RD (Reduction) Occasion Required
        </p>
        <p>
          Reduction: <span className="font-mono font-medium">{prevRank} ({fromGrade})</span> &rarr;{" "}
          <span className="font-mono font-medium">{newRank} ({toGrade})</span>
        </p>
        <p>
          EDIPI: <span className="font-mono">{edipi}</span>
        </p>
        {toDate && (
          <p>
            <span className="font-semibold">TO DATE</span> (last day at previous rank):{" "}
            <span className="font-mono font-medium">{toDate}</span>
          </p>
        )}
        <p className="text-neutral-mid italic">
          Verify the FROM date in MOL before entering the RD Occasion.
        </p>
        <p>
          Enter in the <span className="font-semibold">JEPES module of MOL</span>.
        </p>
        <p className="text-neutral-mid">
          Ref: MCO 1616.1, Ch. 2, para 2.b.(10)
        </p>
      </div>

      {/* Confirmation workflow per Section 6 */}
      <div className="space-y-2">
        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I confirm the JEPES RD Occasion has been submitted in the JEPES module of MOL.
          </span>
        </label>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!checked || loading}
          className="btn-primary text-xs disabled:opacity-50"
        >
          {loading ? "Confirming…" : "Confirm JEPES Submitted in MOL"}
        </button>
      </div>
    </div>
  );
}
