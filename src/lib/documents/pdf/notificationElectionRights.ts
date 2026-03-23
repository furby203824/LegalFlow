/**
 * PDF Generator: NONJUDICIAL PUNISHMENT ACCUSED'S NOTIFICATION AND ELECTION OF RIGHTS
 * JAGINST 5800.7G, CH-2
 * Two variants: A-1-d (vessel exception does NOT apply) and A-1-c (vessel exception DOES apply)
 */

import { rgb } from "pdf-lib";
import type { CaseData } from "../types";
import { maxPunishmentByGrade } from "../punishmentText";
import {
  createPdfContext, drawRightAligned, drawCentered, drawText,
  drawWrapped, drawCheckboxLine, drawDualSignatureBlock,
  drawAppendix, checkPage, addPage, drawLine,
  LINE_HEIGHT, PARA_SPACING, MARGIN_LEFT, CONTENT_WIDTH, PDFContext,
} from "./pdfHelpers";

function headerBlock(ctx: PDFContext, vesselApplies: boolean): void {
  const appendix = vesselApplies ? "A-1-c" : "A-1-d";

  drawRightAligned(ctx, "JAGINST 5800.7G, CH-2");
  ctx.y -= LINE_HEIGHT;
  drawRightAligned(ctx, appendix);
  ctx.y -= LINE_HEIGHT * 2;

  drawCentered(ctx, "NONJUDICIAL PUNISHMENT", true);
  ctx.y -= LINE_HEIGHT;
  drawCentered(ctx, "ACCUSED'S NOTIFICATION AND ELECTION OF RIGHTS", true);
  ctx.y -= LINE_HEIGHT;
  if (vesselApplies) {
    drawCentered(ctx, "VESSEL EXCEPTION DOES APPLY", true);
  } else {
    drawCentered(ctx, "VESSEL EXCEPTION DOES NOT APPLY", true);
  }
  ctx.y -= LINE_HEIGHT;
  drawCentered(ctx, "(See JAGMAN 0108 and 0109)");
  ctx.y -= LINE_HEIGHT * 2;
}

