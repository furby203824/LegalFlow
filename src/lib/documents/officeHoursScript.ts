import type { CaseData } from "./types";
import { fmtFull } from "./dateFormatters";
import { punishmentFull, maxPunishmentByGrade } from "./punishmentText";
import { PUNISHMENT_LIMITS } from "@/types";

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

  // Section 1: Pre-hearing confirmation
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("1. PRE-HEARING CONFIRMATION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("Verify the following items are complete:");
  lines.push("  [ ] Items 1 (charges) are entered correctly");
  lines.push("  [ ] Items 17-20 (accused biographical data) are verified");
  lines.push("  [ ] Item 22 (victim demographics) are entered");
  lines.push("  [ ] Item 2 prepared for accused signature");
  lines.push("  [ ] Counsel consultation opportunity provided");
  lines.push("  [ ] Investigating officer's report reviewed (if applicable)");
  lines.push("  [ ] Chain of command endorsement obtained");
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
      `  Charge ${offense.letter}: "In that you did, on or about ${fmtFull(offense.offenseDate)},`
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
  lines.push("[Record election on Item 2]");
  lines.push("");

  // Section 5: Counsel consultation
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("5. COUNSEL CONSULTATION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push(`"${marineName}, have you been provided the opportunity to`);
  lines.push('consult with counsel regarding this matter?"');
  lines.push("");
  lines.push("[Document counsel consultation on Item 2]");
  lines.push("");

  // Section 6: Item 2 execution
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("6. ITEM 2 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Accused signs Item 2 with date]");
  lines.push("[If accused REFUSES to sign: CO notes refusal and signs for accused]");
  lines.push("[Record signer name and date]");
  lines.push("");

  // Section 7: Item 3 execution
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("7. ITEM 3 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[CO certifies that accused was advised of rights and signs Item 3]");
  lines.push("[Record signer name and date]");
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
  lines.push("[Record findings on NAVMC 10132 Item 5]");
  lines.push("");

  // Section 10: Punishment
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("10. PUNISHMENT ANNOUNCEMENT");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");

  // Show punishment limits
  lines.push(`Maximum punishment authorized (${data.commanderGradeLevel}):`);
  for (const limit of maxPunishmentByGrade(data.commanderGradeLevel)) {
    lines.push(`  * ${limit}`);
  }

  if (data.component === "SMCR") {
    lines.push("");
    lines.push("  NOTE (SMCR): Forfeiture is limited to pay earned during the");
    lines.push("  60-day period beginning on the NJP date. See SMCR forfeiture");
    lines.push("  calculator for maximum amount.");
  }

  lines.push("");
  if (data.item6Punishments.length > 0) {
    lines.push(`"${marineName}, your punishment is as follows:"`);
    for (const p of data.item6Punishments) {
      let line = `  - ${punishmentFull(p)}`;
      if (p.suspended) {
        line += ` (suspended for ${p.suspensionMonths} months)`;
      }
      lines.push(line);
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
    lines.push(`"The following punishment is suspended: ${data.item7SuspensionDetails}`);
    if (data.item7SuspensionMonths) {
      lines.push(`for a period of ${data.item7SuspensionMonths} months.`);
    }
    if (data.item7RemissionTerms) {
      lines.push(`The suspension will be automatically remitted unless: ${data.item7RemissionTerms}`);
    }
    lines.push('"');
  } else {
    lines.push("[No suspension or suspension details to be announced]");
  }
  lines.push("");

  // Section 12: Item 9 execution
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("12. ITEM 9 EXECUTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[NJP Authority signs Item 9 with date]");
  lines.push("");

  // Section 13: Item 10 - Notification
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("13. NOTIFICATION OF FINAL DISPOSITION (Item 10)");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Record date of notification to accused on Item 10]");
  lines.push("[NJP Authority signs Item 11 with date]");
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

  // Section 15: Item 12 - Appeal election
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("15. ITEM 12 EXECUTION - APPEAL ELECTION");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("[Accused indicates appeal intent on Item 12:]");
  lines.push('  ( ) "I intend to appeal"');
  lines.push('  ( ) "I do not intend to appeal"');
  lines.push('  ( ) Refused to sign');
  lines.push("");
  lines.push("[Accused signs Item 12 with date]");
  lines.push("");

  // Section 16: Post-hearing checklist
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("16. POST-HEARING CHECKLIST");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("  [ ] Item 5 - Findings recorded");
  lines.push("  [ ] Item 6 - Punishment recorded");
  lines.push("  [ ] Item 7 - Suspension recorded (if applicable)");
  lines.push("  [ ] Item 9 - NJP Authority signed");
  lines.push("  [ ] Item 10 - Date of notification recorded");
  lines.push("  [ ] Item 11 - NJP Authority notification signed");
  lines.push("  [ ] Item 12 - Accused appeal election signed");
  lines.push("  [ ] NJP logged in LegalFlow database");
  lines.push("");

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                     END OF SCRIPT");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
