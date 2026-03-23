import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";

export const PAGE_WIDTH = 612; // 8.5in at 72dpi
export const PAGE_HEIGHT = 792; // 11in
export const MARGIN_LEFT = 72;
export const MARGIN_RIGHT = 72;
export const MARGIN_TOP = 72;
export const MARGIN_BOTTOM = 72;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
export const LINE_HEIGHT = 14;
export const PARA_SPACING = 6;

export interface PDFContext {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
}

export async function createPdfContext(): Promise<PDFContext> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const fontBold = await doc.embedFont(StandardFonts.CourierBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { doc, page, font, fontBold, y: PAGE_HEIGHT - MARGIN_TOP };
}

export function addPage(ctx: PDFContext): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN_TOP;
}

export function checkPage(ctx: PDFContext, needed: number = LINE_HEIGHT * 3): void {
  if (ctx.y < MARGIN_BOTTOM + needed) {
    addPage(ctx);
  }
}

const FONT_SIZE = 10;
const HEADER_SIZE = 10;

/**
 * Draw right-aligned text (used for JAGINST reference and appendix number)
 */
export function drawRightAligned(ctx: PDFContext, text: string, bold = false): void {
  const f = bold ? ctx.fontBold : ctx.font;
  const w = f.widthOfTextAtSize(text, FONT_SIZE);
  ctx.page.drawText(text, {
    x: PAGE_WIDTH - MARGIN_RIGHT - w,
    y: ctx.y,
    size: FONT_SIZE,
    font: f,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw centered text
 */
export function drawCentered(ctx: PDFContext, text: string, bold = false, size = HEADER_SIZE): void {
  const f = bold ? ctx.fontBold : ctx.font;
  const w = f.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: (PAGE_WIDTH - w) / 2,
    y: ctx.y,
    size,
    font: f,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw text at left margin with optional indent
 */
export function drawText(ctx: PDFContext, text: string, indent = 0, bold = false, size = FONT_SIZE): void {
  const f = bold ? ctx.fontBold : ctx.font;
  ctx.page.drawText(text, {
    x: MARGIN_LEFT + indent,
    y: ctx.y,
    size,
    font: f,
    color: rgb(0, 0, 0),
  });
}

/**
 * Word-wrap text to fit within content width at given indent, and draw each line.
 * Returns the number of lines drawn.
 */
export function drawWrapped(
  ctx: PDFContext,
  text: string,
  indent = 0,
  bold = false,
  size = FONT_SIZE,
): number {
  const f = bold ? ctx.fontBold : ctx.font;
  const maxWidth = CONTENT_WIDTH - indent;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (f.widthOfTextAtSize(testLine, size) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  for (const line of lines) {
    checkPage(ctx);
    drawText(ctx, line, indent, bold, size);
    ctx.y -= LINE_HEIGHT;
  }
  return lines.length;
}

/**
 * Draw a horizontal line (used for signature blocks)
 */
export function drawLine(ctx: PDFContext, x: number, width: number): void {
  ctx.page.drawLine({
    start: { x, y: ctx.y },
    end: { x: x + width, y: ctx.y },
    thickness: 0.75,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw a checkbox line: "______ text" style
 */
export function drawCheckboxLine(ctx: PDFContext, text: string, indent = 0): number {
  return drawWrapped(ctx, `______ ${text}`, indent);
}

/**
 * Draw a signature block with two side-by-side signature lines
 */
export function drawDualSignatureBlock(
  ctx: PDFContext,
  leftLabel: string,
  rightLabel: string,
  leftName?: string,
  rightName?: string,
): void {
  checkPage(ctx, LINE_HEIGHT * 4);
  const halfW = CONTENT_WIDTH / 2 - 10;

  // Signature lines
  drawLine(ctx, MARGIN_LEFT, halfW);
  drawLine(ctx, MARGIN_LEFT + halfW + 20, halfW);
  ctx.y -= LINE_HEIGHT;

  // Labels
  drawText(ctx, leftLabel, 0);
  const rf = ctx.font;
  const rw = rf.widthOfTextAtSize(rightLabel, FONT_SIZE);
  ctx.page.drawText(rightLabel, {
    x: MARGIN_LEFT + halfW + 20 + (halfW - rw) / 2,
    y: ctx.y,
    size: FONT_SIZE,
    font: rf,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT + 2;

  // Date lines
  drawText(ctx, "(Date)", 20);
  ctx.page.drawText("(Date)", {
    x: MARGIN_LEFT + halfW + 40,
    y: ctx.y,
    size: FONT_SIZE,
    font: ctx.font,
    color: rgb(0, 0, 0),
  });
  ctx.y -= LINE_HEIGHT + PARA_SPACING;

  // Pre-fill names if provided
  if (leftName || rightName) {
    if (leftName) drawText(ctx, leftName, 0);
    if (rightName) {
      ctx.page.drawText(rightName, {
        x: MARGIN_LEFT + halfW + 20,
        y: ctx.y,
        size: FONT_SIZE,
        font: ctx.font,
        color: rgb(0, 0, 0),
      });
    }
    ctx.y -= LINE_HEIGHT;
  }
}

/**
 * Draw appendix number centered at bottom of page
 */
export function drawAppendix(ctx: PDFContext, appendix: string): void {
  const f = ctx.font;
  const w = f.widthOfTextAtSize(appendix, FONT_SIZE);
  ctx.page.drawText(appendix, {
    x: (PAGE_WIDTH - w) / 2,
    y: MARGIN_BOTTOM - 20,
    size: FONT_SIZE,
    font: f,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw a fill-in blank line (underscores) with fixed width
 */
export function drawBlank(ctx: PDFContext, charCount = 30, x?: number): void {
  const blank = "_".repeat(charCount);
  ctx.page.drawText(blank, {
    x: x ?? MARGIN_LEFT,
    y: ctx.y,
    size: FONT_SIZE,
    font: ctx.font,
    color: rgb(0, 0, 0),
  });
}

/**
 * Draw a fill-in field: label + value or blank
 */
export function drawField(ctx: PDFContext, label: string, value: string | undefined, blankChars = 30, indent = 0): void {
  const text = value ? `${label} ${value}` : `${label} ${"_".repeat(blankChars)}`;
  drawText(ctx, text, indent);
  ctx.y -= LINE_HEIGHT;
}