function identificationBlock(ctx: PDFContext, data: CaseData): void {
  const name = `${data.accusedRank} ${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;

  drawWrapped(ctx, `Notification and election of rights concerning the contemplated imposition of nonjudicial punishment (NJP) in the case of ${name}, assigned or attached to ${data.accusedUnit}.`);
  ctx.y -= PARA_SPACING;
}

function notificationSection(ctx: PDFContext, data: CaseData, vesselApplies: boolean): void {
  drawCentered(ctx, "NOTIFICATION", true);
  ctx.y -= LINE_HEIGHT + PARA_SPACING;

  // Paragraph 1: Alleged offenses
  drawWrapped(ctx, "1.  In accordance with the requirements of paragraph 4 of Part V, MCM, [insert current edition], you are hereby notified that the commanding officer is considering imposing nonjudicial punishment on you because of the following alleged offenses:");
  ctx.y -= PARA_SPACING;

  // Fill in offenses
  for (const o of data.offenses) {
    checkPage(ctx);
    drawWrapped(ctx, `Violation of UCMJ, Article ${o.ucmjArticle}${o.offenseType ? ` (${o.offenseType})` : ""}: ${o.summary}`, 36);
    ctx.y -= 2;
  }
  ctx.y -= PARA_SPACING;

  // Paragraph 2: Basis of allegations
  drawWrapped(ctx, "2.  The allegations against you are based on the following information:");
  ctx.y -= PARA_SPACING;

  // Summary lines for each offense
  for (const o of data.offenses) {
    checkPage(ctx);
    drawWrapped(ctx, `On or about ${o.offenseDate}${o.offenseTime ? ` at ${o.offenseTime}` : ""}${o.toDate && o.toDate !== o.offenseDate ? ` through ${o.toDate}${o.toTime ? ` at ${o.toTime}` : ""}` : ""}${o.offensePlace ? `, at ${o.offensePlace}` : ""}, ${o.summary}`, 36);
    ctx.y -= 2;
  }
  ctx.y -= PARA_SPACING;

  if (vesselApplies) {
    notificationVesselApplies(ctx, data);
  } else {
    notificationVesselDoesNotApply(ctx, data);
  }
}

function notificationVesselDoesNotApply(ctx: PDFContext, data: CaseData): void {
  // Paragraph 3: Refusal right
  const maxPunishments = maxPunishmentByGrade(data.commanderGradeLevel);

  drawWrapped(ctx, "3.  Refusal.  You have the right to refuse NJP and request trial by court-martial in lieu of NJP.  If you refuse NJP, charges could be referred for trial by summary, special, or general court-martial.  If charges are referred to trial by summary court-martial, you may not be tried by summary court-martial over your objection.  If charges are referred to a court-martial, you may have the right to be represented by counsel.  Regardless of whether you accept or refuse NJP, you could be processed for administrative separation based on your misconduct.  The maximum punishment that could be imposed if you accept NJP is:");
  ctx.y -= PARA_SPACING;

  for (const p of maxPunishments) {
    checkPage(ctx);
    drawText(ctx, p, 18);
    ctx.y -= LINE_HEIGHT;
  }
  ctx.y -= PARA_SPACING;

  // Paragraph 4: Personal appearance
  personalAppearanceSection(ctx, "4");
}

function notificationVesselApplies(ctx: PDFContext, data: CaseData): void {
  // No refusal right — go straight to personal appearance as para 3
  personalAppearanceSection(ctx, "3");
}

function personalAppearanceSection(ctx: PDFContext, paraNum: string): void {
  checkPage(ctx, LINE_HEIGHT * 6);
  drawWrapped(ctx, `${paraNum}.  Personal Appearance.  You may request a personal appearance before the commanding officer or you may waive this right.`);
  ctx.y -= PARA_SPACING;

  // 4a / 3a: Waived
  drawWrapped(ctx, `a.  Personal appearance waived.  If you waive your right to appear personally before the commanding officer, you will have the right to submit any written matters you desire for the commanding officer's consideration in determining whether or not you committed the offenses alleged, and, if so, in determining an appropriate punishment.  You are hereby informed that you have the right to remain silent and that anything you do submit for consideration may be used against you in a trial by court-martial.`, 18);
  ctx.y -= PARA_SPACING;

  // 4b / 3b: Requested
  drawWrapped(ctx, `b.  Personal appearance requested.  If you exercise your right to appear personally before the commanding officer, you will be entitled to the following rights at the proceeding:`, 18);
  ctx.y -= PARA_SPACING;

  const rights = [
    "(1)  To be informed of your rights under Article 31, UCMJ;",
    "(2)  To be informed of the information against you relating to the offenses alleged;",
    "(3)  To be accompanied by a spokesperson provided or arranged by you.  A spokesperson is not entitled to travel or similar expenses, and the proceedings will not be delayed to permit the presence of a spokesperson.  The spokesperson may speak on your behalf, but may not question witnesses except as the commanding officer may permit as a matter of discretion.  The spokesperson need not be a lawyer;",
    "(4)  To be permitted to examine documents or physical objects considered as evidence against you that the commanding officer has examined in the case and on which the commanding officer intends to rely in deciding whether and how much NJP to impose;",
    "(5)  To present matters in defense, extenuation, and mitigation orally, in writing, or both;",
    "(6)  To have witnesses attend the proceeding, including those who may offer testimony or evidence against you, if their statements will be relevant and the witness(es) are reasonably available.  A witness is not reasonably available if the witness requires reimbursement by the United States for any cost incurred in appearing, cannot appear without unduly delaying the proceedings, or if a military witness, cannot be excused from other important duties; and",
    "(7)  To have the proceedings open to the public unless the commanding officer determines that the proceedings should be closed for good cause.  However, this does not require that special arrangements be made to facilitate access to the proceeding.",
  ];

  for (const r of rights) {
    checkPage(ctx, LINE_HEIGHT * 3);
    drawWrapped(ctx, r, 36);
    ctx.y -= 4;
  }
  ctx.y -= PARA_SPACING;

  // Consult with lawyer paragraph
  const consultParaNum = paraNum === "4" ? "5" : "4";
  checkPage(ctx, LINE_HEIGHT * 4);
  drawWrapped(ctx, `${consultParaNum}.  Consult with a Lawyer.  In order to help you decide whether or not to exercise any of the rights explained above, you may obtain the advice of a lawyer before any decision.  If you wish to consult with a lawyer, when operationally feasible, a military lawyer will be made available to you, either in person or by telephone, free of charge, or you may obtain advice from a civilian lawyer at your own expense.  Consultation with a lawyer shall not unreasonably delay NJP proceedings.`);
  ctx.y -= LINE_HEIGHT + PARA_SPACING;
}

