import { formatNumber } from '~/utils/format';
/**
 * Parses money snap input (CSV or manual entries)
 * Supports formats: "姓名,金額" with various amount formats
 */

export interface ParsedEntry {
  name: string;
  amount: number;
}

export interface ParseResult {
  success: boolean;
  entries: ParsedEntry[];
  errors: string[];
  total: number;
  totalEntries: number;
  totalNames: number;
}

/**
 * Parse options.
 * includesNames (default true): each line is 「姓名,金額」. When false (偏好設定「純金額」),
 * each line is a single amount and the entries are named 「第 N 筆」, so they never merge.
 */
export interface ParseOptions {
  includesNames?: boolean;
}

export const MAX_ENTRIES = 1000;
export const MAX_AMOUNT_PER_ENTRY = 999999;
/** Every NT$ denomination the app supports, large → small (bills 2000–100, coins 50–1). */
export const ALL_DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 1] as const;

/**
 * Commonly used denominations, large → small. The default set in 偏好設定
 * (see utils/preferences.ts); the home page passes the user's set to calculateDenominations.
 */
export const DEFAULT_DENOMINATIONS = [1000, 500, 100, 50, 10, 5, 1] as const;
// Denominations at or above this value are bills (張); below it are coins (個).
export const MIN_BILL_DENOMINATION = 100;

export function isBill(denomination: number): boolean {
  return denomination >= MIN_BILL_DENOMINATION;
}

// The number itself: plain digits, or digits with correctly grouped thousand separators.
const NUMBER_CORE_PATTERN = /^(\d{1,3}([,，]\d{3})+|\d+)$/;
// Text allowed around the number: known currencies/units, quotes and spaces.
// Anything else (退款, (100), 100-, %, /月, another column, a decimal point …) is a format error,
// because this is an exchange tool and amounts must be plain positive numbers.
// Longer tokens come first so "元整" / "新台幣" are matched before "元" / "台幣".
const ALLOWED_AROUND_NUMBER = /新台幣|台幣|元整|NT\s*\$|NTD|TWD|\$|￥|¥|元|塊|["'“”‘’]|\s/gi;
export const MAX_NAME_LENGTH = 20;
const HEADER_AMOUNT_PATTERN = /^(金額|金额|amount)\s*([(（][^)）]*[)）])?$/i;
const ERROR_SNIPPET_MAX = 20;

type LineErrorReason =
  | 'no_delimiter'
  | 'name_missing'
  | 'amount_invalid'
  | 'amount_cap'
  | 'name_too_long';

type LineResult =
  | { ok: true; entry: ParsedEntry }
  | { ok: false; reason: LineErrorReason };

// Design system: state what happened, after the line content in 「」.
const LINE_ERROR_TEXT: Record<LineErrorReason, string> = {
  no_delimiter: '少了逗號',
  name_missing: '少了姓名',
  amount_invalid: '不是金額',
  amount_cap: `金額超過 ${formatNumber(MAX_AMOUNT_PER_ENTRY)}`,
  name_too_long: `姓名超過 ${MAX_NAME_LENGTH} 字`
};

export const ENTRY_LIMIT_ERROR = `太多了喵，算不動 (=ΦдΦ=)（最多 ${formatNumber(MAX_ENTRIES)} 筆）`;

function lineError(lineNumber: number, line: string, reason: string): string {
  return `第 ${lineNumber} 行「${snippet(line)}」${reason}`;
}

/**
 * Extract the amount.
 *
 * The amount is the run from the first digit to the last digit; it must be a plain
 * integer or a correctly grouped thousands number (1,000 / 45,800). The text before
 * and after it may only contain known currencies/units (NT$, $, ￥, TWD, NTD, 新台幣, 台幣, 元, 元整, 塊),
 * after full-width characters are converted to half-width,
 * quotes and spaces; a single leading "+" is also allowed.
 *
 * Returns the digits-only string, or null if the amount is invalid.
 */
/**
 * Convert full-width ASCII (Chinese IME full-width mode) to half-width:
 * １００ → 100, ＄ → $, ＋ → +, ， → ,, full-width space → space.
 */
function toHalfWidth(value: string): string {
  return value
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ');
}

function extractAmount(amountRaw: string): string | null {
  const value = toHalfWidth(amountRaw).trim();
  const first = value.search(/\d/);
  if (first === -1) return null;

  let last = value.length - 1;
  while (!/\d/.test(value[last]!)) last--;

  const prefix = value.slice(0, first);
  const core = value.slice(first, last + 1);
  const suffix = value.slice(last + 1);

  if (!/^\+?$/.test(prefix.replace(ALLOWED_AROUND_NUMBER, ''))) return null;
  if (suffix.replace(ALLOWED_AROUND_NUMBER, '') !== '') return null;
  if (!NUMBER_CORE_PATTERN.test(core)) return null;

  return core.replace(/[,，]/g, '');
}

