import type { CaseData, Navmc10132Version } from "./types";
import { fmtFull, fmtShort, fmtStandard, fmtISO } from "./dateFormatters";
import { punishmentAbbreviated, punishmentFull } from "./punishmentText";

export function generateNavmc10132(
  data: CaseData,
  version: Navmc10132Version = "PARTIAL"
): string {
  const lines: string[] = [];

  // Classification header
  lines.push("CUI - PRIVACY SENSITIVE WHEN POPULATED");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    NAVMC 10132 (REV. 08-2023)");
  lines.push("                   UNIT PUNISHMENT BOOK");
  lines.push("═══════════════════════════════════════════════════════════════");

  // Distribution line (FINAL only)
  if (version === "FINAL") {
    lines.push("  DISTRIBUTION: E-SRB / OMPF / FILES / MEMBER");
  }
  lines.push("");
  lines.push(`Case Number: ${data.caseNumber}`);
  lines.push("");

  // ===================== PAGE 1 =====================

  // Items 17-20: Accused info (all versions)
  lines.push("ITEM 17-20: ACCUSED INFORMATION");
  lines.push(
    `  Name: ${data.accusedLastName}, ${data.accusedFirstName} ${data.accusedMiddleName}`.trim()
  );
  lines.push(`  Rank/Grade: ${data.accusedRank} / ${data.accusedGrade}`);
  lines.push(`  EDIPI: ${data.accusedEdipi}`);
  lines.push(`  Unit: ${data.accusedUnit}`);
  lines.push(`  Component: ${data.component}`);
  lines.push("");

  // Item 1: Offenses (all versions)
  lines.push("ITEM 1: OFFENSES");
  for (const offense of data.offenses) {
    let offenseLine = `  ${offense.letter}. Article ${offense.ucmjArticle} - ${offense.offenseType}`;
    if (version !== "PARTIAL" && offense.finding) {
      offenseLine += ` [${offense.finding}]`;
    }
    lines.push(offenseLine);
    lines.push(`     ${offense.summary}`);
    lines.push(
      `     Date: ${fmtFull(offense.offenseDate)}${offense.offenseTime ? ` | Time: ${offense.offenseTime}` : ""} | Place: ${offense.offensePlace}`
    );
  }
  lines.push("");

  // Item 22: Victim demographics (all versions)
  lines.push("ITEM 22: VICTIM DEMOGRAPHICS");
  let hasVictims = false;
  for (const offense of data.offenses) {
    for (const v of offense.victims) {
      lines.push(
        `  ${offense.letter}${v.letter ? v.letter : ""}. ${v.status} / ${v.sex} / ${v.race} / ${v.ethnicity}`
      );
      hasVictims = true;
    }
  }
  if (!hasVictims) {
    lines.push("  [No victims]");
  }
  lines.push("");

  // Items 2-9: Only for HEARING and FINAL
  if (version !== "PARTIAL") {
    // Item 2: Rights advisement / election
    lines.push("ITEM 2: RIGHTS ADVISEMENT AND ELECTION");
    if (data.vesselException) {
      lines.push("  Vessel Exception Applies: YES");
      lines.push("  (Right to demand trial by court-martial not applicable)");
    } else {
      const election = data.item2ElectionAccepted === true
        ? "NJP ACCEPTED"
        : data.item2ElectionAccepted === false
          ? "COURT-MARTIAL DEMANDED"
          : "PENDING";
      lines.push(`  Election: ${election}`);
    }
    if (data.item2CounselConsulted !== undefined) {
      lines.push(`  Counsel Consulted: ${data.item2CounselConsulted ? "YES" : "NO"}`);
    }
    if (data.item2SignedDate) {
      if (data.item2RefusalNoted) {
        lines.push(`  Signature: REFUSED - CO SIGNED (${fmtStandard(data.item2SignedDate)})`);
        if (data.item2SignerName) {
          lines.push(`  CO Signer: ${data.item2SignerName}`);
        }
      } else {
        lines.push(`  Signed: ${fmtStandard(data.item2SignedDate)}`);
        if (data.item2SignerName) {
          lines.push(`  Signer: ${data.item2SignerName}`);
        }
      }
    }
    lines.push("");

    // Item 3: CO certification
    lines.push("ITEM 3: CO CERTIFICATION");
    if (data.item3SignedDate) {
      lines.push(`  Signed: ${fmtStandard(data.item3SignedDate)}`);
      if (data.item3SignerName) {
        lines.push(`  Signer: ${data.item3SignerName}`);
      }
    } else {
      lines.push("  [Pending]");
    }
    lines.push("");

    // Item 4: UA/Desertion
    if (data.uaApplicable) {
      lines.push("ITEM 4: UA / DESERTION");
      if (data.uaPeriodStart && data.uaPeriodEnd) {
        lines.push(`  Period: ${fmtStandard(data.uaPeriodStart)} to ${fmtStandard(data.uaPeriodEnd)}`);
      }
      if (data.desertionMarks) {
        lines.push(`  Desertion Marks: ${data.desertionMarks}`);
      }
      lines.push("");
    }

    // Item 5: Findings
    lines.push("ITEM 5: FINDINGS");
    for (const offense of data.offenses) {
      const finding = offense.finding === "G" ? "GUILTY" : offense.finding === "NG" ? "NOT GUILTY" : "PENDING";
      lines.push(`  ${offense.letter}. Article ${offense.ucmjArticle}: ${finding}`);
    }
    lines.push("");

    // Item 6: Punishment
    lines.push("ITEM 6: PUNISHMENT IMPOSED");
    if (data.item6Date) {
      lines.push(`  Date: ${fmtShort(data.item6Date)}`);
    }
    if (data.punishmentText) {
      lines.push(`  ${data.punishmentText}`);
    } else {
      for (const p of data.item6Punishments) {
        let line = `  - ${punishmentAbbreviated(p)}`;
        if (p.suspended) {
          line += ` (SUSP ${p.suspensionMonths} mos)`;
        }
        lines.push(line);
      }
    }
    lines.push("");

    // Item 7: Suspension
    if (data.item7SuspensionDetails || data.item7SuspensionStartDate) {
      lines.push("ITEM 7: SUSPENSION");
      if (data.item7SuspensionDetails) {
        lines.push(`  ${data.item7SuspensionDetails}`);
      }
      if (data.item7SuspensionMonths) {
        lines.push(`  Duration: ${data.item7SuspensionMonths} months`);
      }
      if (data.item7SuspensionStartDate && data.item7SuspensionEndDate) {
        lines.push(
          `  Period: ${fmtShort(data.item7SuspensionStartDate)} to ${fmtShort(data.item7SuspensionEndDate)}`
        );
      }
      if (data.item7RemissionTerms) {
        lines.push(`  Remission Terms: ${data.item7RemissionTerms}`);
      }
      lines.push("");
    }

    // Items 8-8B: NJP Authority
    lines.push("ITEMS 8-8B: NJP AUTHORITY");
    if (data.njpAuthorityName) {
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
    } else {
      lines.push("  [Not assigned]");
    }
    lines.push("");

    // Item 9: NJP Authority signature
    lines.push("ITEM 9: NJP AUTHORITY SIGNATURE");
    if (data.item9SignedDate) {
      lines.push(`  Signed: ${fmtStandard(data.item9SignedDate)}`);
      if (data.item9SignerName) {
        lines.push(`  Signer: ${data.item9SignerName}`);
      }
    } else {
      lines.push("  [Pending]");
    }
    lines.push("");
  }

  // ===================== PAGE 2 =====================
  // Items 10-16: HEARING version gets 10-12, FINAL gets all

  if (version !== "PARTIAL") {
    lines.push("───────────────────────────────────────────────────────────────");
    lines.push("                          PAGE 2");
    lines.push("───────────────────────────────────────────────────────────────");
    lines.push("");

    // Item 10: Notification
    lines.push("ITEM 10: DATE NOTICE TO ACCUSED");
    if (data.dateNoticeToAccused) {
      lines.push(`  ${fmtStandard(data.dateNoticeToAccused)}`);
    } else {
      lines.push("  [Pending]");
    }
    lines.push("");

    // Item 11: NJP Authority notification signature
    lines.push("ITEM 11: NJP AUTHORITY NOTIFICATION SIGNATURE");
    if (data.item11SignedDate) {
      lines.push(`  Signed: ${fmtStandard(data.item11SignedDate)}`);
      if (data.item11SignerName) {
        lines.push(`  Signer: ${data.item11SignerName}`);
      }
    } else {
      lines.push("  [Pending]");
    }
    lines.push("");

    // Item 12: Appeal intent
    lines.push("ITEM 12: APPEAL ELECTION");
    if (data.appealIntent) {
      const intentText =
        data.appealIntent === "INTENDS_TO_APPEAL" ? "INTENDS TO APPEAL" :
        data.appealIntent === "DOES_NOT_INTEND" ? "DOES NOT INTEND TO APPEAL" :
        data.appealIntent === "REFUSED_TO_SIGN" ? "REFUSED TO SIGN" :
        data.appealIntent;
      lines.push(`  ${intentText}`);
    } else {
      lines.push("  [Pending]");
    }
    if (data.item12SignedDate) {
      lines.push(`  Signed: ${fmtStandard(data.item12SignedDate)}`);
      if (data.item12SignerName) {
        lines.push(`  Signer: ${data.item12SignerName}`);
      }
    }
    lines.push("");
  }

  // Items 13-16: FINAL only
  if (version === "FINAL") {
    // Item 13: Appeal filed
    lines.push("ITEM 13: APPEAL FILED");
    if (data.appealNotFiled) {
      lines.push("  Appeal not filed");
    } else if (data.appealFiledDate) {
      lines.push(`  Filed: ${fmtStandard(data.appealFiledDate)}`);
    } else {
      lines.push("  [No record]");
    }
    lines.push("");

    // Item 14: Appeal authority decision
    lines.push("ITEM 14: APPEAL AUTHORITY DECISION");
    if (data.appealAuthorityName) {
      lines.push(`  Authority: ${data.appealAuthorityRank ? data.appealAuthorityRank + " " : ""}${data.appealAuthorityName}`);
      if (data.appealOutcome) {
        const outcomeText =
          data.appealOutcome === "DENIED" ? "DENIED" :
          data.appealOutcome === "DENIED_UNTIMELY" ? "DENIED (UNTIMELY)" :
          data.appealOutcome === "GRANTED_SET_ASIDE" ? "GRANTED - SET ASIDE" :
          data.appealOutcome === "PARTIAL_RELIEF" ? "PARTIAL RELIEF" :
          data.appealOutcome === "REDUCTION_SET_ASIDE_ONLY" ? "REDUCTION SET ASIDE ONLY" :
          data.appealOutcome;
        lines.push(`  Outcome: ${outcomeText}`);
      }
      if (data.appealOutcomeDetail) {
        lines.push(`  Detail: ${data.appealOutcomeDetail}`);
      }
      if (data.appealAuthoritySignedDate) {
        lines.push(`  Signed: ${fmtStandard(data.appealAuthoritySignedDate)}`);
      }
    } else if (data.appealNotFiled) {
      lines.push("  N/A - No appeal filed");
    } else {
      lines.push("  [Pending]");
    }
    lines.push("");

    // Item 15: Appeal decision notice
    lines.push("ITEM 15: NOTICE OF APPEAL DECISION");
    if (data.dateNoticeAppealDecision) {
      lines.push(`  Date: ${fmtStandard(data.dateNoticeAppealDecision)}`);
    } else if (data.appealNotFiled) {
      lines.push("  N/A");
    } else {
      lines.push("  [Pending]");
    }
    if (data.accusedTransferred) {
      lines.push("  Accused transferred: YES");
    }
    lines.push("");

    // Item 16: Admin completion
    lines.push("ITEM 16: ADMINISTRATIVE COMPLETION");
    if (data.item16SignedDate) {
      lines.push(`  Signed: ${fmtStandard(data.item16SignedDate)}`);
      if (data.item16SignerName) {
        lines.push(`  Signer: ${data.item16SignerName}`);
      }
    }
    if (data.item16UdNumber) {
      lines.push(`  UD Number: ${data.item16UdNumber}`);
    }
    if (data.item16Dtd) {
      lines.push(`  DTD: ${data.item16Dtd}`);
    }
    lines.push("");
  }

  // Item 21: Remarks (all versions for FINAL, limited otherwise)
  if (version === "FINAL" || (data.item21Entries && data.item21Entries.length > 0)) {
    lines.push("ITEM 21: REMARKS");
    if (data.item21Entries && data.item21Entries.length > 0) {
      for (const entry of data.item21Entries) {
        lines.push(`  ${fmtISO(entry.entryDate)} - ${entry.entryText}`);
      }
    } else {
      lines.push("  [No entries]");
    }
    lines.push("");
  }

  // Items 23-25: Repeat accused bio (all versions)
  lines.push("ITEMS 23-25: ACCUSED BIO DATA (REPEAT)");
  lines.push(
    `  Name: ${data.accusedLastName}, ${data.accusedFirstName} ${data.accusedMiddleName}`.trim()
  );
  lines.push(`  Rank/Grade: ${data.accusedRank} / ${data.accusedGrade}`);
  lines.push(`  EDIPI: ${data.accusedEdipi}`);
  lines.push("");

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("  CLASSIFICATION: CUI - PRIVACY SENSITIVE WHEN POPULATED");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
