/**
 * PDF Receipt Generator — GrowPia
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates branded PDF receipts for clients and experts using pdf-lib.
 * All coordinates use pdf-lib's bottom-left origin (y=0 is bottom of page).
 *
 * Exports:
 *   generateClientBookingReceiptPdf(data) → Buffer
 *   generateClientRefundReceiptPdf(data)  → Buffer
 *   generateExpertPayoutReceiptPdf(data)  → Buffer
 */

import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";

// ── Colour palette ─────────────────────────────────────────────────────────────

const C_BLUE      = rgb(0.388, 0.584, 0.937); // #6395EE
const C_DARK      = rgb(0.216, 0.255, 0.318); // #374151
const C_GRAY      = rgb(0.420, 0.447, 0.502); // #6B7280
const C_LGRAY     = rgb(0.937, 0.945, 0.957); // #EEEFF4
const C_GREEN_TXT = rgb(0.086, 0.400, 0.204); // #166534
const C_GREEN_BG  = rgb(0.941, 0.992, 0.957); // #F0FDF4
const C_WHITE     = rgb(1, 1, 1);
const C_LINE      = rgb(0.900, 0.910, 0.925); // separator

// ── Page constants ─────────────────────────────────────────────────────────────

const PW     = 595; // A4 width  (points)
const PH     = 842; // A4 height (points)
const MARGIN = 50;
const CW     = PW - MARGIN * 2; // content width

// ── Low-level draw helpers ─────────────────────────────────────────────────────

function txt(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = C_DARK,
): void {
  page.drawText(text, { x, y, size, font, color });
}

function rect(
  page: PDFPage,
  x: number, y: number,
  w: number, h: number,
  color: ReturnType<typeof rgb>,
): void {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function hLine(page: PDFPage, y: number, x1 = MARGIN, x2 = PW - MARGIN): void {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.5, color: C_LINE });
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function fmtKES(n: number): string {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string, timeZone = "Africa/Nairobi"): string {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone, timeZoneName: "short",
  });
}

function fmtDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi",
  });
}

function fmtSessionType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ── Shared layout sections ─────────────────────────────────────────────────────

function drawHeader(page: PDFPage, bold: PDFFont, regular: PDFFont): void {
  rect(page, 0, PH - 70, PW, 70, C_BLUE);
  txt(page, "GrowPia", MARGIN, PH - 46, 22, bold, C_WHITE);
  txt(page, "scalewise.co.ke", PW - MARGIN - 88, PH - 46, 10, regular, rgb(0.78, 0.88, 1.0));
}

function drawFooter(page: PDFPage, regular: PDFFont): void {
  hLine(page, 38, MARGIN, PW - MARGIN);
  txt(
    page,
    "© 2026 GrowPia  ·  hello@scalewise.co.ke  ·  +254 707 346 331  ·  Nairobi, Kenya",
    MARGIN, 24, 8, regular, C_GRAY,
  );
  txt(page, "This is an official GrowPia receipt. Please retain for your records.", MARGIN, 13, 8, regular, C_GRAY);
}

/**
 * Draws two-column info block (e.g. FROM / TO side by side).
 * Returns the y after the block.
 */
function drawTwoColBlock(
  page: PDFPage,
  y: number,
  left: string[],
  right: string[],
  regular: PDFFont,
  bold: PDFFont,
): number {
  const midX = MARGIN + CW / 2;
  let ly = y;
  let ry = y;
  left.forEach((line, i) => {
    const f = i === 0 ? bold : regular;
    const c = i === 0 ? C_DARK : C_GRAY;
    txt(page, trunc(line, 40), MARGIN, ly, 10, f, c);
    ly -= 14;
  });
  right.forEach((line, i) => {
    const f = i === 0 ? bold : regular;
    const c = i === 0 ? C_DARK : C_GRAY;
    txt(page, trunc(line, 40), midX, ry, 10, f, c);
    ry -= 14;
  });
  return Math.min(ly, ry) - 8;
}

/**
 * Draws a label-value row. Returns next y.
 */
function drawRow(
  page: PDFPage,
  label: string,
  value: string,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
  valueBold = false,
  bgColor?: ReturnType<typeof rgb>,
): number {
  if (bgColor) rect(page, MARGIN, y - 4, CW, 20, bgColor);
  txt(page, label, MARGIN + 4, y + 2, 10, regular, C_GRAY);
  txt(page, trunc(value, 60), MARGIN + 160, y + 2, 10, valueBold ? bold : regular, C_DARK);
  return y - 22;
}

// ── 1. Client Booking Receipt ──────────────────────────────────────────────────

