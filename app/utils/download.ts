/**
 * Browser helpers for the result exports: clipboard, file download and the PNG slip.
 */
import { DenomKind } from '~/types/denomination';
import type { ISlipImageModel } from '~/utils/exporters';

/** UTF-8 BOM so Excel opens Chinese CSV correctly */
export const CSV_BOM = '﻿';
export const CSV_MIME = 'text/csv;charset=utf-8';
export const PNG_MIME = 'image/png';

/** Copy text; falls back to a hidden textarea + execCommand. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand?.('copy') ?? false;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** Save a Blob via a temporary <a download>. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Revoke on the next tick so the download has started
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** CSV Blob with BOM; line endings come from buildCsv (CRLF). */
export function createCsvBlob(csv: string): Blob {
  return new Blob([CSV_BOM + csv], { type: CSV_MIME });
}

// --- PNG slip ---------------------------------------------------------------

/**
 * Theme-independent slip palette (fallbacks mirror tokens/colors.css). `card` has no token in the
 * synced design-system file yet, so it falls back to white like the original tool.
 */
const SLIP_COLORS = {
  bg: ['--ms-slip-bg', '#E8EDF2'],
  hero: ['--ms-slip-hero', '#34404E'],
  heroText: ['--ms-slip-hero-text', '#D9E2EB'],
  num: ['--ms-slip-num', '#F2C14E'],
  card: ['--ms-slip-card', '#FFFFFF'],
  bill: ['--ms-slip-bill', '#D3DEE9'],
  coin: ['--ms-slip-coin', '#E9EEF3'],
  label: ['--ms-slip-label', '#3F4B59'],
  ink: ['--ms-slip-ink', '#22303D'],
  muted: ['--ms-slip-muted', '#566475'],
} as const;

type SlipPalette = Record<keyof typeof SLIP_COLORS, string>;

const SLIP_FONT_FAMILY = "'Chiron GoRound TC', sans-serif";
/** 540 CSS px × 2 = a 1080px-wide PNG, like the design tool */
export const SLIP_PIXEL_RATIO = 2;

/**
 * Layout in CSS px — the design tool's drawSlip (1080px canvas) at half scale.
 * y values ending in "Base" are text baselines.
 */
const L = {
  width: 540,
  margin: 30,
  // Cat ears: rotated rounded squares poking out above the hero
  earSize: 28,
  earRadius: 6,
  earInset: 75,
  earTop: 48,
  heroTop: 55,
  heroHeight: 150,
  heroRadius: 24,
  heroPad: 25,
  titleSize: 17,
  titleBase: 95,
  timeSize: 13,
  timeBase: 120,
  amountSize: 48,
  amountBase: 180,
  unitSize: 18,
  // White card holding the rows
  cardTop: 220,
  cardPad: 10,
  cardRadius: 20,
  rowInset: 45,
  rowHeight: 46,
  rowBox: 39,
  rowRadius: 13,
  rowPad: 17,
  rowLabelSize: 16,
  rowLabelBase: 25,
  rowValueSize: 20,
  rowValueBase: 26,
  /** Centre of the count column */
  rowValueX: 260,
  rowSubtotalSize: 13,
  footerGap: 72,
  footerSize: 13,
  bottomPad: 28,
} as const;

function readPalette(): SlipPalette {
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
  const palette = {} as SlipPalette;
  (Object.keys(SLIP_COLORS) as (keyof typeof SLIP_COLORS)[]).forEach((key) => {
    const [variable, fallback] = SLIP_COLORS[key];
    palette[key] = style?.getPropertyValue(variable).trim() || fallback;
  });
  return palette;
}

const cardBottom = (rowCount: number) => L.cardTop + L.cardPad * 2 + rowCount * L.rowHeight;

/** Total canvas height for a model (CSS px). */
export function measureSlipHeight(model: ISlipImageModel): number {
  return cardBottom(model.lines.length) + L.footerGap + L.bottomPad;
}

