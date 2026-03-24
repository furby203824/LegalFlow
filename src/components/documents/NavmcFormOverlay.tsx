"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = any;

/* ── PDF field definitions extracted from NAVMC_10132.pdf ──
   Coordinates are in PDF units (72 dpi, origin bottom-left).
   We convert to top-left CSS % at render time. */

interface FieldDef {
  name: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "text" | "select" | "checkbox" | "signature" | "date";
  label?: string;
  readOnly?: boolean;
  options?: string[];
}

const PAGE_W = 612;
const PAGE_H = 792;

// All form fields with their PDF coordinates
const FIELD_DEFS: FieldDef[] = [
  // ── Page 1: Items 17-20 (Accused Info — bottom of page) ──
  { name: "17 UNIT", page: 0, x: 34.09, y: 94.2, w: 538.18, h: 14.4, type: "text", label: "Unit", readOnly: true },
  { name: "18 ACCUSED FULL NAME", page: 0, x: 34.08, y: 67.2, w: 358.56, h: 14.4, type: "text", label: "Accused Name", readOnly: true },
  { name: "19 ACCUSED RANK/GRADE", page: 0, x: 394.11, y: 67.2, w: 88.3, h: 14.4, type: "text", label: "Rank/Grade", readOnly: true },
  { name: "20 ACCUSED EDIPI", page: 0, x: 483.85, y: 67.2, w: 88.44, h: 14.4, type: "text", label: "EDIPI", readOnly: true },

  // ── Page 1: Item 1 — Offenses ──
  { name: "1A ARTICLE", page: 0, x: 50.63, y: 641.27, w: 212.4, h: 10.81, type: "text", label: "Article A", readOnly: true },
  { name: "1A SUMMARY", page: 0, x: 266.17, y: 641.27, w: 302.4, h: 10.81, type: "text", label: "Summary A", readOnly: true },
  { name: "1B ARTICLE", page: 0, x: 50.31, y: 628.93, w: 212.4, h: 10.81, type: "text", label: "Article B", readOnly: true },
  { name: "1B SUMMARY", page: 0, x: 265.84, y: 628.92, w: 302.4, h: 10.81, type: "text", label: "Summary B", readOnly: true },
  { name: "1C ARTICLE", page: 0, x: 50.31, y: 617.23, w: 212.4, h: 10.81, type: "text", label: "Article C", readOnly: true },
  { name: "1C SUMMARY", page: 0, x: 266.17, y: 617.23, w: 302.4, h: 10.81, type: "text", label: "Summary C", readOnly: true },
  { name: "1D ARTICLE", page: 0, x: 50.31, y: 605.21, w: 212.4, h: 10.81, type: "text", label: "Article D", readOnly: true },
  { name: "1D SUMMARY", page: 0, x: 266.17, y: 605.21, w: 302.4, h: 10.81, type: "text", label: "Summary D", readOnly: true },
  { name: "1E ARTICLE", page: 0, x: 50.31, y: 593.18, w: 212.4, h: 10.81, type: "text", label: "Article E", readOnly: true },
  { name: "1E SUMMARY", page: 0, x: 266.17, y: 593.18, w: 302.4, h: 10.81, type: "text", label: "Summary E", readOnly: true },

  // ── Item 1 Findings ──
  { name: "1A FINDING", page: 0, x: 245.21, y: 380.76, w: 23.76, h: 10.81, type: "text", label: "Finding A", readOnly: true },
  { name: "1B FINDING", page: 0, x: 296.86, y: 380.76, w: 23.76, h: 10.81, type: "text", label: "Finding B", readOnly: true },
  { name: "1C FINDING", page: 0, x: 349.15, y: 380.76, w: 23.76, h: 10.81, type: "text", label: "Finding C", readOnly: true },
  { name: "1D FINDING", page: 0, x: 401.79, y: 380.76, w: 23.76, h: 10.81, type: "text", label: "Finding D", readOnly: true },
  { name: "1E FINDING", page: 0, x: 454.22, y: 380.76, w: 23.76, h: 10.81, type: "text", label: "Finding E", readOnly: true },

  // ── Item 2: Rights Advisement & Election ──
  { name: "2 DEMAND", page: 0, x: 229.45, y: 569.72, w: 337.86, h: 10.57, type: "text", label: "Election", readOnly: true },
  { name: "2 COUNSELOPP", page: 0, x: 110, y: 553.85, w: 48.86, h: 10.57, type: "text", label: "Counsel", readOnly: true },
  { name: "2 BOOKER", page: 0, x: 35.85, y: 518.1, w: 527.83, h: 10.58, type: "text", label: "Booker Statement", readOnly: true },
  { name: "2 ACC ELECTION AND RIGHTS DATE_af_date", page: 0, x: 34.85, y: 486.53, w: 94.56, h: 13.44, type: "date", label: "Item 2 Date", readOnly: true },

  // ── Item 3: CO Certification ──
  { name: "3 RIGHTS ATTEST DATE_af_date", page: 0, x: 34.85, y: 440.1, w: 94.56, h: 13.44, type: "date", label: "Item 3 Date", readOnly: true },

  // ── Item 4: UA/Desertion ──
  { name: "4 CURRENT UAS OVER 24 HRS AND MARKS OF DESERTION", page: 0, x: 34.09, y: 404.71, w: 538.2, h: 14.39, type: "text", label: "UA/Desertion" },

  // ── Item 6: Punishment ──
  { name: "6 PUNISHMENT IMPOSED", page: 0, x: 34.09, y: 350.28, w: 436.52, h: 15.93, type: "text", label: "Punishment", readOnly: true },
  { name: "6 PUNISHMENT IMPOSITION DATE", page: 0, x: 475.74, y: 350.28, w: 96.3, h: 15.93, type: "date", label: "Punishment Date", readOnly: true },

  // ── Item 7: Suspension ──
  { name: "7 SUSPENSION IF ANY", page: 0, x: 34.09, y: 322.71, w: 538.2, h: 15.93, type: "text", label: "Suspension", readOnly: true },

  // ── Items 8-8B: NJP Authority ──
  { name: "8 NJP AUTHORITY NAME TITLE SERVICE", page: 0, x: 34.09, y: 295.72, w: 358.56, h: 15.93, type: "text", label: "NJP Authority", readOnly: true },
  { name: "8A NJP AUTHORITY GRADE", page: 0, x: 394.54, y: 295.72, w: 87.87, h: 15.93, type: "text", label: "Authority Grade", readOnly: true },
  { name: "8B NJP AUTHORITY EDIPI", page: 0, x: 483.85, y: 295.72, w: 88.44, h: 15.93, type: "text", label: "Authority EDIPI", readOnly: true },

  // ── Item 10: Date of Notice ──
  { name: "10 DATE OF DISPOSITION NOTICE", page: 0, x: 475.99, y: 247.21, w: 96.3, h: 14.4, type: "date", label: "Notice Date" },

  // ── Item 11: Appeal Advisement Date ──
  { name: "11 APPEAL ADVISEMENT DATE_af_date", page: 0, x: 35.56, y: 203.72, w: 66.44, h: 14.4, type: "date", label: "Item 11 Date" },

  // ── Item 12: Appeal Intent ──
  { name: "12 INTEND APPEAL", page: 0, x: 328.44, y: 225.42, w: 124.03, h: 9.36, type: "text", label: "Appeal Intent", readOnly: true },
  { name: "12 APPEAL INTENT DATE_af_date", page: 0, x: 255.99, y: 203.89, w: 66.44, h: 14.4, type: "date", label: "Item 12 Date" },

  // ── Item 13: Appeal Filed ──
  { name: "13 DATE OF APPEAL IF ANY_af_date", page: 0, x: 475.99, y: 193.18, w: 96.3, h: 14.4, type: "date", label: "Appeal Filed Date" },
  { name: "13 NOT APPEALED", page: 0, x: 479.56, y: 211.26, w: 12, h: 11.46, type: "checkbox", label: "Not Appealed" },

  // ── Item 14: Appeal Decision ──
  { name: "14 APPEAL DECISION", page: 0, x: 35.56, y: 167.46, w: 433.7, h: 13.44, type: "text", label: "Appeal Decision" },
  { name: "14 APPEAL DECISION DATE_af_date", page: 0, x: 35.56, y: 151.92, w: 66.44, h: 14.4, type: "date", label: "Item 14 Date" },

  // ── Item 15: Notice of Appeal Decision ──
  { name: "15 DATE OF NOTICE OF APPEAL DECISION_af_date", page: 0, x: 475.99, y: 139.21, w: 96.3, h: 14.4, type: "date", label: "Item 15 Date" },

  // ── Item 16: Admin Closure ──
  { name: "16 FINAL ADMIN UD", page: 0, x: 310.06, y: 122.36, w: 59.1, h: 14.4, type: "text", label: "UD Number" },
  { name: "16 FINAL ADMIN DTD", page: 0, x: 388.84, y: 122.36, w: 59.1, h: 14.4, type: "date", label: "UD Date" },

  // ── Page 2: Item 21 Remarks ──
  { name: "21 REMARKS", page: 1, x: 39.33, y: 203.63, w: 538.6, h: 518.92, type: "text", label: "Remarks" },

  // ── Page 2: Items 22 Victim Data ──
  { name: "22A VICTIM STATUS", page: 1, x: 64.38, y: 179.44, w: 100.75, h: 10.81, type: "text", label: "Victim A Status", readOnly: true },
  { name: "22A VICTIM SEX", page: 1, x: 183.34, y: 179.39, w: 79.95, h: 10.81, type: "text", label: "Victim A Sex", readOnly: true },
  { name: "22A VICTIM RACE", page: 1, x: 280.48, y: 179.31, w: 150.05, h: 10.81, type: "text", label: "Victim A Race", readOnly: true },
  { name: "22A VICTIM ETHNICITY", page: 1, x: 447.59, y: 179.33, w: 93.43, h: 10.81, type: "text", label: "Victim A Ethnicity", readOnly: true },

  // ── Page 2: Accused repeat (Items 23-25) ──
  { name: "23 ACCUSED FULL NAME", page: 1, x: 39.37, y: 95.4, w: 358.57, h: 14.4, type: "text", label: "Accused Name", readOnly: true },
  { name: "24 ACCUSED RANK/GRADE", page: 1, x: 399.37, y: 95.4, w: 88.56, h: 14.4, type: "text", label: "Rank/Grade", readOnly: true },
  { name: "25 ACCUSED EDIPI", page: 1, x: 489.37, y: 95.4, w: 88.55, h: 14.4, type: "text", label: "EDIPI", readOnly: true },
];