/**
 * Remove one pair of surrounding quotes from a name ("張三" → 張三), as CSV exports add them.
 */
function cleanName(nameRaw: string): string {
  const name = nameRaw.trim();
  const quoted = name.match(/^(["'])(.*)\1$/);
  return quoted ? quoted[2]!.trim() : name;
}

/**
 * Split a line into name and amount.
 * Tab wins (spreadsheet paste); otherwise the earliest comma, half- or full-width.
 */
function splitLine(trimmed: string): { name: string; amountRaw: string } | null {
  let delimiterIndex = trimmed.indexOf('\t');

  if (delimiterIndex === -1) {
    const commaIndexes = [trimmed.indexOf(','), trimmed.indexOf('，')].filter((i) => i >= 0);
    delimiterIndex = commaIndexes.length ? Math.min(...commaIndexes) : -1;
  }

  if (delimiterIndex === -1) return null;

  return {
    name: cleanName(trimmed.slice(0, delimiterIndex)),
    amountRaw: trimmed.slice(delimiterIndex + 1)
  };
}

/**
 * A header row (e.g. "姓名,金額" / "姓名,金額(元)" from a CSV export or spreadsheet copy)
 * is recognised by its amount column being a known header word.
 */
function isHeaderLine(trimmed: string): boolean {
  const parts = splitLine(trimmed);
  if (!parts) return false;
  return HEADER_AMOUNT_PATTERN.test(cleanName(parts.amountRaw));
}

// Invisible characters that sneak in when copying from web pages / chat apps:
// zero-width space, zero-width non-joiner, word joiner, BOM / zero-width no-break space.
// The zero-width joiner (U+200D) is kept so emoji sequences like 👨‍👩‍👧 stay intact.
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u2060\uFEFF]/g;

function splitInputLines(input: string): string[] {
  // Normalize CRLF and lone CR (old Mac / some Excel exports) to LF
  return input
    .replace(ZERO_WIDTH_CHARS, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
}

/** Amount-only header row: just the amount column title, e.g. "金額" / "金額(元)". */
function isAmountHeaderLine(trimmed: string): boolean {
  return HEADER_AMOUNT_PATTERN.test(cleanName(trimmed));
}

/** Name given to each entry in amount-only mode (N = entry order, 1-based). */
export function amountOnlyEntryName(order: number): string {
  return `第 ${order} 筆`;
}

export interface EntryLines {
  /** Header row (first non-blank line), when there is one */
  header: string | null;
  /** Non-blank entry lines (trimmed), header excluded */
  lines: string[];
}

/**
 * Split input into its header row and entry lines (non-blank, trimmed),
 * e.g. to calculate only the first MAX_ENTRIES lines and keep the rest for later.
 */
export function splitEntryLines(input: string, { includesNames = true }: ParseOptions = {}): EntryLines {
  const contentLines = splitInputLines(input)
    .map((line) => line.trim())
    .filter(Boolean);
  const isHeader = includesNames ? isHeaderLine : isAmountHeaderLine;
  if (contentLines.length && isHeader(contentLines[0]!)) {
    return { header: contentLines[0]!, lines: contentLines.slice(1) };
  }
  return { header: null, lines: contentLines };
}

/**
 * Number of lines that count as entries for the "已貼 N 筆" counter:
 * non-blank lines, excluding a header row on the first non-blank line.
 */
export function countEntryLines(input: string, options: ParseOptions = {}): number {
  return splitEntryLines(input, options).lines.length;
}

function snippet(line: string): string {
  const chars = Array.from(line);
  return chars.length > ERROR_SNIPPET_MAX
    ? `${chars.slice(0, ERROR_SNIPPET_MAX).join('')}…`
    : line;
}

/**
 * Precedence: no delimiter → missing name → invalid amount (incl. zero and a name that
 * still holds a delimiter, i.e. an extra column) → name too long → amount over the cap.
 */
function parseLine(trimmed: string): LineResult {
  const parts = splitLine(trimmed);
  if (!parts) {
    return { ok: false, reason: 'no_delimiter' };
  }

  const { name, amountRaw } = parts;
  if (!name) {
    return { ok: false, reason: 'name_missing' };
  }

  const amountStr = extractAmount(amountRaw);
  const amount = amountStr ? Number(amountStr) : 0;

  // Zero is not an amount for an exchange tool.
  // A name that still contains a comma (possible when the tab is the delimiter) means the line
  // has an extra column: read with the comma as delimiter, its amount side is not an amount.
  if (!amountStr || amount <= 0 || name.includes(',') || name.includes('，') || name.includes('\t')) {
    return { ok: false, reason: 'amount_invalid' };
  }

  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return { ok: false, reason: 'name_too_long' };
  }

  if (amount > MAX_AMOUNT_PER_ENTRY) {
    return { ok: false, reason: 'amount_cap' };
  }

  return { ok: true, entry: { name, amount } };
}

/**
 * Amount-only line: the whole line is one amount, read with the same rules as the amount column.
 * A tab (another column) is never part of an amount.
 */
function parseAmountOnlyLine(trimmed: string): { ok: true; amount: number } | { ok: false; reason: LineErrorReason } {
  const amountStr = trimmed.includes('\t') ? null : extractAmount(trimmed);
  const amount = amountStr ? Number(amountStr) : 0;
  if (!amountStr || amount <= 0) {
    return { ok: false, reason: 'amount_invalid' };
  }
  if (amount > MAX_AMOUNT_PER_ENTRY) {
    return { ok: false, reason: 'amount_cap' };
  }
  return { ok: true, amount };
}

function parseAmountOnly(input: string): ParseResult {
  const lines = splitInputLines(input);
  const entries: ParsedEntry[] = [];
  const errors: string[] = [];
  let totalAmount = 0;
  let isFirstContentLine = true;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed) continue;

    if (isFirstContentLine) {
      isFirstContentLine = false;
      if (isAmountHeaderLine(trimmed)) continue;
    }

    const parsed = parseAmountOnlyLine(trimmed);
    if (!parsed.ok) {
      errors.push(lineError(i + 1, trimmed, LINE_ERROR_TEXT[parsed.reason]));
      continue;
    }

    if (entries.length >= MAX_ENTRIES) {
      errors.push(ENTRY_LIMIT_ERROR);
      break;
    }

    entries.push({ name: amountOnlyEntryName(entries.length + 1), amount: parsed.amount });
    totalAmount += parsed.amount;
  }

  return {
    success: entries.length > 0,
    entries,
    errors,
    total: totalAmount,
    totalEntries: entries.length,
    // Every entry has its own name
    totalNames: entries.length
  };
}