async function waitForFonts(): Promise<void> {
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts) return;
  try {
    // The font face may not have been requested at these weights yet
    await Promise.all([
      fonts.load(`400 ${L.amountSize}px ${SLIP_FONT_FAMILY}`),
      fonts.load(`500 ${L.rowLabelSize}px ${SLIP_FONT_FAMILY}`),
    ]);
    await fonts.ready;
  } catch {
    // Draw with the fallback font
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const font = (size: number, weight = 400) => `${weight} ${size}px ${SLIP_FONT_FAMILY}`;

/**
 * Paint the slip on a canvas (1080px wide) and return a PNG Blob:
 * dark total block with two cat ears (title · time · count · amount), then a white card with one
 * row per denomination (NT$ label · count · 小計), then the footer.
 */
export async function drawSlipImage(model: ISlipImageModel): Promise<Blob> {
  await waitForFonts();

  const palette = readPalette();
  const height = measureSlipHeight(model);
  const canvas = document.createElement('canvas');
  canvas.width = L.width * SLIP_PIXEL_RATIO;
  canvas.height = height * SLIP_PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');

  ctx.scale(SLIP_PIXEL_RATIO, SLIP_PIXEL_RATIO);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const innerWidth = L.width - L.margin * 2;
  const textLeft = L.margin + L.heroPad;

  // Page
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, L.width, height);

  // Cat ears + hero block
  ctx.fillStyle = palette.hero;
  [L.earInset, L.width - L.earInset - L.earSize].forEach((earX) => {
    const half = L.earSize / 2;
    ctx.save();
    ctx.translate(earX + half, L.earTop + half);
    ctx.rotate(Math.PI / 4);
    roundRect(ctx, -half, -half, L.earSize, L.earSize, L.earRadius);
    ctx.fill();
    ctx.restore();
  });
  roundRect(ctx, L.margin, L.heroTop, innerWidth, L.heroHeight, L.heroRadius);
  ctx.fill();

  ctx.fillStyle = palette.heroText;
  ctx.font = font(L.titleSize, 500);
  ctx.fillText(model.title, textLeft, L.titleBase);
  ctx.font = font(L.timeSize);
  ctx.fillText(model.timeText, textLeft, L.timeBase);

  ctx.fillStyle = palette.num;
  ctx.font = font(L.amountSize, 600);
  ctx.fillText(model.totalAmount, textLeft, L.amountBase);
  const amountWidth = ctx.measureText(model.totalAmount).width;
  ctx.fillStyle = palette.heroText;
  ctx.font = font(L.unitSize);
  ctx.fillText(` ${model.totalUnit}`, textLeft + amountWidth, L.amountBase);

  // White card with one row per denomination (bills and coins differ in row colour)
  ctx.fillStyle = palette.card;
  roundRect(ctx, L.margin, L.cardTop, innerWidth, cardBottom(model.lines.length) - L.cardTop, L.cardRadius);
  ctx.fill();

  const rowWidth = L.width - L.rowInset * 2;
  model.lines.forEach((line, index) => {
    const y = L.cardTop + L.cardPad + index * L.rowHeight;
    ctx.fillStyle = line.kind === DenomKind.Bill ? palette.bill : palette.coin;
    roundRect(ctx, L.rowInset, y, rowWidth, L.rowBox, L.rowRadius);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.label;
    ctx.font = font(L.rowLabelSize, 500);
    ctx.fillText(line.label, L.rowInset + L.rowPad, y + L.rowLabelBase);

    ctx.textAlign = 'center';
    ctx.fillStyle = palette.ink;
    ctx.font = font(L.rowValueSize, 600);
    ctx.fillText(line.value, L.rowValueX, y + L.rowValueBase);

    ctx.textAlign = 'right';
    ctx.fillStyle = palette.muted;
    ctx.font = font(L.rowSubtotalSize);
    ctx.fillText(line.subtotal, L.width - L.rowInset - L.rowPad, y + L.rowLabelBase);
  });

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.muted;
  ctx.font = font(L.footerSize);
  ctx.fillText(model.footer, L.width / 2, height - L.bottomPad);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), PNG_MIME);
  });
}
