/**
 * PDF Generator: NONJUDICIAL PUNISHMENT ACCUSED'S ACKNOWLEDGEMENT OF APPEAL RIGHTS
 * JAGINST 5800.7G, CH-2, A-1-g
 */

import type { CaseData } from "../types";
import { fmtFull } from "../dateFormatters";
import {
  createPdfContext, drawRightAligned, drawCentered, drawText,
  drawWrapped, drawDualSignatureBlock, checkPage,
  LINE_HEIGHT, PARA_SPACING, PDFContext,
} from "./pdfHelpers";

export async function generateAppealRightsAckPdf(data: CaseData): Promise<Uint8Array> {
  const ctx = await createPdfContext();
  const appendix = "A-1-g";

  const name = `${data.accusedRank} ${data.accusedLastName}, ${data.accusedFirstName}${data.accusedMiddleName ? " " + data.accusedMiddleName : ""}`;
  const njpDate = data.njpDate ? fmtFull(data.njpDate) : "____________________";
  const appealTo = data.njpAuthorityName
    ? `${data.njpAuthorityRank || ""} ${data.njpAuthorityName}`.trim()
    : "(specify to whom the appeal should be addressed)";

  // Header
  drawRightAligned(ctx, "JAGINST 5800.7G, CH-2");
  ctx.y -= LINE_HEIGHT;
  drawRightAligned(ctx, appendix);
  ctx.y -= LINE_HEIGHT * 2;

  drawCentered(ctx, "NONJUDICIAL PUNISHMENT", true);
  ctx.y -= LINE_HEIGHT;
  drawCentered(ctx, "ACCUSED'S ACKNOWLEDGEMENT OF APPEAL RIGHTS", true);
  ctx.y -= LINE_HEIGHT * 2;

  // Identification
  drawWrapped(ctx, `I, ${name}, assigned or attached to ${data.accusedUnit}, have been informed of the following facts concerning my rights of appeal as a result of nonjudicial punishment held on ${njpDate}:`);
  ctx.y -= PARA_SPACING;

  // a. Right to appeal
  drawWrapped(ctx, `a.  I have the right to appeal to ${appealTo}.`, 18);
  ctx.y -= PARA_SPACING;

  // b. Right to consult lawyer
  drawWrapped(ctx, "b.  I have the right to consult with a lawyer concerning available opportunities to appeal and whether such opportunities should be pursued.", 18);
  ctx.y -= PARA_SPACING;

  // c. Timeliness
  drawWrapped(ctx, "c.  My appeal must be submitted within a reasonable time.  Five working days, excluding weekends and holidays, after the punishment is imposed is normally considered a reasonable time, in the absence of unusual circumstances.  Any appeal submitted thereafter may be rejected as not timely.  If there are unusual circumstances that I believe will make it extremely difficult or not practical to submit an appeal within five working days, I should immediately advise the officer imposing punishment of such circumstances and request an appropriate extension of time to file my appeal.", 18);
  ctx.y -= PARA_SPACING;

  // d. Written
  drawWrapped(ctx, "d.  The appeal must be in writing.", 18);
  ctx.y -= PARA_SPACING;

  // e. Grounds
  drawWrapped(ctx, "e.  There are only two grounds for appeal; that is:", 18);
  ctx.y -= 4;
  drawWrapped(ctx, "(1)  The punishment was unjust; or", 36);
  ctx.y -= 4;
  drawWrapped(ctx, "(2)  The punishment was disproportionate to the offense(s) for which it was imposed.", 36);
  ctx.y -= PARA_SPACING;

  // f. Legal review threshold
  drawWrapped(ctx, "f.  If the punishment imposed included reduction from the pay grade of E-4 or above, or was in excess of:  arrest in quarters for seven days, correctional custody for seven days, forfeiture of seven days' pay, extra duties for 14 days, restriction for 14 days, then the appeal must be referred to a military lawyer for consideration and advice before action is taken on my appeal.", 18);
  ctx.y -= LINE_HEIGHT;

  // Signature block
  checkPage(ctx, LINE_HEIGHT * 5);
  drawDualSignatureBlock(ctx, "(Signature of Accused and Date)", "(Signature of Witness and Date)");

  // Appendix on each page
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
