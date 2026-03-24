/**
 * PDF Form-Fill Generator: NAVMC 10132 (REV. 08-2023) — Unit Punishment Book
 *
 * Loads the official NAVMC 10132 PDF template and fills AcroForm fields
 * with collected case data. Supports PARTIAL (pre-hearing), HEARING,
 * and FINAL versions based on how much data is available.
 */

import { PDFDocument, PDFName, PDFDict, PDFNumber } from "pdf-lib";
import type { CaseData, Navmc10132Version } from "../types";
import { punishmentAbbreviated, punishmentFull } from "../punishmentText";
import { fmtStandard, fmtTitleCase, fmtISO } from "../dateFormatters";

/**
 * Strip the rich text (/RV) flag from a text field so pdf-lib can
 * read/write it without throwing RichTextFieldReadError.
 */
function stripRichText(form: ReturnType<PDFDocument["getForm"]>, name: string): void {
  try {
    const field = form.getTextField(name);
    const dict = (field as unknown as { acroField: { dict: PDFDict } }).acroField.dict;
    // Remove /RV (rich value) entry
    dict.delete(PDFName.of("RV"));
    // Clear the rich text bit (bit 26) from /Ff flags if present
    const ffRef = dict.get(PDFName.of("Ff"));
    if (ffRef) {
      const ff = (ffRef as unknown as { numberValue: number }).numberValue ?? 0;
      const RICH_TEXT_BIT = 1 << 25; // 0-indexed bit 25 = bit position 26
      if (ff & RICH_TEXT_BIT) {
        const { PDFNumber } = require("pdf-lib");
        dict.set(PDFName.of("Ff"), PDFNumber.of(ff & ~RICH_TEXT_BIT));
      }
    }
  } catch {
    // Field not found — skip
  }
}

// Template PDF path — served from public/ directory (must include basePath for static export)
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/LegalFlow";
const TEMPLATE_PATH = `${BASE_PATH}/forms/NAVMC_10132.pdf`;

/**
 * Map a UCMJ article string (e.g. "86") to the closest dropdown option
 * in the form (e.g. "Art. 86  Absence without leave").
 */
function matchArticleOption(
  ucmjArticle: string,
  offenseType: string,
  options: string[]
): string {
  // New format: ucmjArticle is the full PDF option string (e.g. "Art. 86  Absence without leave")
  if (options.includes(ucmjArticle)) return ucmjArticle;

  // Legacy format: ucmjArticle is just the number (e.g. "86")
  const artPrefix = `Art. ${ucmjArticle}`;

  // Try match with offense type
  if (offenseType) {
    const typeNorm = offenseType.toLowerCase();
    const exact = options.find((o) => {
      const oLower = o.toLowerCase();
      return oLower.startsWith(artPrefix.toLowerCase()) && oLower.includes(typeNorm);
    });
    if (exact) return exact;
  }

  // Fall back to first matching article number
  const artMatch = options.find((o) => o.startsWith(artPrefix));
  if (artMatch) return artMatch;

  return "";
}

/**
 * Map our victim status values to the form's dropdown options.
 */
function mapVictimStatus(status: string): string {
  const map: Record<string, string> = {
    "Military": "Military",
    "Military Spouse": "Military (spouse)",
    "Civilian Spouse": "Civilian (spouse)",
    "Civilian Dependent": "Civilian (dependent)",
    "DON Employee": "Civilian (DON employee)",
    "Civilian": "Civilian (other)",
    "Other": "Other",
    "Unknown": "Unknown",
  };
  return map[status] || status;
}

/**
 * Map our appeal intent to the form dropdown value.
 */
function mapAppealIntent(intent: string): string {
  switch (intent) {
    case "INTENDS_TO_APPEAL": return "I do intend to appeal.";
    case "DOES_NOT_INTEND": return "I do not intend to appeal.";
    case "REFUSED_TO_SIGN": return "the accused refuses to sign.";
    default: return " ";
  }
}

/**
 * Map our election to the form dropdown value.
 */
function mapDemand(accepted?: boolean, vesselException?: boolean): string {
  if (vesselException) {
    return "I cannot demand trial because I am attached to or embarked upon a vessel.";
  }
  if (accepted === true) {
    return "I do not demand trial and will accept non-judicial punishment, subject to my right of appeal.";
  }
  if (accepted === false) {
    return "I demand trial and refuse non-judicial punishment.";
  }
  return "";
}

/**
 * Build the punishment text for Item 6.
 */
function buildPunishmentText(data: CaseData): string {
  if (data.punishmentText) return data.punishmentText;
  if (!data.item6Punishments || data.item6Punishments.length === 0) return "";
  return data.item6Punishments.map((p) => punishmentAbbreviated(p)).join("; ");
}