/* ── Map case data to field values ── */

function mapCaseToFieldValues(caseData: CaseData): Record<string, string> {
  const vals: Record<string, string> = {};
  const accused = caseData.accused || {};
  const offenses = caseData.offenses || [];
  const pr = caseData.punishmentRecord;
  const appeal = caseData.appealRecord;

  // Accused info
  const fullName = `${accused.lastName || ""}, ${accused.firstName || ""}${accused.middleName ? " " + accused.middleName : ""}`;
  vals["17 UNIT"] = accused.unitFullString || "";
  vals["18 ACCUSED FULL NAME"] = fullName;
  vals["19 ACCUSED RANK/GRADE"] = `${accused.rank || ""} / ${accused.grade || ""}`;
  vals["20 ACCUSED EDIPI"] = accused.edipi || "";
  vals["23 ACCUSED FULL NAME"] = fullName;
  vals["24 ACCUSED RANK/GRADE"] = `${accused.rank || ""} / ${accused.grade || ""}`;
  vals["25 ACCUSED EDIPI"] = accused.edipi || "";

  // Offenses
  const letters = ["A", "B", "C", "D", "E"];
  for (let i = 0; i < Math.min(offenses.length, 5); i++) {
    const o = offenses[i];
    vals[`1${letters[i]} ARTICLE`] = o.ucmjArticle ? `Art. ${o.ucmjArticle}` : "";
    vals[`1${letters[i]} SUMMARY`] = o.shortDescription || o.summary || "";
    vals[`1${letters[i]} FINDING`] = o.finding === "GUILTY" ? "G" : o.finding === "NOT_GUILTY" ? "NG" : "";
  }

  // Item 2: Election
  if (caseData.item2ElectionAccepted === true) {
    vals["2 DEMAND"] = "Accept NJP";
  } else if (caseData.item2ElectionAccepted === false) {
    vals["2 DEMAND"] = "Demand Trial";
  }
  vals["2 COUNSELOPP"] = caseData.item2CounselConsulted ? "have" : "";
  vals["2 ACC ELECTION AND RIGHTS DATE_af_date"] = caseData.signatures?.["2"]?.signedDate || "";

  // Item 3: CO Cert
  vals["3 RIGHTS ATTEST DATE_af_date"] = caseData.signatures?.["3"]?.signedDate || "";

  // Item 4: UA
  vals["4 CURRENT UAS OVER 24 HRS AND MARKS OF DESERTION"] = caseData.uaApplicable ? "See case record" : "";

  // Item 6: Punishment
  if (pr) {
    const parts: string[] = [];
    if (pr.forfeitureAmount) parts.push(`Forfeit $${pr.forfeitureAmount}${pr.forfeitureMonths > 1 ? `/mo x${pr.forfeitureMonths}` : ""}`);
    if (pr.extraDutiesDays) parts.push(`Extra duties ${pr.extraDutiesDays}d`);
    if (pr.restrictionDays) parts.push(`Restriction ${pr.restrictionDays}d`);
    if (pr.corrCustodyDays) parts.push(`Corr custody ${pr.corrCustodyDays}d`);
    if (pr.reductionImposed) parts.push(`Reduce to ${pr.reductionToGrade}`);
    if (pr.admonitionReprimand) parts.push(pr.admonitionReprimand === "reprimand" ? "Reprimand" : "Admonition");
    vals["6 PUNISHMENT IMPOSED"] = parts.join("; ");
    vals["6 PUNISHMENT IMPOSITION DATE"] = caseData.njpDate || "";
  }

  // Item 7: Suspension
  if (pr?.suspensionImposed) {
    vals["7 SUSPENSION IF ANY"] = `${pr.suspensionPunishment} susp ${pr.suspensionMonths || 6} mos`;
  } else {
    vals["7 SUSPENSION IF ANY"] = pr ? "NONE" : "";
  }

  // Items 8: NJP Authority
  vals["8 NJP AUTHORITY NAME TITLE SERVICE"] = caseData.hearingRecord?.njpAuthorityName || "";
  vals["8A NJP AUTHORITY GRADE"] = caseData.hearingRecord?.njpAuthorityGrade || "";
  vals["8B NJP AUTHORITY EDIPI"] = caseData.hearingRecord?.njpAuthorityEdipi || "";

  // Item 10: Notice date
  vals["10 DATE OF DISPOSITION NOTICE"] = caseData.dateNoticeToAccused || "";

  // Item 11: Appeal advisement
  vals["11 APPEAL ADVISEMENT DATE_af_date"] = caseData.signatures?.["11"]?.signedDate || "";

  // Item 12: Appeal intent
  if (appeal?.appealIntent === "INTENDS_TO_APPEAL") vals["12 INTEND APPEAL"] = "Intends to appeal";
  else if (appeal?.appealIntent === "DOES_NOT_INTEND") vals["12 INTEND APPEAL"] = "Does not intend";
  else if (appeal?.appealIntent === "REFUSED_TO_SIGN") vals["12 INTEND APPEAL"] = "Refused to sign";
  vals["12 APPEAL INTENT DATE_af_date"] = caseData.signatures?.["12"]?.signedDate || "";

  // Item 13: Appeal filed
  vals["13 DATE OF APPEAL IF ANY_af_date"] = appeal?.appealFiledDate || "";
  vals["13 NOT APPEALED"] = appeal?.appealIntent === "DOES_NOT_INTEND" ? "X" : "";

  // Item 14: Appeal decision
  if (appeal?.appealOutcome === "DENIED") vals["14 APPEAL DECISION"] = "Deny relief";
  else if (appeal?.appealOutcome === "GRANTED") vals["14 APPEAL DECISION"] = `Grant relief: ${appeal.appealOutcomeDetail || ""}`;
  vals["14 APPEAL DECISION DATE_af_date"] = appeal?.appealAuthoritySignedDate || "";

  // Item 15
  vals["15 DATE OF NOTICE OF APPEAL DECISION_af_date"] = caseData.dateNoticeAppealDecision || "";

  // Item 16
  vals["16 FINAL ADMIN UD"] = caseData.item16UdNumber || "";
  vals["16 FINAL ADMIN DTD"] = caseData.item16Dtd || "";

  // Item 21: Remarks
  const remarks = (caseData.item21Entries || [])
    .map((e: { entryDate: string; entryText: string }) => `${e.entryDate} - ${e.entryText}`)
    .join("\n");
  vals["21 REMARKS"] = remarks;

  // Victim data
  for (let i = 0; i < Math.min(offenses.length, 5); i++) {
    const o = offenses[i];
    const v = o.victims?.[0];
    if (v) {
      vals[`22${letters[i]} VICTIM STATUS`] = v.status || "";
      vals[`22${letters[i]} VICTIM SEX`] = v.sex || "";
      vals[`22${letters[i]} VICTIM RACE`] = v.race || "";
      vals[`22${letters[i]} VICTIM ETHNICITY`] = v.ethnicity || "";
    }
  }

  return vals;
}

