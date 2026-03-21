"use client";

import { useState } from "react";

interface Remark {
  id: string;
  date: string;
  itemReference: string;
  text: string;
  confirmed: boolean;
}

export default function RemarksPanel({
  caseId,
  remarks,
  onUpdate,
}: {
  caseId: string;
  remarks: Remark[];
  onUpdate: () => void;
}) {
  const [date, setDate] = useState("");
  const [itemRef, setItemRef] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function addRemark() {
    if (!date || !itemRef || !text) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, itemReference: itemRef, text }),
      });
      if (res.ok) {
        setDate("");
        setItemRef("");
        setText("");
        onUpdate();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function confirmRemark(remarkId: string) {
    await fetch(`/api/cases/${caseId}/remarks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remarkId }),
    });
    onUpdate();
  }

  return (
    <div className="space-y-4">
      {/* Existing Remarks */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Item 21 Remarks
        </h3>
        {remarks.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No remarks recorded.</p>
        ) : (
          <div className="space-y-2">
            {remarks.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded border text-sm font-mono ${
                  r.confirmed
                    ? "bg-green-50 border-green-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <div>{r.text}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {r.confirmed ? "Confirmed" : "Pending confirmation"}
                  </span>
                  {!r.confirmed && (
                    <button
                      onClick={() => confirmRemark(r.id)}
                      className="text-xs text-[var(--color-navy)] hover:underline"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Remark */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-3">
          Add Remark
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Item Reference
            </label>
            <input
              type="text"
              value={itemRef}
              onChange={(e) => setItemRef(e.target.value)}
              placeholder="e.g., ITEM 1, ITEM 14"
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Remark Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="input-field h-20"
              placeholder="YYYY-MM-DD ITEM X: ..."
            />
          </div>
        </div>
        <button
          onClick={addRemark}
          disabled={loading || !date || !itemRef || !text}
          className="btn-primary"
        >
          Add Remark
        </button>
      </div>
    </div>
  );
}