/**
 * Build suspension text for Item 7.
 */
function buildSuspensionText(data: CaseData): string {
  if (data.item7SuspensionDetails) return data.item7SuspensionDetails;

  const suspended = data.item6Punishments.filter((p) => p.suspended);
  if (suspended.length === 0) return "";

  const parts = suspended.map((p) => {
    const desc = punishmentAbbreviated(p);
    const mo = p.suspensionMonths ? ` susp ${p.suspensionMonths} mos` : " susp";
    return `${desc}${mo}`;
  });

  let text = parts.join("; ");
  if (data.item7SuspensionStartDate && data.item7SuspensionEndDate) {
    text += ` (${fmtStandard(data.item7SuspensionStartDate)} to ${fmtStandard(data.item7SuspensionEndDate)})`;
  }
  if (data.item7RemissionTerms) {
    text += `. Remission terms: ${data.item7RemissionTerms}`;
  }
  return text;
}

/**
 * Build appeal decision text for Item 14.
 */
function mapAppealOutcome(outcome?: string): string {
  switch (outcome) {
    case "DENIED": return "I have considered this appeal and deny relief.";
    case "GRANTED": return "I have considered this appeal and grant relief as follows:";
    // Legacy values
    case "DENIED_UNTIMELY": return "Denied (untimely)";
    case "GRANTED_SET_ASIDE": return "I have considered this appeal and grant relief as follows:";
    case "PARTIAL_RELIEF": return "I have considered this appeal and grant relief as follows:";
    case "REDUCTION_SET_ASIDE_ONLY": return "I have considered this appeal and grant relief as follows:";
    default: return outcome || "";
  }
}

/**
 * Safely set a text field, ignoring errors if field doesn't exist.
 */
function setText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try {
    const field = form.getTextField(name);
    field.setText(value || "");
  } catch {
    // Field not found — skip
  }
}

/**
 * Safely set a dropdown field, ignoring errors.
 */
function setDropdown(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string): void {
  try {
    const field = form.getDropdown(name);
    if (value) {
      // Verify the value is a valid option
      const options = field.getOptions();
      if (options.includes(value)) {
        field.select(value);
      }
    }
  } catch {
    // Field not found — skip
  }
}

/**
 * Safely set a checkbox field.
 */
function setCheckbox(form: ReturnType<PDFDocument["getForm"]>, name: string, checked: boolean): void {
  try {
    const field = form.getCheckBox(name);
    if (checked) field.check();
    else field.uncheck();
  } catch {
    // Field not found — skip
  }
}

/**
 * Get dropdown options for a field (for article matching).
 */
function getDropdownOptions(form: ReturnType<PDFDocument["getForm"]>, name: string): string[] {
  try {
    return form.getDropdown(name).getOptions();
  } catch {
    return [];
  }
}

