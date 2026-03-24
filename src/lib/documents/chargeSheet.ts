import type { CaseData } from "./types";
import { fmtFull } from "./dateFormatters";
import { maxPunishmentByGrade } from "./punishmentText";

export function generateChargeSheet(data: CaseData): string {
  const lines: string[] = [];

  lines.push("CUI - PRIVACY SENSITIVE WHEN POPULATED");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                        CHARGE SHEET");
  lines.push("                  NON-JUDICIAL PUNISHMENT");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Case Number: ${data.caseNumber}`);
  lines.push(`Date: ${fmtFull(new Date().toISOString())}`);
  lines.push("");

  // Accused block
  lines.push("ACCUSED:");
  lines.push(
    `  Name: ${data.accusedLastName}, ${data.accusedFirstName} ${data.accusedMiddleName}`.trim()
  );
  lines.push(`  Rank/Grade: ${data.accusedRank} / ${data.accusedGrade}`);
  lines.push(`  EDIPI: ${data.accusedEdipi}`);
  lines.push(`  Unit: ${data.accusedUnit}`);
  lines.push(`  Component: ${data.component}`);
  lines.push("");

  // NJP Authority block
  if (data.njpAuthorityName) {
    lines.push("NJP AUTHORITY:");
    lines.push(`  Name: ${data.njpAuthorityName}`);
    if (data.njpAuthorityRank && data.njpAuthorityGrade) {
      lines.push(`  Rank/Grade: ${data.njpAuthorityRank} / ${data.njpAuthorityGrade}`);
    }
    if (data.njpAuthorityTitle) {
      lines.push(`  Title: ${data.njpAuthorityTitle}`);
    }
    if (data.njpAuthorityUnit) {
      lines.push(`  Unit: ${data.njpAuthorityUnit}`);
    }
    lines.push("");
  }

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("CHARGES:");
  lines.push("");

  for (const offense of data.offenses) {
    lines.push(
      `  Charge ${offense.letter}: Violation of UCMJ ${offense.ucmjArticle}`
    );
    lines.push(`    Offense Type: ${offense.offenseType || ""}`);
    lines.push(`    Date: ${fmtFull(offense.offenseDate)}${offense.offenseTime ? ` at ${offense.offenseTime}` : ""}`);
    if (offense.fromDate && offense.toDate && offense.fromDate !== offense.toDate) {
      lines.push(`    Through: ${fmtFull(offense.toDate)}${offense.toTime ? ` at ${offense.toTime}` : ""}`);
    }
    lines.push(`    Place: ${offense.offensePlace}`);
    lines.push(`    Summary: ${offense.summary}`);
    lines.push("");
  }

  // Max punishment table
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("MAXIMUM PUNISHMENT AUTHORIZED:");
  lines.push(`  (Commander Grade Level: ${data.commanderGradeLevel})`);
  lines.push("");
  for (const limit of maxPunishmentByGrade(data.commanderGradeLevel)) {
    lines.push(`  - ${limit}`);
  }
  lines.push("");

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("This charge sheet is for pre-hearing review purposes only.");
  lines.push("It is not a legal charging document for court-martial purposes.");
  lines.push("");

  // Preparer block
  if (data.preparerName) {
    lines.push(`Prepared by: ${data.preparerName}`);
    if (data.preparerTitle) {
      lines.push(`Title: ${data.preparerTitle}`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
