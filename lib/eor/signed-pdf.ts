import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Attachment } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';
import { ENSAAR_ADDRESS } from './agreement';

/*
 * Signed copies as PDFs. The page is built from the frozen text that was
 * signed (the same text the fingerprint is taken over), so the PDF says exactly
 * what was signed, laid out as a document: title, headings and numbered
 * clauses, lists, tables, the signatures, and Ensaar's details on every page.
 * Noto Sans is embedded (lib/eor/fonts, SIL OFL) because the documents contain
 * the rupee sign, which the PDF standard fonts cannot print. The font files are
 * trimmed ahead of time to Latin, common punctuation and the rupee sign
 * (fontTools subset) and embedded whole: pdf-lib's own subsetting drops glyphs
 * from Noto Sans, leaving gaps in the text.
 */

const A4 = { w: 595.28, h: 841.89 };
const M = { x: 56, top: 92, bottom: 70 };
const WIDTH = A4.w - 2 * M.x;
const INK = rgb(0.13, 0.17, 0.24);
const MUTED = rgb(0.42, 0.47, 0.56);
const NAVY = rgb(0.05, 0.14, 0.26);
const BLUE = rgb(0, 0.56, 0.81);
const LINE = rgb(0.85, 0.88, 0.92);

let fonts: { regular: Uint8Array; bold: Uint8Array; logo: Uint8Array | null } | null = null;
async function assets() {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), 'lib', 'eor', 'fonts');
  const [regular, bold, logo] = await Promise.all([
    readFile(path.join(dir, 'NotoSans-Regular.ttf')),
    readFile(path.join(dir, 'NotoSans-Bold.ttf')),
    readFile(path.join(process.cwd(), 'public', 'ensaar-logo.png')).catch(() => null),
  ]);
  fonts = { regular, bold, logo };
  return fonts;
}

/**
 * Text width from cached per-character advances. Measuring whole strings with an
 * embedded font runs full text layout each time, which made a document take
 * about two seconds; summing cached advances is all that wrapping needs.
 */
const advances = new WeakMap<PDFFont, Map<string, number>>();
function measure(font: PDFFont, text: string, size: number): number {
  let cache = advances.get(font);
  if (!cache) advances.set(font, (cache = new Map()));
  let total = 0;
  for (const ch of text) {
    let w = cache.get(ch);
    if (w === undefined) cache.set(ch, (w = font.widthOfTextAtSize(ch, 1000)));
    total += w;
  }
  return (total * size) / 1000;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(font, next, size) > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  out.push(line);
  return out;
}

type Block =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'item'; text: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'gap' }
  | { kind: 'rule' };

const isUpperHeading = (l: string) => /[A-Z]/.test(l) && l === l.toUpperCase() && l.length <= 90 && !/[a-z]/.test(l);
const isNumberedHeading = (l: string) => /^\d+(\.\d+)*\.?\s+\S/.test(l) && l.length <= 90 && !/[.:;,]$/.test(l);
/** A short line that introduces what follows ("Conditions of this offer", "For Ensaar Global Private Limited"). */
const isShortHeading = (l: string, next: string | undefined) =>
  l.length <= 70 && !/[.:;,?!]$/.test(l) && !l.includes(': ') && !l.startsWith('- ') && !l.includes(' | ') && Boolean(next && next.trim());

/** Read the canonical text back into blocks to lay out. */
function blocks(text: string): Block[] {
  const lines = text.split('\n');
  const out: Block[] = [];
  let table: string[][] | null = null;
  lines.forEach((raw, i) => {
    const l = raw.trim();
    // A header row with an empty first cell trims to "| Monthly".
    if (l.includes(' | ') || l.startsWith('| ')) {
      (table ??= []).push((l.startsWith('| ') ? ` ${l}` : l).split(' | ').map((c) => c.trim()));
      return;
    }
    if (table) {
      out.push({ kind: 'table', rows: table });
      table = null;
    }
    if (!l) out.push({ kind: 'gap' });
    else if (/^-{6,}$/.test(l)) out.push({ kind: 'rule' });
    else if (i === 0) out.push({ kind: 'title', text: l });
    else if (l.startsWith('- ')) out.push({ kind: 'item', text: l.slice(2) });
    else if (isUpperHeading(l) || isNumberedHeading(l) || isShortHeading(l, lines[i + 1])) out.push({ kind: 'heading', text: l });
    else out.push({ kind: 'para', text: l });
  });
  if (table) out.push({ kind: 'table', rows: table });
  return out;
}

/**
 * One PDF holding one or more signed documents (several Schedule As signed
 * together come as one file), each starting on a new page.
 */