function electionSection(ctx: PDFContext, data: CaseData, vesselApplies: boolean): void {
  checkPage(ctx, LINE_HEIGHT * 6);
  drawCentered(ctx, "ELECTION OF RIGHTS", true);
  ctx.y -= LINE_HEIGHT + PARA_SPACING;

  const electionParaNum = vesselApplies ? "5" : "6";
  const throughNum = vesselApplies ? "4" : "5";

  drawWrapped(ctx, `${electionParaNum}.  Knowing and understanding all of my rights as set forth in paragraphs 1 through ${throughNum} above, my desires are as follows:`);
  ctx.y -= PARA_SPACING;

  // a. Lawyer
  drawText(ctx, "a.  Lawyer.  (Check one or more, as applicable)", 18, true);
  ctx.y -= LINE_HEIGHT + 4;

  drawCheckboxLine(ctx, "I wish to consult with a military lawyer before completing the remainder of this form.", 18);
  ctx.y -= 4;
  drawCheckboxLine(ctx, "I wish to consult with a civilian lawyer before completing the remainder of this form.", 18);
  ctx.y -= 4;
  drawCheckboxLine(ctx, "I hereby voluntarily, knowingly, and intelligently give up my right to consult with a lawyer.", 18);
  ctx.y -= 4;
  drawWrapped(ctx, "__________ Consultation with a lawyer was not operationally feasible.  (Note: This provision shall only be checked by authorized command personnel, based on military exigency.  Under JAGMAN 0109b, a record of NJP imposed without the opportunity to consult with a lawyer may not be used as evidence in aggravation during the sentencing proceedings of a later court-martial of the accused for other offenses.)", 18);
  ctx.y -= PARA_SPACING;

  // First signature block (lawyer election)
  checkPage(ctx, LINE_HEIGHT * 5);
  drawDualSignatureBlock(ctx, "(Signature of witness)", "(Signature of Accused)");
  ctx.y -= PARA_SPACING;

  // Note about consulting
  drawWrapped(ctx, "(Note: If the accused wishes to consult with a lawyer, and the consultation is operationally feasible, the remainder of this form will not be completed until the accused has been given a reasonable opportunity to do so.)", 18);
  ctx.y -= PARA_SPACING;

  // Consulted line
  drawWrapped(ctx, "_____ I consulted with _________________________________, a lawyer, on __________________________________.", 18);
  ctx.y -= PARA_SPACING;

  // Second signature block
  checkPage(ctx, LINE_HEIGHT * 5);
  drawDualSignatureBlock(ctx, "(Signature of witness)", "(Signature of Accused)");
  ctx.y -= PARA_SPACING;

  // b. Right to refuse NJP (only for non-vessel)
  if (!vesselApplies) {
    refusalElection(ctx);
  }

  // c (or b for vessel). Personal appearance
  const paLetter = vesselApplies ? "b" : "c";
  checkPage(ctx, LINE_HEIGHT * 8);
  drawText(ctx, `${paLetter}.  Personal appearance.  (Check one)`, 18, true);
  ctx.y -= LINE_HEIGHT + 4;

  drawCheckboxLine(ctx, "I request a personal appearance before the commanding officer.", 18);
  ctx.y -= 4;

  if (vesselApplies) {
    drawCheckboxLine(ctx, "I waive my right to a personal appearance.  (Check one below)", 18);
  } else {
    drawCheckboxLine(ctx, "I waive my right to personal appearance.", 18);
  }
  ctx.y -= 4;

  drawCheckboxLine(ctx, "I do not desire to submit any written matters for consideration.", 18);
  ctx.y -= 4;

  drawWrapped(ctx, "________ I desire to submit written matters for consideration by the NJP authority.  Written matters are/are not (circle one) attached.", 18);
  ctx.y -= PARA_SPACING;

  // d (or c for vessel). Elections at personal appearance
  const epLetter = vesselApplies ? "c" : "d";
  checkPage(ctx, LINE_HEIGHT * 8);
  drawText(ctx, `${epLetter}.  Elections at personal appearance.  (Check and complete as applicable)`, 18, true);
  ctx.y -= LINE_HEIGHT + 4;

  drawWrapped(ctx, "________ I request that the following witnesses be present at my NJP proceeding:", 18);
  ctx.y -= 4;

  // Witness blank lines
  for (let i = 0; i < 5; i++) {
    checkPage(ctx);
    const halfW = CONTENT_WIDTH / 2;
    drawLine(ctx, MARGIN_LEFT + 36, halfW);
    ctx.y -= LINE_HEIGHT + 2;
  }
  ctx.y -= 4;

  drawCheckboxLine(ctx, "I request that my nonjudicial punishment proceeding be open to the public.", 18);
  ctx.y -= PARA_SPACING;

  // Final signature block with names
  const accusedName = `${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;
  checkPage(ctx, LINE_HEIGHT * 6);
  drawDualSignatureBlock(ctx, "(Signature of Accused and Date)", "(Signature of Witness and Date)");

  // Name lines
  const halfW = CONTENT_WIDTH / 2 - 10;
  drawLine(ctx, MARGIN_LEFT, halfW);
  drawLine(ctx, MARGIN_LEFT + halfW + 20, halfW);
  ctx.y -= LINE_HEIGHT;
  drawText(ctx, "(Name of Accused)", 0);
  const nlabel = "(Name of witness)";
  const nlw = ctx.font.widthOfTextAtSize(nlabel, 10);
  ctx.page.drawText(nlabel, {
    x: MARGIN_LEFT + halfW + 20 + (halfW - nlw) / 2,
    y: ctx.y,
    size: 10,
    font: ctx.font,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT;

  // Pre-fill accused name
  drawText(ctx, accusedName, 0);
  ctx.y -= LINE_HEIGHT;
}

function refusalElection(ctx: PDFContext): void {
  checkPage(ctx, LINE_HEIGHT * 10);
  drawText(ctx, "b.  Right to refuse NJP.  (Check one)", 18, true);
  ctx.y -= LINE_HEIGHT + 4;

  drawWrapped(ctx, "_______ I refuse NJP.  I understand that, upon refusal of NJP, charges could be referred against me for trial by summary, special, or general court-martial, and that I also have the option of refusing trial by summary court-martial.  I also understand that my refusal of NJP does not preclude administrative action against me based on my misconduct.  This may include being processed for an administrative discharge which could result in an other-than-honorable discharge.", 18);
  ctx.y -= 4;

  drawWrapped(ctx, "_______ I accept NJP.  I understand that acceptance of NJP does not preclude further administrative action against me.  This may include being processed for an administrative discharge which could result in an other-than-honorable discharge.", 18);
  ctx.y -= PARA_SPACING;

  drawWrapped(ctx, "(Note: If the accused does not accept NJP, the matter should be submitted to the commanding officer for disposition.)", 18);
  ctx.y -= PARA_SPACING;
}

/**
 * Generate the Notification and Election of Rights PDF
 * Selects the correct variant based on vesselException flag
 */
export async function generateNotificationElectionRightsPdf(data: CaseData): Promise<Uint8Array> {
  const vesselApplies = data.vesselException;
  const appendix = vesselApplies ? "A-1-c" : "A-1-d";
  const ctx = await createPdfContext();

  // Page 1: Header + Notification
  headerBlock(ctx, vesselApplies);
  identificationBlock(ctx, data);
  notificationSection(ctx, data, vesselApplies);

  // Election section (may span pages)
  electionSection(ctx, data, vesselApplies);

  // Add appendix to each page
  const pages = ctx.doc.getPages();
  for (const p of pages) {
    const f = ctx.font;
    const w = f.widthOfTextAtSize(appendix, 10);
    p.drawText(appendix, {
      x: (612 - w) / 2,
      y: 40,
      size: 10,
      font: f,
    });
  }

  return ctx.doc.save();
}