export interface ClientBookingReceiptData {
  receiptNumber: string;
  issuedAt: string;
  client: { name: string; email: string };
  expert: { name: string; industry: string };
  booking: {
    sessionType: string;
    scheduledTime: string;
    durationMinutes: number;
    amount: number;
    meetLink?: string | null;
  };
}

export async function generateClientBookingReceiptPdf(data: ClientBookingReceiptData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const page    = doc.addPage([PW, PH]);

  drawHeader(page, bold, regular);
  drawFooter(page, regular);

  let y = PH - 90;

  // Receipt title
  txt(page, "PAYMENT RECEIPT", MARGIN, y, 16, bold, C_BLUE);
  y -= 22;
  txt(page, `Receipt No: ${data.receiptNumber}`, MARGIN, y, 10, regular, C_GRAY);
  txt(page, `Date: ${fmtDateOnly(data.issuedAt)}`, MARGIN + 200, y, 10, regular, C_GRAY);
  y -= 24;

  hLine(page, y + 4);
  y -= 16;

  // FROM / TO
  y = drawTwoColBlock(
    page, y,
    ["GrowPia", "hello@scalewise.co.ke", "+254 707 346 331", "Nairobi, Kenya"],
    ["Billed To", trunc(data.client.name, 38), trunc(data.client.email, 38)],
    regular, bold,
  );
  y -= 8;

  hLine(page, y + 4);
  y -= 20;

  // Session details header
  txt(page, "SESSION DETAILS", MARGIN, y, 10, bold, C_BLUE);
  y -= 18;

  y = drawRow(page, "Session type", fmtSessionType(data.booking.sessionType), y, regular, bold);
  y = drawRow(page, "Expert", data.expert.name, y, regular, bold);
  y = drawRow(page, "Industry", data.expert.industry, y, regular, bold);
  y = drawRow(page, "Date & time", fmtDate(data.booking.scheduledTime), y, regular, bold);
  y = drawRow(page, "Duration", `${data.booking.durationMinutes} minutes`, y, regular, bold);
  if (data.booking.meetLink) {
    y = drawRow(page, "Google Meet", trunc(data.booking.meetLink, 55), y, regular, bold);
  }

  y -= 12;
  hLine(page, y + 4);
  y -= 20;

  // Totals
  txt(page, "PAYMENT SUMMARY", MARGIN, y, 10, bold, C_BLUE);
  y -= 18;

  rect(page, MARGIN, y - 6, CW, 28, C_GREEN_BG);
  txt(page, "Total paid", MARGIN + 4, y + 4, 11, bold, C_GREEN_TXT);
  const amtStr = fmtKES(data.booking.amount);
  const amtW = bold.widthOfTextAtSize(amtStr, 13);
  txt(page, amtStr, PW - MARGIN - amtW - 4, y + 3, 13, bold, C_GREEN_TXT);
  y -= 36;

  txt(page, "Payment is processed securely through GrowPia.", MARGIN, y, 9, regular, C_GRAY);
  y -= 13;
  txt(page, "For receipt queries contact hello@scalewise.co.ke or visit scalewise.co.ke.", MARGIN, y, 9, regular, C_GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ── 2. Client Refund Receipt ───────────────────────────────────────────────────

export interface ClientRefundReceiptData {
  receiptNumber: string;
  issuedAt: string;
  client: { name: string; email: string };
  expert: { name: string };
  booking: {
    sessionType: string;
    scheduledTime: string;
    originalAmount: number;
    refundPercent: number;
    refundAmount: number;
    cancelledBy: string | null;
    refundPaidAt: string | null;
  };
}

export async function generateClientRefundReceiptPdf(data: ClientRefundReceiptData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const page    = doc.addPage([PW, PH]);

  drawHeader(page, bold, regular);
  drawFooter(page, regular);

  let y = PH - 90;

  txt(page, "REFUND RECEIPT", MARGIN, y, 16, bold, C_BLUE);
  y -= 22;
  txt(page, `Receipt No: ${data.receiptNumber}`, MARGIN, y, 10, regular, C_GRAY);
  txt(page, `Date: ${data.booking.refundPaidAt ? fmtDateOnly(data.booking.refundPaidAt) : fmtDateOnly(data.issuedAt)}`, MARGIN + 200, y, 10, regular, C_GRAY);
  y -= 24;

  hLine(page, y + 4);
  y -= 16;

  y = drawTwoColBlock(
    page, y,
    ["GrowPia", "hello@scalewise.co.ke", "+254 707 346 331", "Nairobi, Kenya"],
    ["Refund To", trunc(data.client.name, 38), trunc(data.client.email, 38)],
    regular, bold,
  );
  y -= 8;

  hLine(page, y + 4);
  y -= 20;

  txt(page, "REFUND DETAILS", MARGIN, y, 10, bold, C_BLUE);
  y -= 18;

  y = drawRow(page, "Session type", fmtSessionType(data.booking.sessionType), y, regular, bold);
  y = drawRow(page, "Expert", data.expert.name, y, regular, bold);
  y = drawRow(page, "Session date", fmtDateOnly(data.booking.scheduledTime), y, regular, bold);
  y = drawRow(page, "Cancelled by", data.booking.cancelledBy ?? "client", y, regular, bold);
  y = drawRow(page, "Original amount", fmtKES(data.booking.originalAmount), y, regular, bold);
  y = drawRow(page, "Refund percentage", `${data.booking.refundPercent}%`, y, regular, bold);

  y -= 12;
  hLine(page, y + 4);
  y -= 20;

  txt(page, "REFUND SUMMARY", MARGIN, y, 10, bold, C_BLUE);
  y -= 18;

  rect(page, MARGIN, y - 6, CW, 28, C_GREEN_BG);
  txt(page, "Refund amount", MARGIN + 4, y + 4, 11, bold, C_GREEN_TXT);
  const refStr = fmtKES(data.booking.refundAmount);
  const refW = bold.widthOfTextAtSize(refStr, 13);
  txt(page, refStr, PW - MARGIN - refW - 4, y + 3, 13, bold, C_GREEN_TXT);
  y -= 36;

  txt(page, "Please allow 3–5 business days for funds to reflect in your account.", MARGIN, y, 9, regular, C_GRAY);
  y -= 13;
  txt(page, "For refund queries contact hello@scalewise.co.ke or visit scalewise.co.ke.", MARGIN, y, 9, regular, C_GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ── 3. Expert Payout Receipt ───────────────────────────────────────────────────

export interface ExpertPayoutSessionLine {
  bookingId: number;
  sessionType: string;
  clientName: string;
  scheduledTime: string;
  grossAmount: number;
  commissionRate: number;
  netAmount: number;
}

export interface ExpertPayoutCancellationLine {
  bookingId: number;
  sessionType: string;
  clientName: string;
  scheduledTime: string;
  expertEarning: number;
}

export interface ExpertPayoutReceiptData {
  receiptNumber: string;
  issuedAt: string;
  expert: { name: string; email: string; industry: string };
  period: { start: string; end: string };
  sessionLines: ExpertPayoutSessionLine[];
  cancellationLines: ExpertPayoutCancellationLine[];
  sessionAmount: number;
  cancellationAmount: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
}

export async function generateExpertPayoutReceiptPdf(data: ExpertPayoutReceiptData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);

  // We may need multiple pages for large session lists
  const addPage = () => {
    const p = doc.addPage([PW, PH]);
    drawHeader(p, bold, regular);
    drawFooter(p, regular);
    return p;
  };

  let page = addPage();
  let y = PH - 90;

  // Title
  txt(page, "PAYOUT RECEIPT", MARGIN, y, 16, bold, C_BLUE);
  y -= 22;
  txt(page, `Receipt No: ${data.receiptNumber}`, MARGIN, y, 10, regular, C_GRAY);
  txt(page, `Date: ${fmtDateOnly(data.issuedAt)}`, MARGIN + 220, y, 10, regular, C_GRAY);
  y -= 24;

  hLine(page, y + 4);
  y -= 16;

  // FROM / TO
  y = drawTwoColBlock(
    page, y,
    ["GrowPia", "hello@scalewise.co.ke", "+254 707 346 331", "Nairobi, Kenya"],
    ["Paid To", trunc(data.expert.name, 38), trunc(data.expert.email, 38), trunc(data.expert.industry, 36)],
    regular, bold,
  );
  y -= 8;
  hLine(page, y + 4);
  y -= 20;

  // Period
  txt(page, "PAYOUT PERIOD", MARGIN, y, 10, bold, C_BLUE);
  y -= 18;
  y = drawRow(page, "Period start", fmtDateOnly(data.period.start), y, regular, bold);
  y = drawRow(page, "Period end",   fmtDateOnly(data.period.end),   y, regular, bold);
  y -= 10;
  hLine(page, y + 4);
  y -= 20;

  // Session lines table header
  if (data.sessionLines.length > 0) {
    txt(page, "COMPLETED SESSIONS", MARGIN, y, 10, bold, C_BLUE);
    y -= 16;

    // Column headers
    rect(page, MARGIN, y - 4, CW, 18, C_LGRAY);
    const COL = [MARGIN + 4, MARGIN + 28, MARGIN + 180, MARGIN + 320, MARGIN + 390, MARGIN + 460];
    txt(page, "#",          COL[0], y + 1, 8, bold, C_GRAY);
    txt(page, "Session",    COL[1], y + 1, 8, bold, C_GRAY);
    txt(page, "Client",     COL[2], y + 1, 8, bold, C_GRAY);
    txt(page, "Date",       COL[3], y + 1, 8, bold, C_GRAY);
    txt(page, "Gross",      COL[4], y + 1, 8, bold, C_GRAY);
    txt(page, "Net",        COL[5], y + 1, 8, bold, C_GRAY);
    y -= 22;

    for (let i = 0; i < data.sessionLines.length; i++) {
      // Start a new page if needed
      if (y < 130) {
        page = addPage();
        y = PH - 90;
      }

      const sl = data.sessionLines[i];
      if (i % 2 === 0) rect(page, MARGIN, y - 4, CW, 18, rgb(0.975, 0.978, 0.990));
      txt(page, String(i + 1),                          COL[0], y + 1, 8, regular, C_GRAY);
      txt(page, trunc(fmtSessionType(sl.sessionType), 20), COL[1], y + 1, 8, regular, C_DARK);
      txt(page, trunc(sl.clientName, 18),               COL[2], y + 1, 8, regular, C_DARK);
      txt(page, fmtDateOnly(sl.scheduledTime),          COL[3], y + 1, 8, regular, C_DARK);
      txt(page, fmtKES(sl.grossAmount),                 COL[4], y + 1, 8, regular, C_DARK);
      txt(page, fmtKES(sl.netAmount),                   COL[5], y + 1, 8, bold,    C_DARK);
      y -= 20;
    }

    // Sessions subtotal
    if (y < 130) { page = addPage(); y = PH - 90; }
    hLine(page, y + 6);
    y -= 4;
    txt(page, `Sessions subtotal (${data.sessionLines.length})`, MARGIN + 4, y + 1, 9, regular, C_GRAY);
    const subStr = fmtKES(data.sessionAmount);
    const subW = bold.widthOfTextAtSize(subStr, 9);
    txt(page, subStr, PW - MARGIN - subW - 4, y + 1, 9, bold, C_DARK);
    y -= 20;
  }

  // Cancellation earnings
  if (data.cancellationLines.length > 0) {
    if (y < 150) { page = addPage(); y = PH - 90; }
    hLine(page, y + 4);
    y -= 16;
    txt(page, "CANCELLATION EARNINGS", MARGIN, y, 10, bold, C_BLUE);
    y -= 16;

    for (let i = 0; i < data.cancellationLines.length; i++) {
      if (y < 130) { page = addPage(); y = PH - 90; }
      const cl = data.cancellationLines[i];
      if (i % 2 === 0) rect(page, MARGIN, y - 4, CW, 18, rgb(0.975, 0.978, 0.990));
      txt(page, `${i + 1}. ${trunc(fmtSessionType(cl.sessionType), 22)} — ${trunc(cl.clientName, 20)} (${fmtDateOnly(cl.scheduledTime)})`, MARGIN + 4, y + 1, 8, regular, C_DARK);
      const earnStr = fmtKES(cl.expertEarning);
      const earnW = bold.widthOfTextAtSize(earnStr, 8);
      txt(page, earnStr, PW - MARGIN - earnW - 4, y + 1, 8, bold, C_DARK);
      y -= 20;
    }

    if (y < 130) { page = addPage(); y = PH - 90; }
    hLine(page, y + 6);
    y -= 4;
    txt(page, `Cancellations subtotal (${data.cancellationLines.length})`, MARGIN + 4, y + 1, 9, regular, C_GRAY);
    const cSubStr = fmtKES(data.cancellationAmount);
    const cSubW = bold.widthOfTextAtSize(cSubStr, 9);
    txt(page, cSubStr, PW - MARGIN - cSubW - 4, y + 1, 9, bold, C_DARK);
    y -= 20;
  }

  // Totals summary
  if (y < 160) { page = addPage(); y = PH - 90; }
  y -= 8;
  hLine(page, y + 4);
  y -= 20;

  txt(page, "PAYOUT SUMMARY", MARGIN, y, 10, bold, C_BLUE);
  y -= 18;

  y = drawRow(page, "Subtotal (before VAT)", fmtKES(data.subtotal), y, regular, bold);
  y = drawRow(page, `VAT (${pct(data.vatRate)})`, fmtKES(data.vatAmount), y, regular, bold);

  rect(page, MARGIN, y - 6, CW, 28, C_GREEN_BG);
  txt(page, "Total payout", MARGIN + 4, y + 4, 11, bold, C_GREEN_TXT);
  const totStr = fmtKES(data.totalAmount);
  const totW = bold.widthOfTextAtSize(totStr, 13);
  txt(page, totStr, PW - MARGIN - totW - 4, y + 3, 13, bold, C_GREEN_TXT);
  y -= 38;

  txt(page, "Please allow 1–3 business days for funds to reflect in your account.", MARGIN, y, 9, regular, C_GRAY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
