/**
 * PDF Generator: SUSPECT'S RIGHTS ACKNOWLEDGEMENT / STATEMENT
 * JAGINST 5800.7G, CH-1 (JAGMAN 0175)
 *
 * This is the first form used in the NJP process to advise the accused
 * of their rights and record their acknowledgement before any questioning.
 */

import type { CaseData } from "../types";
import {
  createPdfContext, drawRightAligned, drawCentered, drawText,
  drawWrapped, drawLine, drawDualSignatureBlock, drawField,
  checkPage, LINE_HEIGHT, PARA_SPACING, MARGIN_LEFT, CONTENT_WIDTH, PDFContext,
} from "./pdfHelpers";
import { fmtStandard } from "../dateFormatters";

function headerBlock(ctx: PDFContext): void {
  drawRightAligned(ctx, "JAGINST 5800.7G, CH-1");
  ctx.y -= LINE_HEIGHT;
  drawRightAligned(ctx, "JAGMAN 0175");
  ctx.y -= LINE_HEIGHT * 2;

  drawCentered(ctx, "SUSPECT'S RIGHTS ACKNOWLEDGEMENT / STATEMENT", true);
  ctx.y -= LINE_HEIGHT * 2;
}

function sectionIdentification(ctx: PDFContext, data: CaseData): void {
  drawText(ctx, "SECTION I — IDENTIFICATION", 0, true);
  ctx.y -= LINE_HEIGHT;
  drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
  ctx.y -= LINE_HEIGHT + 2;

  const name = `${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;
  const rateRank = `${data.accusedGrade}/${data.accusedRank}`;
  const service = data.component === "ACTIVE" ? "USMC" : data.component;
  const today = fmtStandard(new Date().toISOString().split("T")[0]);

  drawField(ctx, "Name (Last, First MI):", name);
  drawField(ctx, "Rate/Rank:", rateRank);
  drawField(ctx, "Service:", service);
  drawField(ctx, "Activity/Unit:", data.accusedUnit);
  drawField(ctx, "Date:", today);
  ctx.y -= PARA_SPACING;
}

function sectionSuspectedOffenses(ctx: PDFContext, data: CaseData): void {
  checkPage(ctx, LINE_HEIGHT * 6);
  drawText(ctx, "SECTION II — SUSPECTED OFFENSES", 0, true);
  ctx.y -= LINE_HEIGHT;
  drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
  ctx.y -= LINE_HEIGHT + 2;

  drawWrapped(ctx, "You are suspected of the following offense(s) under the Uniform Code of Military Justice (UCMJ):");
  ctx.y -= PARA_SPACING;

  for (const o of data.offenses) {
    checkPage(ctx);
    drawWrapped(ctx, `${o.letter}. Violation of UCMJ, Article ${o.ucmjArticle}${o.offenseType ? ` (${o.offenseType})` : ""}${o.summary ? `: ${o.summary}` : ""}`, 18);
    ctx.y -= 2;
  }
  ctx.y -= PARA_SPACING;
}

function sectionYourRights(ctx: PDFContext, data: CaseData): void {
  checkPage(ctx, LINE_HEIGHT * 6);
  drawText(ctx, "SECTION III — YOUR RIGHTS", 0, true);
  ctx.y -= LINE_HEIGHT;
  drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
  ctx.y -= LINE_HEIGHT + 2;

  drawWrapped(ctx, "Before any questioning, you are advised of the following rights:");
  ctx.y -= PARA_SPACING;

  const rights = [
    "1. THE NATURE OF THE ACCUSATION(S): You have been informed of the nature of the offense(s) listed in Section II above.",
    "2. RIGHT TO REMAIN SILENT: You have the right to remain silent and make no statement at all. Any statement you do make, oral or written, may be used as evidence against you in a trial by court-martial or other judicial or administrative proceeding.",
    "3. RIGHT TO COUNSEL: You have the right to consult with a lawyer prior to any questioning. This lawyer may be a military lawyer provided at no cost to you, or a civilian lawyer obtained by you at your own expense, or both.",
    "4. RIGHT TO HAVE COUNSEL PRESENT: You have the right to have your lawyer present during this interview and all questioning. If you decide to answer questions without a lawyer present, you may stop the questioning at any time and request a lawyer.",
    `5. RIGHT TO DEMAND TRIAL BY COURT-MARTIAL: You have the right to demand trial by court-martial in lieu of accepting Non-Judicial Punishment under Article 15, UCMJ.${data.vesselException ? " (NOTE: Because you are attached to or embarked upon a vessel, you DO NOT have the right to refuse NJP and demand trial by court-martial under Article 15(a), UCMJ.)" : ""}`,
    "6. RIGHT TO A PERSONAL APPEARANCE: If NJP proceedings are initiated, you have the right to appear personally before the commanding officer.",
    "7. RIGHT TO PRESENT MATTERS: You have the right to present evidence and call witnesses on your behalf during the NJP hearing.",
    "8. RIGHT TO A SPOKESPERSON: You have the right to be accompanied by a spokesperson, who need not be a lawyer, during the hearing.",
    "9. RIGHT TO APPEAL: If punishment is imposed, you have the right to appeal within 5 calendar days of the punishment being imposed.",
  ];

  for (const r of rights) {
    checkPage(ctx, LINE_HEIGHT * 3);
    drawWrapped(ctx, r, 18);
    ctx.y -= PARA_SPACING;
  }
}

function sectionAcknowledgement(ctx: PDFContext, data: CaseData): void {
  checkPage(ctx, LINE_HEIGHT * 10);
  drawText(ctx, "SECTION IV — ACKNOWLEDGEMENT OF RIGHTS", 0, true);
  ctx.y -= LINE_HEIGHT;
  drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
  ctx.y -= LINE_HEIGHT + 2;

  const name = `${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;

  drawWrapped(ctx, `I, ${name}, have read or have had read to me my rights as stated above. I understand these rights and have had the opportunity to consult with a lawyer.`);
  ctx.y -= PARA_SPACING;

  drawWrapped(ctx, "______ I understand my rights and desire to make a statement.", 18);
  ctx.y -= 4;
  drawWrapped(ctx, "______ I understand my rights and do NOT desire to make a statement.", 18);
  ctx.y -= PARA_SPACING;

  checkPage(ctx, LINE_HEIGHT * 5);
  drawDualSignatureBlock(ctx, "(Signature of Accused)", "(Date)");
  ctx.y -= 2;
  drawDualSignatureBlock(ctx, "(Signature of Witness)", "(Date)");
  ctx.y -= PARA_SPACING;
}

function sectionStatement(ctx: PDFContext): void {
  checkPage(ctx, LINE_HEIGHT * 10);
  drawText(ctx, "SECTION V — STATEMENT (if applicable)", 0, true);
  ctx.y -= LINE_HEIGHT;
  drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
  ctx.y -= LINE_HEIGHT + 2;

  drawWrapped(ctx, "(Write statement below or attach additional pages as needed.)");
  ctx.y -= PARA_SPACING;

  // Blank lines for statement
  for (let i = 0; i < 8; i++) {
    checkPage(ctx);
    drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
    ctx.y -= LINE_HEIGHT + 4;
  }
  ctx.y -= PARA_SPACING;

  checkPage(ctx, LINE_HEIGHT * 5);
  drawDualSignatureBlock(ctx, "(Signature of Accused)", "(Date)");
  ctx.y -= 2;
  drawDualSignatureBlock(ctx, "(Signature of Interviewer)", "(Date)");
  ctx.y -= PARA_SPACING;
}

function sectionInterviewerCert(ctx: PDFContext, data: CaseData): void {
  checkPage(ctx, LINE_HEIGHT * 12);
  drawText(ctx, "SECTION VI — INTERVIEWER CERTIFICATION", 0, true);
  ctx.y -= LINE_HEIGHT;
  drawLine(ctx, MARGIN_LEFT, CONTENT_WIDTH);
  ctx.y -= LINE_HEIGHT + 2;

  const name = `${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;

  drawWrapped(ctx, `I certify that I have advised ${name} of the rights set forth above and that the accused has indicated understanding of these rights.`);
  ctx.y -= PARA_SPACING;

  drawField(ctx, "Interviewer Name:", undefined, 40);
  drawField(ctx, "Rate/Rank:", undefined, 20);
  drawField(ctx, "Service:", undefined, 20);
  drawField(ctx, "Organization:", undefined, 35);
  ctx.y -= PARA_SPACING;

  checkPage(ctx, LINE_HEIGHT * 5);
  drawDualSignatureBlock(ctx, "(Signature of Interviewer)", "(Date)");
}

/**
 * Generate the Suspect's Rights Acknowledgement / Statement PDF
 * JAGINST 5800.7G, CH-1 (JAGMAN 0175)
 */
export async function generateSuspectsRightsAckPdf(data: CaseData): Promise<Uint8Array> {
  const ctx = await createPdfContext();

  headerBlock(ctx);
  sectionIdentification(ctx, data);
  sectionSuspectedOffenses(ctx, data);
  sectionYourRights(ctx, data);
  sectionAcknowledgement(ctx, data);
  sectionStatement(ctx);
  sectionInterviewerCert(ctx, data);

  // Add JAGMAN 0175 footer to each page
  const pages = ctx.doc.getPages();
  for (const p of pages) {
    const label = "JAGMAN 0175";
    const w = ctx.font.widthOfTextAtSize(label, 10);
    p.drawText(label, {
      x: (612 - w) / 2,
      y: 40,
      size: 10,
      font: ctx.font,
    });
  }

  return ctx.doc.save();
}
