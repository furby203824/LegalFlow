import type { CaseData } from "./types";
import { fmtFull } from "./dateFormatters";

export function generateFigure141(data: CaseData): string {
  const lines: string[] = [];
  const today = fmtFull(new Date().toISOString());
  const vr = data.vacationRecord;

  if (!vr) {
    return "ERROR: No vacation record data available for Figure 14-1 generation.";
  }

  lines.push("CUI - PRIVACY SENSITIVE WHEN POPULATED");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("        NOTICE OF INTENT TO VACATE SUSPENDED PUNISHMENT");
  lines.push("                        (Figure 14-1)");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("                                              SSIC 5800");
  lines.push("                                              S1");
  lines.push(`                                              ${today}`);
  lines.push("");
  lines.push(`From: ${vr.coName}, ${vr.coTitle}`);
  lines.push(`To:   ${data.accusedRank} ${data.accusedLastName}, ${data.accusedFirstName} ${data.accusedMiddleName}`.trim());
  lines.push("");
  lines.push("Subj: NOTICE OF INTENT TO VACATE SUSPENDED PUNISHMENT");
  lines.push("");
  lines.push(`Ref:  (a) Case ${data.caseNumber}`);
  lines.push("      (b) MCO 5800.16 Vol 14");
  lines.push("");

  // Paragraph 1
  const njpDate = data.njpDate ? fmtFull(data.njpDate) : "[NJP DATE]";
  lines.push(
    `1. On ${njpDate}, you received Non-Judicial Punishment ` +
    `under Article 15, UCMJ, which included a suspended punishment ` +
    `(${vr.originalSuspendedPunishment}) effective ` +
    `${fmtFull(vr.originalSuspensionDate)}. You have committed a subsequent ` +
    `offense in violation of Article ${vr.triggeringUcmjArticle}, UCMJ: ` +
    `${vr.triggeringOffenseSummary} on or about ${fmtFull(vr.triggeringOffenseDate)}.`
  );
  lines.push("");

  // Paragraph 2
  if (vr.vacatedInFull) {
    lines.push(
      "2. It is my intent to vacate the suspended punishment IN FULL."
    );
  } else {
    lines.push(
      `2. It is my intent to vacate the suspended punishment IN PART: ${vr.vacatedPortion || "[specify portion]"}`
    );
  }
  lines.push("");

  // Paragraph 3
  const poc = vr.pocName
    ? `${vr.pocName}${vr.pocContact ? `, ${vr.pocContact}` : ""}`
    : "[POC information]";
  lines.push(
    `3. Point of contact for this matter is ${poc}.`
  );
  lines.push("");
  lines.push("");
  lines.push(`                                    ${vr.coName}`);
  lines.push("");
  lines.push("Copy to:");
  lines.push("  Files");
  lines.push("  IPAC");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
