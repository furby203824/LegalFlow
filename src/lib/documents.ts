import { format, parseISO } from "date-fns";
import type { Rank, Grade } from "@/types";

// ============================================================================
// Document Generation
// Generates text-based document content for NAVMC 10132, Charge Sheet,
// and Office Hours Script
// ============================================================================

interface CaseData {
  caseNumber: string;
  accusedLastName: string;
  accusedFirstName: string;
  accusedMiddleName: string;
  accusedRank: Rank;
  accusedGrade: Grade;
  accusedEdipi: string;
  accusedUnit: string;
  accusedUnitGcmca: string;
  commanderGrade: Grade;
  component: string;
  vesselException: boolean;
  offenses: {
    letter: string;
    ucmjArticle: string;
    offenseType: string;
    summary: string;
    offenseDate: string;
    offensePlace: string;
    finding?: string;
    victims: {
      status: string;
      sex: string;
      race: string;
      ethnicity: string;
    }[];
  }[];
  item6Punishments: {
    type: string;
    duration?: number;
    amount?: number;
    reducedToGrade?: string;
    suspended: boolean;
    suspensionMonths?: number;
  }[];
  item6Date?: string;
  item7SuspensionDetails?: string;
  item8AuthorityName?: string;
  item8AuthorityTitle?: string;
  item8AuthorityUnit?: string;
  item8AuthorityRank?: string;
  item8AuthorityGrade?: string;
}

function fmtDate(date: string): string {
  try {
    return format(parseISO(date), "dd MMM yyyy").toUpperCase();
  } catch {
    return date;
  }
}

function punishmentText(p: {
  type: string;
  duration?: number;
  amount?: number;
  reducedToGrade?: string;
}): string {
  switch (p.type) {
    case "CORRECTIONAL_CUSTODY":
      return `Correctional custody for ${p.duration} days`;
    case "FORFEITURE":
      return `Forfeiture of $${p.amount}`;
    case "REDUCTION":
      return `Reduction to ${p.reducedToGrade}`;
    case "EXTRA_DUTIES":
      return `Extra duties for ${p.duration} days`;
    case "RESTRICTION":
      return `Restriction for ${p.duration} days`;
    case "ARREST_IN_QUARTERS":
      return `Arrest in quarters for ${p.duration} days`;
    case "DETENTION_OF_PAY":
      return `Detention of pay for ${p.duration} days`;
    default:
      return p.type;
  }
}