export async function fillNavmc10132Pdf(
  data: CaseData,
  version: Navmc10132Version = "PARTIAL"
): Promise<Uint8Array> {
  // Load the template PDF
  const templateResponse = await fetch(TEMPLATE_PATH);
  if (!templateResponse.ok) {
    throw new Error(`Failed to load NAVMC 10132 template: ${templateResponse.status}`);
  }
  const templateBytes = await templateResponse.arrayBuffer();
  const pdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdf.getForm();

  // ═══ Items 17-20: Accused Information (all versions) ═══
  setText(form, "17 UNIT", data.accusedUnit);
  const fullName = `${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;
  setText(form, "18 ACCUSED FULL NAME", fullName);
  setText(form, "19 ACCUSED RANK/GRADE", `${data.accusedRank} / ${data.accusedGrade}`);
  setText(form, "20 ACCUSED EDIPI", data.accusedEdipi);

  // Items 23-25: Repeat accused bio (page 2/3)
  setText(form, "23 ACCUSED FULL NAME", fullName);
  setText(form, "24 ACCUSED RANK/GRADE", `${data.accusedRank} / ${data.accusedGrade}`);
  setText(form, "25 ACCUSED EDIPI", data.accusedEdipi);

  // ═══ Item 1: Offenses (all versions) ═══
  const offenseLetters = ["A", "B", "C", "D", "E"];
  const articleOptions = getDropdownOptions(form, "1A ARTICLE");

  for (let i = 0; i < Math.min(data.offenses.length, 5); i++) {
    const o = data.offenses[i];
    const letter = offenseLetters[i];

    // Skip empty offenses to preserve the template's default underline appearance
    if (!o.ucmjArticle && !o.summary) continue;

    // Article dropdown
    const articleValue = matchArticleOption(o.ucmjArticle, o.offenseType, articleOptions);
    if (articleValue) setDropdown(form, `1${letter} ARTICLE`, articleValue);

    // Summary text
    const summaryParts = [o.summary].filter(Boolean);
    if (o.offenseDate) summaryParts.push(`On or about ${o.offenseDate}${o.offenseTime ? ` at ${o.offenseTime}` : ""}${o.toDate && o.toDate !== o.offenseDate ? ` through ${o.toDate}${o.toTime ? ` at ${o.toTime}` : ""}` : ""}`);
    if (o.offensePlace) summaryParts.push(`at ${o.offensePlace}`);
    if (summaryParts.length > 0) setText(form, `1${letter} SUMMARY`, summaryParts.join(". "));

    // Findings (HEARING and FINAL only)
    if (version !== "PARTIAL" && o.finding) {
      setDropdown(form, `1${letter} FINDING`, o.finding === "G" ? "G" : "NG");
    }

    // Item 22: Victim demographics
    if (o.victims && o.victims.length > 0) {
      const v = o.victims[0]; // One victim per offense slot
      setDropdown(form, `22${letter} VICTIM STATUS`, mapVictimStatus(v.status));
      setDropdown(form, `22${letter} VICTIM SEX`, v.sex || "Unknown");
      setDropdown(form, `22${letter} VICTIM RACE`, v.race || "Unknown");
      setDropdown(form, `22${letter} VICTIM ETHNICITY`, v.ethnicity || "Unknown");
    }
  }

  // ═══ Item 2: Rights Advisement & Election (HEARING and FINAL) ═══
  if (version !== "PARTIAL") {
    setDropdown(form, "2 DEMAND", mapDemand(data.item2ElectionAccepted, data.vesselException));
    setDropdown(form, "2 COUNSELOPP", data.item2CounselConsulted ? "   have" : "have not");
    setCheckbox(form, "2 ACC REFUSE TO SIGN", !!data.item2RefusalNoted);

    if (data.item2SignedDate) {
      setText(form, "2 ACC ELECTION AND RIGHTS DATE_af_date", fmtISO(data.item2SignedDate));
    }
  }

  // ═══ Item 3: CO Certification (HEARING and FINAL) ═══
  if (version !== "PARTIAL" && data.item3SignedDate) {
    setText(form, "3 RIGHTS ATTEST DATE_af_date", fmtISO(data.item3SignedDate));
  }

  // ═══ Item 4: UA/Desertion (HEARING and FINAL) ═══
  if (version !== "PARTIAL" && data.uaApplicable) {
    const uaText = [
      data.uaPeriodStart && data.uaPeriodEnd
        ? `UA period: ${fmtStandard(data.uaPeriodStart)} to ${fmtStandard(data.uaPeriodEnd)}`
        : "",
      data.desertionMarks ? `Desertion marks: ${data.desertionMarks}` : "",
    ].filter(Boolean).join(". ");
    setText(form, "4 CURRENT UAS OVER 24 HRS AND MARKS OF DESERTION", uaText);
  }

  // ═══ Item 6: Punishment (HEARING and FINAL) ═══
  // ═══ Item 7: Suspension (HEARING and FINAL) ═══
  // If either text overflows the form field, use "See supplemental page"
  // and append the full text to Item 21 remarks.
  const FIELD_MAX_LENGTH = 90;
  const supplementalEntries: { entryDate: string; entryText: string }[] = [];

  if (version !== "PARTIAL") {
    const punishmentText = buildPunishmentText(data);
    // Item 6: punishment text only — date goes in separate field
    if (punishmentText.length > FIELD_MAX_LENGTH) {
      setText(form, "6 PUNISHMENT IMPOSED", "See supplemental page");
      supplementalEntries.push({
        entryDate: data.item6Date || data.njpDate || new Date().toISOString().split("T")[0],
        entryText: `Item 6 - Punishment Imposed: ${punishmentText}`,
      });
    } else {
      setText(form, "6 PUNISHMENT IMPOSED", punishmentText);
    }
    // Date in separate field
    const item6DateStr = data.item6Date || data.njpDate || "";
    if (item6DateStr) {
      setText(form, "6 PUNISHMENT IMPOSITION DATE", fmtISO(item6DateStr));
    }
  }

  if (version !== "PARTIAL") {
    const suspensionText = buildSuspensionText(data);
    // Item 7: suspension text with remission clause — no date
    let item7Full: string;
    if (!suspensionText) {
      item7Full = "NONE";
    } else {
      item7Full = `${suspensionText}, at which time unless sooner vac, red will be remitted w/o further action.`;
    }
    if (item7Full.length > FIELD_MAX_LENGTH) {
      setText(form, "7 SUSPENSION IF ANY", "See supplemental page");
      supplementalEntries.push({
        entryDate: data.item6Date || data.njpDate || new Date().toISOString().split("T")[0],
        entryText: `Item 7 - Suspension: ${item7Full}`,
      });
    } else {
      setText(form, "7 SUSPENSION IF ANY", item7Full);
    }
  }

  // ═══ Items 8-8B: NJP Authority (HEARING and FINAL) ═══
  if (version !== "PARTIAL") {
    const authParts = [
      data.njpAuthorityName || "",
      data.njpAuthorityTitle || "",
    ].filter(Boolean).join(", ");
    setText(form, "8 NJP AUTHORITY NAME TITLE SERVICE", authParts);
    setText(form, "8A NJP AUTHORITY GRADE", [data.njpAuthorityRank, data.njpAuthorityGrade].filter(Boolean).join("/") || "");
    if (data.njpAuthorityEdipi) {
      setText(form, "8B NJP AUTHORITY EDIPI", data.njpAuthorityEdipi);
    }
  }

  // ═══ Item 10: Date of Notice (HEARING and FINAL) ═══
  if (version !== "PARTIAL" && data.dateNoticeToAccused) {
    setText(form, "10 DATE OF DISPOSITION NOTICE", fmtISO(data.dateNoticeToAccused));
  }

  // ═══ Item 11: Appeal Advisement Date (HEARING and FINAL) ═══
  if (version !== "PARTIAL" && data.item11SignedDate) {
    setText(form, "11 APPEAL ADVISEMENT DATE_af_date", fmtISO(data.item11SignedDate));
  }

  // ═══ Item 12: Appeal Intent (HEARING and FINAL) ═══
  if (version !== "PARTIAL" && data.appealIntent) {
    setDropdown(form, "12 INTEND APPEAL", mapAppealIntent(data.appealIntent));
    if (data.item12SignedDate) {
      setText(form, "12 APPEAL INTENT DATE_af_date", fmtISO(data.item12SignedDate));
    }
  }

  // ═══ Items 13-16: FINAL only ═══
  if (version === "FINAL") {
    // Item 13: Appeal filed
    if (data.appealNotFiled) {
      setCheckbox(form, "13 NOT APPEALED", true);
    } else if (data.appealFiledDate) {
      setText(form, "13 DATE OF APPEAL IF ANY_af_date", fmtISO(data.appealFiledDate));
    }

    // Item 14: Appeal authority decision
    if (data.appealOutcome) {
      setText(form, "14 APPEAL DECISION", mapAppealOutcome(data.appealOutcome));
    }
    if (data.appealAuthoritySignedDate) {
      setText(form, "14 APPEAL DECISION DATE_af_date", fmtISO(data.appealAuthoritySignedDate));
    }

    // Item 15: Notice of appeal decision
    if (data.dateNoticeAppealDecision) {
      setText(form, "15 DATE OF NOTICE OF APPEAL DECISION_af_date", fmtISO(data.dateNoticeAppealDecision));
    }

    // Item 16: Admin completion
    if (data.item16UdNumber) {
      setText(form, "16 FINAL ADMIN UD", data.item16UdNumber);
    }
    if (data.item16Dtd) {
      setText(form, "16 FINAL ADMIN DTD", fmtISO(data.item16Dtd));
    }
  }

  // ═══ Item 21: Remarks (all versions if entries exist) ═══
  // The "21 REMARKS" field is a rich text field in the template;
  // strip the /RV flag so pdf-lib can set text and flatten without error.
  stripRichText(form, "21 REMARKS");
  const allItem21Entries = [...(data.item21Entries || []), ...supplementalEntries];
  if (allItem21Entries.length > 0) {
    const remarks = allItem21Entries
      .map((e) => `${fmtStandard(e.entryDate)} - ${e.entryText}`)
      .join("\n");
    setText(form, "21 REMARKS", remarks);
  }

  // ═══ Booker statement (Item 2 area) ═══
  if (version !== "PARTIAL") {
    if (data.vesselException) {
      setText(form, "2 BOOKER", "(No Booker statement due to the vessel exception, United States v. Mack, 9 M.J. 300, 320 (C.M.A. 1980).)");
    } else if (data.item2ElectionAccepted === true) {
      setText(form, "2 BOOKER", "BOOKER STATEMENT: Having been advised of the above and fully understanding my rights, I choose to accept NJP.");
    } else if (data.item2ElectionAccepted === false) {
      setText(form, "2 BOOKER", "(No Booker statement due to refusal of NJP.)");
    }
  }

  // Generate appearance streams for all fields so the visual output
  // is deterministic regardless of the PDF viewer used.
  form.updateFieldAppearances();

  // Flatten form to prevent further editing (for FINAL version)
  // Flattening converts form fields to static text, removing field boxes
  if (version === "FINAL") {
    form.flatten();
  }

  return pdf.save();
}