/* ── Convert PDF coords (bottom-left origin) to CSS % (top-left origin) ── */

function pdfToCSS(field: FieldDef): { left: string; top: string; width: string; height: string } {
  const left = (field.x / PAGE_W) * 100;
  const absH = Math.abs(field.h);
  const top = ((PAGE_H - field.y - absH) / PAGE_H) * 100;
  const width = (field.w / PAGE_W) * 100;
  const height = (absH / PAGE_H) * 100;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}

/* ── PDF Canvas Renderer ── */

function usePdfPages(pdfUrl: string) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setLoading(true);
      try {
        // Dynamic import for pdfjs-dist (avoids SSR issues)
        const pdfjsLib = await import("pdfjs-dist");

        // Set worker source — served from public/
        const base = process.env.NEXT_PUBLIC_BASE_PATH || "/LegalFlow";
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const urls: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2; // 2x for crisp rendering
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          urls.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) {
          setPageImages(urls);
          setTotalPages(pdf.numPages);
        }
      } catch (err) {
        console.error("PDF rendering failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  return { pageImages, loading, totalPages };
}

/* ── Main Component ── */

interface NavmcFormOverlayProps {
  caseData: CaseData;
  className?: string;
}

export default function NavmcFormOverlay({ caseData, className }: NavmcFormOverlayProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/LegalFlow";
  const pdfUrl = `${basePath}/forms/NAVMC_10132.pdf`;

  const { pageImages, loading, totalPages } = usePdfPages(pdfUrl);
  const [currentPage, setCurrentPage] = useState(0);
  const fieldValues = mapCaseToFieldValues(caseData);

  const goToPrev = useCallback(() => setCurrentPage((p) => Math.max(0, p - 1)), []);
  const goToNext = useCallback(() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);

  // Fields for current page
  const pageFields = FIELD_DEFS.filter((f) => f.page === currentPage);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-neutral-100 py-20", className)}>
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-neutral-mid">Loading NAVMC 10132...</p>
        </div>
      </div>
    );
  }

  if (pageImages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-neutral-100 py-10 text-sm text-neutral-mid", className)}>
        Failed to load NAVMC 10132 form template.
      </div>
    );
  }

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden bg-white", className)}>
      {/* Page navigation */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b border-border">
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors",
            currentPage === 0 ? "text-neutral-mid/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"
          )}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="text-xs font-medium text-neutral-dark">
          NAVMC 10132 — Page {currentPage + 1} of {totalPages}
        </span>
        <button
          onClick={goToNext}
          disabled={currentPage === totalPages - 1}
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors",
            currentPage === totalPages - 1 ? "text-neutral-mid/40 cursor-not-allowed" : "text-primary hover:bg-primary/10"
          )}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* Form page with overlaid fields */}
      <div className="relative w-full" style={{ aspectRatio: `${PAGE_W} / ${PAGE_H}` }}>
        {/* Background: rendered PDF page */}
        <img
          src={pageImages[currentPage]}
          alt={`NAVMC 10132 Page ${currentPage + 1}`}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />

        {/* Overlaid field values */}
        {pageFields.map((field) => {
          const pos = pdfToCSS(field);
          const value = fieldValues[field.name] || "";

          if (field.type === "checkbox") {
            return (
              <div
                key={field.name}
                className="absolute flex items-center justify-center"
                style={pos}
                title={field.label}
              >
                {value && (
                  <span className="text-[10px] font-bold text-blue-800 leading-none">X</span>
                )}
              </div>
            );
          }

          // Is this a large text area (Item 21)?
          const isTextArea = field.h > 100;

          return (
            <div
              key={field.name}
              className="absolute overflow-hidden"
              style={pos}
              title={field.label}
            >
              {isTextArea ? (
                <div
                  className="w-full h-full px-[2px] text-blue-900 leading-tight whitespace-pre-wrap overflow-hidden"
                  style={{ fontSize: "clamp(6px, 0.95vw, 9px)", fontFamily: "monospace" }}
                >
                  {value}
                </div>
              ) : (
                <div
                  className={cn(
                    "w-full h-full flex items-center px-[2px] text-blue-900 truncate leading-none",
                    !value && "bg-yellow-100/30"
                  )}
                  style={{ fontSize: "clamp(6px, 0.95vw, 10px)", fontFamily: "monospace" }}
                >
                  {value || ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
