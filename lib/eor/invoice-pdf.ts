import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { LATE_INTEREST_PERCENT_PER_MONTH, PAYMENT_DAYS, formatPeriod, type Invoice } from './billing';
import { INVOICE_ISSUER, PAYMENT_METHOD_LINE, type InvoiceSettings } from './invoice-format';
import type { CompanyDetails } from './onboarding';

/*
 * The invoice as a PDF, laid out the way Ensaar's accounts team issues them:
 * issuer block and invoice facts at the top, the export (LUT) statement, Bill
 * To, one line per invoice, then the bank details. A4, standard fonts only, so
 * it renders the same everywhere and needs nothing installed.
 */

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const INK = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.35, 0.35, 0.35);
const LINE = rgb(0.73, 0.73, 0.73);
const FILL = rgb(0.95, 0.95, 0.95);

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** 15/10/2026 (Oct 15): the day-first date Ensaar prints, with the month spelt out so a US reader cannot misread it. */
const printedDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  const month = new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${d}/${m}/${y} (${month} ${Number(d)})`;
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

let logo: Uint8Array | null | undefined;
async function logoBytes(): Promise<Uint8Array | null> {
  if (logo !== undefined) return logo;
  logo = await readFile(path.join(process.cwd(), 'public', 'ensaar-logo.png')).catch(() => null);
  return logo;
}

export async function invoicePdf(input: {
  invoice: Pick<Invoice, 'number' | 'period' | 'amountUsd' | 'issuedOn' | 'dueOn' | 'summary'>;
  customer: { name: string; details: CompanyDetails | null };
  settings: InvoiceSettings;
}): Promise<Uint8Array> {
  const { invoice, customer, settings } = input;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.number}`);
  pdf.setAuthor('Ensaar Global Private Limited');
  pdf.setCreator('Ensaar');
  const page: PDFPage = pdf.addPage([A4.w, A4.h]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = (s: string, x: number, y: number, size = 9, font = regular, color = INK) => page.drawText(s, { x, y, size, font, color });

  // Issuer, top left.
  let y = A4.h - MARGIN;
  const png = await logoBytes();
  if (png) {
    const image = await pdf.embedPng(png);
    const w = 150;
    const h = (image.height / image.width) * w;
    page.drawImage(image, { x: MARGIN, y: y - h, width: w, height: h });
    y -= h + 14;
  }
  text(INVOICE_ISSUER.name, MARGIN, y, 10.5, bold);
  y -= 15;
  for (const l of INVOICE_ISSUER.addressLines) {
    text(l, MARGIN, y, 8, bold);
    y -= 10.5;
  }
  y -= 5;
  for (const l of [`PAN – ${INVOICE_ISSUER.pan}`, `GSTIN – ${INVOICE_ISSUER.gstin}`, `SAC Code – ${INVOICE_ISSUER.sac}`, `LUT ARN – ${settings.lut.arn} (FY ${settings.lut.financialYear})`]) {
    text(l, MARGIN, y, 9, bold);
    y -= 12;
  }

  // Invoice facts, top right.
  const facts: Array<[string, string]> = [
    ['Invoice Number', invoice.number],
    ['Invoice Date', printedDate(invoice.issuedOn)],
    ['Reference', `${invoice.number.includes('-') ? invoice.number.split('-')[0] : 'EOR'}-Monthly`],
    ['Due Date', printedDate(invoice.dueOn)],
  ];
  let fy = A4.h - MARGIN - 6;
  const valueX = A4.w - MARGIN - 130;
  for (const [label, value] of facts) {
    text(label, valueX - 10 - regular.widthOfTextAtSize(label, 10), fy, 10, regular, MUTED);
    text(value, valueX, fy, 10);
    fy -= 22;
  }

  // The export statement.
  y -= 6;
  for (const l of wrap(`Export of Goods/Services under Letter of Undertaking without payment of IGST vide Rule 96A of CGST Rules, 2017 and vide LUT ARN No: ${settings.lut.arn}`, regular, 9, A4.w - 2 * MARGIN)) {
    text(l, MARGIN, y, 9);
    y -= 12;
  }
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4.w - MARGIN, y }, thickness: 0.6, color: LINE });
  y -= 22;

  // Bill To.
  text('Bill To', MARGIN, y, 10, bold);
  y -= 18;
  const d = customer.details;
  const billTo = [customer.name, ...(d ? [`${[d.addressLine1, d.addressLine2].filter(Boolean).join(', ')},`, `${d.city}, ${d.state} ${d.zip}`] : [])];
  for (const l of billTo) {
    text(l.toUpperCase(), MARGIN, y, 9, bold);
    y -= 16;
  }
  y -= 10;

  // Lines.
  const cols = [MARGIN, MARGIN + 270, MARGIN + 340, MARGIN + 420, A4.w - MARGIN];
  const row = (cells: string[], top: number, height: number, opts: { header?: boolean; boxed?: number } = {}) => {
    const from = opts.boxed ?? 0;
    if (opts.header) page.drawRectangle({ x: cols[0]!, y: top - height, width: cols[4]! - cols[0]!, height, color: FILL });
    for (let i = from; i < 4; i++) page.drawRectangle({ x: cols[i]!, y: top - height, width: cols[i + 1]! - cols[i]!, height, borderColor: LINE, borderWidth: 0.6 });
    cells.forEach((c, i) => {
      if (!c) return;
      const font = opts.header || i > 0 ? bold : regular;
      const lines = wrap(c, font, 9, cols[i + 1]! - cols[i]! - 12);
      lines.forEach((l, j) => {
        const w = font.widthOfTextAtSize(l, 9);
        const x = i === 0 ? cols[0]! + 6 : cols[i]! + (cols[i + 1]! - cols[i]! - w) / 2;
        text(l, x, top - 13 - j * 11 - (height - 11 * lines.length - 6) / 2 + 2, 9, font);
      });
    });
  };
  const description = invoice.summary
    ? `Employer of Record services – ${invoice.summary} (${formatPeriod(invoice.period)})`
    : `Employer of Record services (${formatPeriod(invoice.period)})`;
  const descLines = wrap(description, regular, 9, cols[1]! - cols[0]! - 12).length;
  row(['Description', 'Quantity', 'Price\n(in USD)', 'Amount\n(in USD)'], y, 30, { header: true });
  y -= 30;
  const h = Math.max(24, descLines * 11 + 12);
  row([description, '1', money(invoice.amountUsd), money(invoice.amountUsd)], y, h);
  y -= h;
  row(['', 'GST', '0.00', '0.00'], y, 22, { boxed: 1 });
  y -= 22;
  row(['', 'Total', '', money(invoice.amountUsd)], y, 22, { boxed: 1 });
  y -= 40;

  // Bank details.
  const bank = settings.bank;
  const boxW = 330;
  const lines: Array<[string, string, boolean]> = [
    ['BANK DETAILS', '', false],
    ['Name: ', bank.accountName, true],
    ['Bank: ', bank.bankName, true],
    ['Account# ', bank.accountNumber, true],
    ['IFSC code: ', bank.ifsc, true],
    ['SWIFT code: ', bank.swift, true],
  ];
  const tail = [
    `Address: ${bank.address}`,
    `Payable within ${PAYMENT_DAYS} days of the invoice date. ${PAYMENT_METHOD_LINE} Interest at ${LATE_INTEREST_PERCENT_PER_MONTH}% per month applies to overdue amounts.`,
    `In case of any questions regarding this invoice, please contact ${INVOICE_ISSUER.accountsEmail}`,
  ].map((p) => wrap(p, regular, 8.5, boxW - 20));
  const boxH = 14 + lines.length * 13 + tail.reduce((s, t) => s + t.length * 11 + 8, 0) + 6;
  page.drawRectangle({ x: MARGIN, y: y - boxH, width: boxW, height: boxH, borderColor: LINE, borderWidth: 0.6 });
  let by = y - 18;
  for (const [label, value, strong] of lines) {
    text(label, MARGIN + 10, by, 9);
    if (label === 'BANK DETAILS') page.drawLine({ start: { x: MARGIN + 10, y: by - 2 }, end: { x: MARGIN + 10 + regular.widthOfTextAtSize(label, 9), y: by - 2 }, thickness: 0.5, color: INK });
    if (value) text(value, MARGIN + 10 + regular.widthOfTextAtSize(label, 9), by, 9, strong ? bold : regular);
    by -= 13;
  }
  for (const para of tail) {
    by -= 6;
    for (const l of para) {
      text(l, MARGIN + 10, by, 8.5);
      by -= 11;
    }
  }
  y -= boxH + 26;

  const centre = (s: string, yy: number, size = 9) => text(s, (A4.w - regular.widthOfTextAtSize(s, size)) / 2, yy, size);
  centre('Thank you for your business', y);
  centre('This is an electronically generated document and does not require signature', y - 16, 8.5);
  return pdf.save();
}