/**
 * Parse money snap input.
 * Pass `{ includesNames: false }` for amount-only input (one amount per line).
 */
export function parseMoneySnap(input: string, { includesNames = true }: ParseOptions = {}): ParseResult {
  if (!includesNames) return parseAmountOnly(input);

  const lines = splitInputLines(input);
  const entries: ParsedEntry[] = [];
  const errors: string[] = [];
  const nameTotals = new Map<string, number>();
  
  let totalAmount = 0;
  let isFirstContentLine = true;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Skip a header row, only if it is the first non-blank line
    if (isFirstContentLine) {
      isFirstContentLine = false;
      if (isHeaderLine(trimmed)) continue;
    }

    const parsed = parseLine(trimmed);

    if (!parsed.ok) {
      errors.push(lineError(i + 1, trimmed, LINE_ERROR_TEXT[parsed.reason]));
      continue;
    }

    if (entries.length >= MAX_ENTRIES) {
      errors.push(ENTRY_LIMIT_ERROR);
      break;
    }

    // A person's aggregated total is capped too (same limit as a single entry)
    const { name, amount } = parsed.entry;
    const nameTotal = (nameTotals.get(name) ?? 0) + amount;
    if (nameTotal > MAX_AMOUNT_PER_ENTRY) {
      errors.push(lineError(i + 1, trimmed, `${name} 合計超過 ${formatNumber(MAX_AMOUNT_PER_ENTRY)}`));
      continue;
    }

    entries.push(parsed.entry);
    nameTotals.set(name, nameTotal);
    totalAmount += amount;
  }
  
  return {
    success: entries.length > 0,
    entries,
    errors,
    total: totalAmount,
    totalEntries: entries.length,
    totalNames: nameTotals.size
  };
}

/**
 * Calculate denomination breakdown (台幣面額)
 * Bills (張): 2000, 1000, 500, 200, 100
 * Coins (個): 50, 10, 5, 1
 */
export interface DenominationBreakdown {
  amount: number;
  denominations: {
    [key: number]: number;
  };
  /** Amount that could not be made with the given denominations (0 when NT$1 is included) */
  remainder: number;
}

export function calculateDenominations(
  amount: number,
  available: readonly number[] = DEFAULT_DENOMINATIONS
): DenominationBreakdown {
  // Greedy from the largest note; sort a copy so any order of `available` works.
  const ordered = [...available].sort((a, b) => b - a);
  const denominations: { [key: number]: number } = Object.fromEntries(
    ordered.map((denom) => [denom, 0])
  );

  let remaining = Math.floor(amount);

  for (const denom of ordered) {
    if (remaining >= denom) {
      denominations[denom] = Math.floor(remaining / denom);
      remaining = remaining % denom;
    }
  }

  return {
    amount,
    denominations,
    remainder: Number.isFinite(remaining) && remaining > 0 ? remaining : 0
  };
}
