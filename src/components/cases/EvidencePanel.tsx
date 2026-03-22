"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { addEvidence, updateEvidence, deleteEvidence } from "@/services/api";

interface EvidenceItem {
  id: string;
  evidenceType: string;
  description: string;
  dateReceived: string;
  source: string;
  preInitiation?: boolean;
  addedByName?: string;
  createdAt: string;
}

const EVIDENCE_TYPES = [
  { value: "WITNESS_STATEMENT", label: "Witness Statement" },
  { value: "PHYSICAL_EVIDENCE", label: "Physical Evidence" },
  { value: "DOCUMENTARY", label: "Documentary Evidence" },
  { value: "DIGITAL_EVIDENCE", label: "Digital Evidence" },
  { value: "PHOTOGRAPHS", label: "Photographs/Video" },
  { value: "MEDICAL_RECORDS", label: "Medical Records" },
  { value: "SERVICE_RECORDS", label: "Service Records" },
  { value: "LAW_ENFORCEMENT", label: "Law Enforcement Report" },
  { value: "OTHER", label: "Other" },
];

function typeLabel(value: string) {
  return EVIDENCE_TYPES.find((t) => t.value === value)?.label || value || "Unknown";
}

export default function EvidencePanel({
  caseId,
  evidence,
  onUpdate,
  locked,
  currentPhase,
}: {
  caseId: string;
  evidence: EvidenceItem[];
  onUpdate: () => void;
  locked?: boolean;
  currentPhase?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Add form state
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [source, setSource] = useState("");

  // Edit form state
  const [editType, setEditType] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDateReceived, setEditDateReceived] = useState("");
  const [editSource, setEditSource] = useState("");

  // Evidence can be added through hearing phase
  const canModify = !locked && (!currentPhase || ["INITIATION", "RIGHTS_ADVISEMENT", "HEARING"].includes(currentPhase));

  async function handleAdd() {
    if (!type && !description) return;
    setLoading(true);
    try {
      await addEvidence(caseId, { evidenceType: type, description, dateReceived, source });
      setType(""); setDescription(""); setDateReceived(""); setSource("");
      setShowAdd(false);
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: EvidenceItem) {
    setEditingId(item.id);
    setEditType(item.evidenceType || "");
    setEditDescription(item.description || "");
    setEditDateReceived(item.dateReceived || "");
    setEditSource(item.source || "");
  }

  async function handleUpdate() {
    if (!editingId) return;
    setLoading(true);
    try {
      await updateEvidence(caseId, editingId, {
        evidenceType: editType,
        description: editDescription,
        dateReceived: editDateReceived,
        source: editSource,
      });
      setEditingId(null);
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(evidenceId: string) {
    setLoading(true);
    try {
      await deleteEvidence(caseId, evidenceId);
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  const preInit = evidence.filter((e) => e.preInitiation);
  const postInit = evidence.filter((e) => !e.preInitiation);

  return (
    <div className="space-y-4">
      {/* Pre-initiation evidence */}
      {preInit.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-neutral-mid uppercase tracking-wide mb-2">
            Pre-Initiation Evidence
          </h4>
          <div className="space-y-2">
            {preInit.map((item) => (
              <EvidenceRow
                key={item.id}
                item={item}
                editing={editingId === item.id}
                canModify={canModify}
                loading={loading}
                editType={editType} editDescription={editDescription}
                editDateReceived={editDateReceived} editSource={editSource}
                setEditType={setEditType} setEditDescription={setEditDescription}
                setEditDateReceived={setEditDateReceived} setEditSource={setEditSource}
                onEdit={() => startEdit(item)}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Post-initiation evidence */}
      {postInit.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-neutral-mid uppercase tracking-wide mb-2">
            {preInit.length > 0 ? "Additional Evidence" : "Evidence Log"}
          </h4>
          <div className="space-y-2">
            {postInit.map((item) => (
              <EvidenceRow
                key={item.id}
                item={item}
                editing={editingId === item.id}
                canModify={canModify}
                loading={loading}
                editType={editType} editDescription={editDescription}
                editDateReceived={editDateReceived} editSource={editSource}
                setEditType={setEditType} setEditDescription={setEditDescription}
                setEditDateReceived={setEditDateReceived} setEditSource={setEditSource}
                onEdit={() => startEdit(item)}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {evidence.length === 0 && (
        <p className="text-sm text-neutral-mid py-4 text-center">No evidence items recorded.</p>
      )}

      {/* Add evidence */}
      {canModify && (
        <>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="btn-ghost text-xs gap-1">
              <Plus size={14} /> Add Evidence
            </button>
          ) : (
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
                    <option value="">Select type</option>
                    {EVIDENCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Date Received</label>
                  <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Source</label>
                <input value={source} onChange={(e) => setSource(e.target.value)} className="input-field" placeholder="e.g., SSgt Smith, PMO, medical" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" placeholder="Brief description of evidence" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">Cancel</button>
                <button onClick={handleAdd} disabled={loading || (!type && !description)} className="btn-primary text-xs">Add</button>
              </div>
            </div>
          )}
        </>
      )}

      {!canModify && (
        <p className="text-xs text-neutral-mid italic">
          Evidence log is locked after the hearing phase.
        </p>
      )}
    </div>
  );
}

function EvidenceRow({
  item, editing, canModify, loading,
  editType, editDescription, editDateReceived, editSource,
  setEditType, setEditDescription, setEditDateReceived, setEditSource,
  onEdit, onSave, onCancel, onDelete,
}: {
  item: EvidenceItem;
  editing: boolean;
  canModify: boolean;
  loading: boolean;
  editType: string; editDescription: string; editDateReceived: string; editSource: string;
  setEditType: (v: string) => void; setEditDescription: (v: string) => void;
  setEditDateReceived: (v: string) => void; setEditSource: (v: string) => void;
  onEdit: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void;
}) {
  if (editing) {
    return (
      <div className="rounded-md border border-primary bg-blue-50 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select value={editType} onChange={(e) => setEditType(e.target.value)} className="input-field text-xs">
            <option value="">Select type</option>
            {EVIDENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input type="date" value={editDateReceived} onChange={(e) => setEditDateReceived(e.target.value)} className="input-field text-xs" />
        </div>
        <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="input-field text-xs" placeholder="Source" />
        <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input-field text-xs" placeholder="Description" />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost text-xs gap-1"><X size={12} /> Cancel</button>
          <button onClick={onSave} disabled={loading} className="btn-primary text-xs gap-1"><Check size={12} /> Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2 px-3 border border-border rounded-md">
      <FileText size={14} className="text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", item.preInitiation ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700")}>
            {typeLabel(item.evidenceType)}
          </span>
          {item.dateReceived && (
            <span className="text-xs text-neutral-mid">{item.dateReceived}</span>
          )}
        </div>
        <p className="text-sm mt-1">{item.description || "No description"}</p>
        {item.source && (
          <p className="text-xs text-neutral-mid mt-0.5">Source: {item.source}</p>
        )}
        {item.addedByName && (
          <p className="text-xs text-neutral-mid">Added by {item.addedByName}</p>
        )}
      </div>
      {canModify && (
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="text-neutral-mid hover:text-primary p-1" title="Edit">
            <Edit3 size={12} />
          </button>
          <button onClick={onDelete} className="text-neutral-mid hover:text-error p-1" title="Remove">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
