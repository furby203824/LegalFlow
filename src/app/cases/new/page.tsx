"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import {
  RANKS,
  GRADES,
  UCMJ_ARTICLES,
  RANK_TO_GRADE,
} from "@/types";
import type { Rank, Grade } from "@/types";

const VICTIM_STATUSES = [
  "Military", "Military (spouse)", "Civilian (spouse)",
  "Civilian (dependent)", "Civilian (DON employee)",
  "Civilian (other)", "Other", "Unknown",
];
const VICTIM_SEXES = ["Male", "Female", "Unknown"];
const VICTIM_RACES = [
  "American Indian or Alaskan Native", "Asian",
  "Black or African American", "Native Hawaiian or Other Pacific Islander",
  "White", "Other", "Unknown",
];
const VICTIM_ETHNICITIES = [
  "Hispanic or Latino", "Not Hispanic or Latino", "Unknown",
];

interface OffenseInput {
  ucmjArticle: string;
  offenseType: string;
  summary: string;
  offenseDate: string;
  offensePlace: string;
  victims: {
    status: string;
    sex: string;
    race: string;
    ethnicity: string;
  }[];
}

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Accused info
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [rank, setRank] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [edipi, setEdipi] = useState("");
  const [unit, setUnit] = useState("");
  const [unitGcmca, setUnitGcmca] = useState("");

  // Commander info
  const [commanderGrade, setCommanderGrade] = useState<string>("");
  const [component, setComponent] = useState<string>("ACTIVE");
  const [vesselException, setVesselException] = useState(false);
  const [jurisdictionConfirmed, setJurisdictionConfirmed] = useState(false);

  // Offenses
  const [offenses, setOffenses] = useState<OffenseInput[]>([
    {
      ucmjArticle: "",
      offenseType: "",
      summary: "",
      offenseDate: "",
      offensePlace: "",
      victims: [{ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }],
    },
  ]);

  function handleRankChange(newRank: string) {
    setRank(newRank);
    if (newRank in RANK_TO_GRADE) {
      setGrade(RANK_TO_GRADE[newRank as Rank]);
    }
  }

  function addOffense() {
    if (offenses.length >= 5) return;
    setOffenses([
      ...offenses,
      {
        ucmjArticle: "",
        offenseType: "",
        summary: "",
        offenseDate: "",
        offensePlace: "",
        victims: [{ status: "Unknown", sex: "Unknown", race: "Unknown", ethnicity: "Unknown" }],
      },
    ]);
  }

  function removeOffense(idx: number) {
    if (offenses.length <= 1) return;
    setOffenses(offenses.filter((_, i) => i !== idx));
  }

  function updateOffense(idx: number, field: keyof OffenseInput, value: string) {
    const updated = [...offenses];
    if (field !== "victims") {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setOffenses(updated);
  }

  function updateVictim(
    offenseIdx: number,
    victimIdx: number,
    field: string,
    value: string
  ) {
    const updated = [...offenses];
    (updated[offenseIdx].victims[victimIdx] as Record<string, unknown>)[field] = value;
    setOffenses(updated);
  }

  function addVictim(offenseIdx: number) {
    if (offenses[offenseIdx].victims.length >= 5) return;
    const updated = [...offenses];
    updated[offenseIdx].victims.push({
      status: "Unknown",
      sex: "Unknown",
      race: "Unknown",
      ethnicity: "Unknown",
    });
    setOffenses(updated);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setWarnings([]);
    setLoading(true);

    const letters = ["A", "B", "C", "D", "E"];
    const payload = {
      accusedLastName: lastName,
      accusedFirstName: firstName,
      accusedMiddleName: middleName,
      accusedRank: rank,
      accusedGrade: grade,
      accusedEdipi: edipi,
      accusedUnitFullString: `${unit}, ${unitGcmca}`,
      commanderGrade,
      component: component || "ACTIVE",
      vesselException,
      jurisdictionConfirmed,
      offenses: offenses.map((o, i) => ({
        ...o,
        letter: letters[i],
      })),
    };

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors([data.error || "Failed to create case"]);
        setLoading(false);
        return;
      }

      if (data.warnings?.length) {
        setWarnings(data.warnings);
      }

      // Redirect to case view
      router.push(`/cases/${data.case.id}`);
    } catch {
      setErrors(["Network error. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  const selectClass =
    "w-full px-3 py-2 border border-[var(--color-border)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]";
  const inputClass = selectClass;
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">
          Initiate NJP Case
        </h1>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            {errors.map((e, i) => (
              <div key={i} className="text-red-800 text-sm">{e}</div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            {warnings.map((w, i) => (
              <div key={i} className="text-yellow-800 text-sm">{w}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Accused Information */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-4">
              Accused Information (Items 17-20)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Last Name *</label>
                <input
                  className={inputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>First Name *</label>
                <input
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Middle Name</label>
                <input
                  className={inputClass}
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Rank *</label>
                <select
                  className={selectClass}
                  value={rank}
                  onChange={(e) => handleRankChange(e.target.value)}
                  required
                >
                  <option value="">Select rank</option>
                  {RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Grade *</label>
                <select
                  className={selectClass}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                >
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>EDIPI (10 digits) *</label>
                <input
                  className={inputClass}
                  value={edipi}
                  onChange={(e) => setEdipi(e.target.value)}
                  pattern="\d{10}"
                  maxLength={10}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Unit (company-sized) *</label>
                <input
                  className={inputClass}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>GCMCA Command *</label>
                <input
                  className={inputClass}
                  value={unitGcmca}
                  onChange={(e) => setUnitGcmca(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Commander and Case Info */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-4">
              Commander & Case Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Commander Grade *</label>
                <select
                  className={selectClass}
                  value={commanderGrade}
                  onChange={(e) => setCommanderGrade(e.target.value)}
                  required
                >
                  <option value="">Select grade</option>
                  {GRADES.filter((g) => g.startsWith("O")).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Component *</label>
                <select
                  className={selectClass}
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  required
                >
                  <option value="ACTIVE">Active Duty</option>
                  <option value="SMCR">SMCR</option>
                </select>
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={vesselException}
                    onChange={(e) => setVesselException(e.target.checked)}
                    className="rounded border-[var(--color-border)]"
                  />
                  Vessel Exception
                </label>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={jurisdictionConfirmed}
                  onChange={(e) => setJurisdictionConfirmed(e.target.checked)}
                  required
                  className="mt-1 rounded border-[var(--color-border)]"
                />
                <span>
                  I confirm that the accused is assigned or attached to this
                  command and that this command has jurisdiction to impose
                  Non-Judicial Punishment. *
                </span>
              </label>
            </div>
          </section>

          {/* Offenses */}
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">
                Offenses (Item 1)
              </h2>
              {offenses.length < 5 && (
                <button
                  type="button"
                  onClick={addOffense}
                  className="text-sm bg-[var(--color-navy)] text-white px-3 py-1 rounded hover:bg-[var(--color-navy-light)]"
                >
                  + Add Offense
                </button>
              )}
            </div>

            {offenses.map((offense, oi) => (
              <div
                key={oi}
                className="border border-[var(--color-border)] rounded-lg p-4 mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">
                    Offense {String.fromCharCode(65 + oi)}
                  </h3>
                  {offenses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOffense(oi)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>UCMJ Article *</label>
                    <select
                      className={selectClass}
                      value={offense.ucmjArticle}
                      onChange={(e) =>
                        updateOffense(oi, "ucmjArticle", e.target.value)
                      }
                      required
                    >
                      <option value="">Select article</option>
                      {UCMJ_ARTICLES.map((a) => (
                        <option key={a} value={a}>
                          Article {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Offense Type *</label>
                    <input
                      className={inputClass}
                      value={offense.offenseType}
                      onChange={(e) =>
                        updateOffense(oi, "offenseType", e.target.value)
                      }
                      placeholder="e.g., Unauthorized Absence"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Offense *</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={offense.offenseDate}
                      onChange={(e) =>
                        updateOffense(oi, "offenseDate", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Place of Offense *</label>
                    <input
                      className={inputClass}
                      value={offense.offensePlace}
                      onChange={(e) =>
                        updateOffense(oi, "offensePlace", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Offense Summary * (No victim PII)
                    </label>
                    <textarea
                      className={inputClass + " h-20"}
                      value={offense.summary}
                      onChange={(e) =>
                        updateOffense(oi, "summary", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                {/* Victims */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">
                      Victim Demographics (Item 22)
                    </h4>
                    {offense.victims.length < 5 && (
                      <button
                        type="button"
                        onClick={() => addVictim(oi)}
                        className="text-xs text-[var(--color-navy)] hover:underline"
                      >
                        + Add Victim
                      </button>
                    )}
                  </div>
                  {offense.victims.map((v, vi) => (
                    <div
                      key={vi}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2"
                    >
                      <select
                        className={selectClass}
                        value={v.status}
                        onChange={(e) =>
                          updateVictim(oi, vi, "status", e.target.value)
                        }
                      >
                        {VICTIM_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        className={selectClass}
                        value={v.sex}
                        onChange={(e) =>
                          updateVictim(oi, vi, "sex", e.target.value)
                        }
                      >
                        {VICTIM_SEXES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        className={selectClass}
                        value={v.race}
                        onChange={(e) =>
                          updateVictim(oi, vi, "race", e.target.value)
                        }
                      >
                        {VICTIM_RACES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <select
                        className={selectClass}
                        value={v.ethnicity}
                        onChange={(e) =>
                          updateVictim(oi, vi, "ethnicity", e.target.value)
                        }
                      >
                        {VICTIM_ETHNICITIES.map((et) => (
                          <option key={et} value={et}>{et}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2 border border-[var(--color-border)] rounded text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[var(--color-navy)] text-white rounded text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Initiate Case"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