export async function signedPdf(documents: string[], title: string): Promise<Uint8Array> {
  const { regular, bold, logo } = await assets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(title);
  pdf.setAuthor(siteConfig.legalName);
  pdf.setCreator('Ensaar');
  const font = await pdf.embedFont(regular, { subset: false });
  const fontBold = await pdf.embedFont(bold, { subset: false });
  const image = logo ? await pdf.embedPng(logo) : null;

  let page: PDFPage = null as unknown as PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([A4.w, A4.h]);
    if (image) {
      const w = 96;
      page.drawImage(image, { x: M.x, y: A4.h - 38 - (image.height / image.width) * w, width: w, height: (image.height / image.width) * w });
    }
    const label = siteConfig.legalName;
    page.drawText(label, { x: A4.w - M.x - measure(font, label, 8.5), y: A4.h - 50, size: 8.5, font, color: MUTED });
    page.drawRectangle({ x: M.x, y: A4.h - 72, width: WIDTH, height: 2, color: BLUE });
    y = A4.h - M.top;
  };
  const need = (h: number) => {
    if (y - h < M.bottom) newPage();
  };
  const lines = (text: string, f: PDFFont, size: number, x: number, width: number, color = INK, lead = 1.45) => {
    for (const l of wrap(text, f, size, width)) {
      need(size * lead);
      page.drawText(l, { x, y: y - size, size, font: f, color });
      y -= size * lead;
    }
  };

  documents.forEach((doc) => {
    newPage();
    for (const b of blocks(doc)) {
      switch (b.kind) {
        case 'title':
          lines(b.text, fontBold, 15, M.x, WIDTH, NAVY, 1.35);
          y -= 6;
          break;
        case 'heading':
          need(32);
          y -= 4;
          lines(b.text, fontBold, 10.5, M.x, WIDTH, NAVY);
          break;
        case 'para':
          lines(b.text, font, 9.8, M.x, WIDTH);
          y -= 3;
          break;
        case 'item': {
          need(14);
          page.drawText('•', { x: M.x + 4, y: y - 9.8, size: 9.8, font, color: INK });
          lines(b.text, font, 9.8, M.x + 16, WIDTH - 16);
          break;
        }
        case 'gap':
          y -= 5;
          break;
        case 'rule':
          need(20);
          y -= 8;
          page.drawRectangle({ x: M.x, y, width: WIDTH, height: 0.6, color: LINE });
          y -= 10;
          break;
        case 'table': {
          const cols = Math.max(...b.rows.map((r) => r.length));
          const first = Math.min(WIDTH * 0.46, WIDTH - (cols - 1) * 90);
          const rest = cols > 1 ? (WIDTH - first) / (cols - 1) : 0;
          b.rows.forEach((row, r) => {
            const f = r === 0 || r === b.rows.length - 1 ? fontBold : font;
            const h = 18;
            need(h);
            if (r === 0) page.drawRectangle({ x: M.x, y: y - h, width: WIDTH, height: h, color: rgb(0.95, 0.96, 0.98) });
            row.forEach((cell, c) => {
              const x = c === 0 ? M.x + 6 : M.x + first + (c - 1) * rest;
              const w = c === 0 ? first - 12 : rest - 6;
              const text = wrap(cell, f, 9, w)[0] ?? '';
              const tx = c === 0 ? x : x + w - measure(f, text, 9);
              page.drawText(text, { x: tx, y: y - 12.5, size: 9, font: f, color: INK });
            });
            page.drawRectangle({ x: M.x, y: y - h, width: WIDTH, height: 0.5, color: LINE });
            y -= h;
          });
          y -= 8;
          break;
        }
      }
    }
  });

  // Footer on every page: who Ensaar is, and where you are in the document.
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const left = `${siteConfig.legalName} · ${ENSAAR_ADDRESS} · CIN ${siteConfig.cin}`;
    const lineOne = wrap(left, font, 7, WIDTH - 70);
    lineOne.slice(0, 2).forEach((l, k) => p.drawText(l, { x: M.x, y: 40 - k * 9, size: 7, font, color: MUTED }));
    const n = `Page ${i + 1} of ${pages.length}`;
    p.drawText(n, { x: A4.w - M.x - measure(font, n, 7.5), y: 40, size: 7.5, font, color: MUTED });
  });
  return pdf.save();
}

/** A signed-copy attachment for the outbox. */
export async function signedPdfAttachment(filename: string, documents: string[], title: string): Promise<Attachment> {
  const bytes = await signedPdf(documents, title);
  return { filename, content: Buffer.from(bytes).toString('base64'), contentType: 'application/pdf', encoding: 'base64' };
}