// --- Charge Sheet ---
export function generateChargeSheet(data: CaseData): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                        CHARGE SHEET");
  lines.push("                  NON-JUDICIAL PUNISHMENT");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Case Number: ${data.caseNumber}`);
  lines.push(`Date: ${fmtDate(new Date().toISOString())}`);
  lines.push("");
  lines.push("ACCUSED:");
  lines.push(
    `  Name: ${data.accusedLastName}, ${data.accusedFirstName} ${data.accusedMiddleName}`.trim()
  );
  lines.push(`  Rank/Grade: ${data.accusedRank} / ${data.accusedGrade}`);
  lines.push(`  EDIPI: ${data.accusedEdipi}`);
  lines.push(`  Unit: ${data.accusedUnit}`);
  lines.push("");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("CHARGES:");
  lines.push("");

  for (const offense of data.offenses) {
    lines.push(
      `  Charge ${offense.letter}: Violation of UCMJ Article ${offense.ucmjArticle}`
    );
    lines.push(`    Offense Type: ${offense.offenseType}`);
    lines.push(`    Date: ${fmtDate(offense.offenseDate)}`);
    lines.push(`    Place: ${offense.offensePlace}`);
    lines.push(`    Summary: ${offense.summary}`);
    lines.push("");
  }

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("This charge sheet is for pre-hearing review purposes only.");
  lines.push("It is not a legal charging document for court-martial purposes.");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// --- NAVMC 10132 (simplified text representation) ---
export function generateNavmc10132(data: CaseData): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    NAVMC 10132 (REV. 08-2023)");
  lines.push("                   UNIT PUNISHMENT BOOK");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Case Number: ${data.caseNumber}`);
  lines.push("");

  // Items 17-20: Accused info
  lines.push("ITEM 17-20: ACCUSED INFORMATION");
  lines.push(
    `  Name: ${data.accusedLastName}, ${data.accusedFirstName} ${data.accusedMiddleName}`.trim()
  );
  lines.push(`  Rank/Grade: ${data.accusedRank} / ${data.accusedGrade}`);
  lines.push(`  EDIPI: ${data.accusedEdipi}`);
  lines.push(`  Unit: ${data.accusedUnit}`);
  lines.push(`  Component: ${data.component}`);
  lines.push("");

  // Item 1: Offenses
  lines.push("ITEM 1: OFFENSES");
  for (const offense of data.offenses) {
    lines.push(
      `  ${offense.letter}. Article ${offense.ucmjArticle} - ${offense.offenseType}`
    );
    lines.push(`     ${offense.summary}`);
    lines.push(
      `     Date: ${fmtDate(offense.offenseDate)} | Place: ${offense.offensePlace}`
    );
    if (offense.finding) {
      lines.push(`     Finding: ${offense.finding === "G" ? "GUILTY" : "NOT GUILTY"}`);
    }
  }
  lines.push("");

  // Item 22: Victim demographics
  lines.push("ITEM 22: VICTIM DEMOGRAPHICS");
  for (const offense of data.offenses) {
    for (const v of offense.victims) {
      lines.push(
        `  ${offense.letter}. ${v.status} / ${v.sex} / ${v.race} / ${v.ethnicity}`
      );
    }
  }
  lines.push("");

  // Item 6: Punishment
  if (data.item6Date) {
    lines.push("ITEM 6: PUNISHMENT IMPOSED");
    lines.push(`  Date: ${fmtDate(data.item6Date)}`);
    for (const p of data.item6Punishments) {
      let line = `  - ${punishmentText(p)}`;
      if (p.suspended) {
        line += ` (SUSPENDED for ${p.suspensionMonths} months)`;
      }
      lines.push(line);
    }
    lines.push("");
  }

  // Item 7: Suspension
  if (data.item7SuspensionDetails) {
    lines.push("ITEM 7: SUSPENSION");
    lines.push(`  ${data.item7SuspensionDetails}`);
    lines.push("");
  }

  // Items 8-9: NJP Authority
  if (data.item8AuthorityName) {
    lines.push("ITEMS 8-9: NJP AUTHORITY");
    lines.push(`  Name: ${data.item8AuthorityName}`);
    lines.push(`  Title: ${data.item8AuthorityTitle}`);
    lines.push(`  Unit: ${data.item8AuthorityUnit}`);
    lines.push(`  Rank/Grade: ${data.item8AuthorityRank} / ${data.item8AuthorityGrade}`);
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("  CLASSIFICATION: CUI - PRIVACY SENSITIVE WHEN POPULATED");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// --- Office Hours Script ---
export function generateOfficeHoursScript(data: CaseData): string {
  const marineName = `${data.accusedRank} ${data.accusedLastName}`;
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                   OFFICE HOURS SCRIPT");
  lines.push("              NON-JUDICIAL PUNISHMENT PROCEEDINGS");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Case: ${data.caseNumber}`);
  lines.push(`Marine: ${marineName}`);
  lines.push("");

  // Section 1: Pre-hearing
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("1. PRE-HEARING CONFIRMATION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("Verify the following items are complete:");
  lines.push("  [ ] Items 1 (charges) are entered correctly");
  lines.push("  [ ] Items 17-20 (accused biographical data) are verified");
  lines.push("  [ ] Item 22 (victim demographics) are entered");
  lines.push("");

  // Section 2: Presentation of charges
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("2. PRESENTATION OF CHARGES");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`"${marineName}, you have been brought before me for Non-Judicial`);
  lines.push('Punishment under Article 15 of the Uniform Code of Military Justice.');
  lines.push('The charges against you are as follows:"');
  lines.push("");
  for (const offense of data.offenses) {
    lines.push(
      `  Charge ${offense.letter}: "In that you did, on or about ${fmtDate(offense.offenseDate)},`
    );
    lines.push(`  at ${offense.offensePlace}, ${offense.summary}.`);
    lines.push(`  In violation of Article ${offense.ucmjArticle}, UCMJ."`);
    lines.push("");
  }

  // Section 3: Article 31 rights
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("3. ARTICLE 31 RIGHTS ADVISEMENT");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`"${marineName}, I am now going to advise you of your rights`);
  lines.push("under Article 31 of the Uniform Code of Military Justice.");
  lines.push("");
  lines.push("You have the right to remain silent, that is, to say nothing at");
  lines.push("all. Any statement you make, oral or written, may be used as");
  lines.push("evidence against you in a trial by court-martial or in other");
  lines.push("judicial or administrative proceedings.");
  lines.push("");
  lines.push("You have the right to consult with a lawyer prior to any");
  lines.push("questioning. You may obtain a military lawyer at no cost to");
  lines.push('you, or you may obtain a civilian lawyer at your own expense."');
  lines.push("");

  // Section 4: NJP election
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("4. NJP ELECTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  if (data.vesselException) {
    lines.push(`"${marineName}, because you are attached to or embarked in a`);
    lines.push("vessel, you may not refuse non-judicial punishment. However,");
    lines.push("you have the right to present matters in defense, extenuation,");
    lines.push('and mitigation."');
  } else {
    lines.push(`"${marineName}, you have the right to accept non-judicial`);
    lines.push("punishment or to demand trial by court-martial. If you accept");
    lines.push("non-judicial punishment, you will have the right to present");
    lines.push("matters in defense, extenuation, and mitigation. You also have");
    lines.push('the right to appeal any punishment imposed."');
    lines.push("");
    lines.push(`"Do you accept non-judicial punishment or do you demand trial`);
    lines.push('by court-martial?"');
  }
  lines.push("");

  // Section 5: Counsel
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("5. COUNSEL CONSULTATION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`"${marineName}, have you been provided the opportunity to`);
  lines.push('consult with counsel regarding this matter?"');
  lines.push("");

  // Section 6: Item 2
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("6. ITEM 2 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Accused signs Item 2, or CO signs for refusal]");
  lines.push("");

  // Section 7: Item 3
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("7. ITEM 3 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[CO certifies rights advisement and signs Item 3]");
  lines.push("");

  // Section 8: Evidence
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("8. EVIDENCE PRESENTATION AND DELIBERATION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Present evidence. Allow accused to present matters in defense,");
  lines.push("extenuation, and mitigation. Deliberate findings.]");
  lines.push("");

  // Section 9: Findings
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("9. FINDINGS ANNOUNCEMENT");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`"${marineName}, I find you:"`);
  for (const offense of data.offenses) {
    lines.push(
      `  Charge ${offense.letter} (Article ${offense.ucmjArticle}): __________ [GUILTY / NOT GUILTY]`
    );
  }
  lines.push("");

  // Section 10: Punishment
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("10. PUNISHMENT ANNOUNCEMENT");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  if (data.item6Punishments.length > 0) {
    lines.push(`"${marineName}, your punishment is as follows:"`);
    for (const p of data.item6Punishments) {
      lines.push(`  - ${punishmentText(p)}`);
    }
  } else {
    lines.push(`"${marineName}, your punishment is as follows:"`);
    lines.push("  [Punishment to be announced]");
  }
  lines.push("");

  // Section 11: Suspension
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("11. SUSPENSION ANNOUNCEMENT (if applicable)");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  if (data.item7SuspensionDetails) {
    lines.push(`"The following punishment is suspended: ${data.item7SuspensionDetails}"`);
  } else {
    lines.push("[No suspension or suspension details to be announced]");
  }
  lines.push("");

  // Section 12: Item 9
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("12. ITEM 9 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[NJP Authority signs Item 9]");
  lines.push("");

  // Section 13: Notification
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("13. NOTIFICATION OF FINAL DISPOSITION (Item 10)");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Record date of notification]");
  lines.push("");

  // Section 14: Appeal rights
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("14. APPEAL RIGHTS ADVISEMENT");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`"${marineName}, you have the right to appeal any punishment`);
  lines.push("imposed. An appeal must be submitted within 5 calendar days of");
  lines.push("this notification. You may appeal on the grounds that the");
  lines.push("punishment was unjust or disproportionate to the offense.");
  lines.push("You also have the right to consult with a lawyer regarding");
  lines.push('your appeal rights."');
  lines.push("");

  // Section 15: Item 11
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("15. ITEM 11 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[NJP Authority signs Item 11]");
  lines.push("");

  // Section 16: Item 12
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("16. ITEM 12 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Accused indicates appeal intent and signs Item 12]");
  lines.push("[Legal officer or assistant facilitates]");
  lines.push("");

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                     END OF SCRIPT");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// --- Vacation Notice (Figure 14-1) ---
export function generateVacationNotice(data: {
  caseNumber: string;
  marineName: string;
  marineRank: string;
  marineUnit: string;
  commanderName: string;
  commanderTitle: string;
  commanderUnit: string;
  njpDate: string;
  suspensionDuration: string;
  triggeringOffense: string;
  vacatedInFull: boolean;
  partialDetails?: string;
  pocInfo: string;
}): string {
  const lines: string[] = [];
  const today = format(new Date(), "dd MMM yyyy").toUpperCase();

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("        NOTICE OF INTENT TO VACATE SUSPENDED PUNISHMENT");
  lines.push("                        (Figure 14-1)");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("                                              SSIC 5800");
  lines.push("                                              S1");
  lines.push(`                                              ${today}`);
  lines.push("");
  lines.push(`From: ${data.commanderName}, ${data.commanderTitle}`);
  lines.push(`To:   ${data.marineRank} ${data.marineName}`);
  lines.push("");
  lines.push("Subj: NOTICE OF INTENT TO VACATE SUSPENDED PUNISHMENT");
  lines.push("");
  lines.push(`Ref:  (a) Case ${data.caseNumber}`);
  lines.push("");
  lines.push(
    `1. On ${fmtDate(data.njpDate)}, you received Non-Judicial Punishment ` +
    `under Article 15, UCMJ, which included a suspended punishment for a ` +
    `period of ${data.suspensionDuration}. You have committed a subsequent ` +
    `offense: ${data.triggeringOffense}.`
  );
  lines.push("");
  if (data.vacatedInFull) {
    lines.push(
      "2. It is my intent to vacate the suspended punishment IN FULL."
    );
  } else {
    lines.push(
      `2. It is my intent to vacate the suspended punishment IN PART: ${data.partialDetails}`
    );
  }
  lines.push("");
  lines.push(
    `3. Point of contact for this matter is ${data.pocInfo}.`
  );
  lines.push("");
  lines.push("");
  lines.push(`                                    ${data.commanderName}`);
  lines.push("");
  lines.push("Copy to:");
  lines.push("  Files");
  lines.push("  IPAC");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
