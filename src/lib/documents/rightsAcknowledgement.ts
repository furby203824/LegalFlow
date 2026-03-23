import type { CaseData } from "./types";
import { fmtStandard } from "./dateFormatters";

/**
 * Generates Suspect's Rights Acknowledgement / Statement form
 * Based on JAGINST 5800.7G, CH-1 (JAGMAN 0175)
 */
export function generateRightsAcknowledgement(data: CaseData): string {
  const name = `${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;
  const rateRank = `${data.accusedGrade}/${data.accusedRank}`;
  const today = fmtStandard(new Date().toISOString().split("T")[0]);

  const offensesList = data.offenses
    .map((o) => `     ${o.letter}. Violation of UCMJ, Article ${o.ucmjArticle}${o.offenseType ? ` (${o.offenseType})` : ""}${o.summary ? `: ${o.summary}` : ""}`)
    .join("\n");

  const vesselNote = data.vesselException
    ? `NOTE: Because you are attached to or embarked upon a vessel, you DO NOT
      have the right to refuse NJP and demand trial by court-martial under
      Article 15(a), UCMJ.`
    : "";

  return `
================================================================================
              SUSPECT'S RIGHTS ACKNOWLEDGEMENT / STATEMENT
                    JAGINST 5800.7G, CH-1 (JAGMAN 0175)
================================================================================

SECTION I — IDENTIFICATION
--------------------------------------------------------------------------------
  Name (Last, First MI):  ${name}
  Rate/Rank:              ${rateRank}
  Service:                ${data.component === "ACTIVE" ? "USMC" : data.component}
  Activity/Unit:          ${data.accusedUnit}
  Date:                   ${today}

SECTION II — SUSPECTED OFFENSES
--------------------------------------------------------------------------------
  You are suspected of the following offense(s) under the Uniform Code of
  Military Justice (UCMJ):

${offensesList}

SECTION III — YOUR RIGHTS
--------------------------------------------------------------------------------
  Before any questioning, you are advised of the following rights:

  1. THE NATURE OF THE ACCUSATION(S): You have been informed of the nature
     of the offense(s) listed in Section II above.

  2. RIGHT TO REMAIN SILENT: You have the right to remain silent and make
     no statement at all. Any statement you do make, oral or written, may
     be used as evidence against you in a trial by court-martial or other
     judicial or administrative proceeding.

  3. RIGHT TO COUNSEL: You have the right to consult with a lawyer prior
     to any questioning. This lawyer may be a military lawyer provided at
     no cost to you, or a civilian lawyer obtained by you at your own
     expense, or both.

  4. RIGHT TO HAVE COUNSEL PRESENT: You have the right to have your lawyer
     present during this interview and all questioning. If you decide to
     answer questions without a lawyer present, you may stop the questioning
     at any time and request a lawyer.

  5. RIGHT TO DEMAND TRIAL BY COURT-MARTIAL: You have the right to demand
     trial by court-martial in lieu of accepting Non-Judicial Punishment
     under Article 15, UCMJ.${data.vesselException ? " (SEE NOTE BELOW)" : ""}

  6. RIGHT TO A PERSONAL APPEARANCE: If NJP proceedings are initiated, you
     have the right to appear personally before the commanding officer.

  7. RIGHT TO PRESENT MATTERS: You have the right to present evidence and
     call witnesses on your behalf during the NJP hearing.

  8. RIGHT TO A SPOKESPERSON: You have the right to be accompanied by a
     spokesperson, who need not be a lawyer, during the hearing.

  9. RIGHT TO APPEAL: If punishment is imposed, you have the right to
     appeal within 5 calendar days of the punishment being imposed.

${vesselNote}

SECTION IV — ACKNOWLEDGEMENT OF RIGHTS
--------------------------------------------------------------------------------
  I, ${name}, have read or have had read to me my rights as stated
  above. I understand these rights and have had the opportunity to consult
  with a lawyer.

  ☐  I understand my rights and desire to make a statement.
  ☐  I understand my rights and do NOT desire to make a statement.

  ____________________________________     _______________
  Signature of Accused                     Date

  ____________________________________     _______________
  Signature of Witness                     Date


SECTION V — STATEMENT (if applicable)
--------------------------------------------------------------------------------
  (Write statement below or attach additional pages as needed.)








  ____________________________________     _______________
  Signature of Accused                     Date

  ____________________________________     _______________
  Signature of Interviewer                 Date


SECTION VI — INTERVIEWER CERTIFICATION
--------------------------------------------------------------------------------
  I certify that I have advised ${name} of the rights set
  forth above and that the accused has indicated understanding of these rights.

  Interviewer Name: ____________________________________

  Rate/Rank: ________________  Service: ________________

  Organization: _________________________________________

  ____________________________________     _______________
  Signature of Interviewer                 Date

================================================================================
                         END OF RIGHTS ACKNOWLEDGEMENT
================================================================================
`.trim();
}
