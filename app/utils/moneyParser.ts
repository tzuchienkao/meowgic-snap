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

export const MAX_ENTRIES = 1000;
export const MAX_AMOUNT_PER_ENTRY = 999999;
export const DENOMINATIONS = [1000, 500, 100, 50, 10, 5, 1] as const;

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

type LineResult =
  | { ok: true; entry: ParsedEntry }
  | { ok: false; reason: 'format' | 'amount_cap' | 'name_too_long' };

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

/**
 * Number of lines that count as entries for the "已貼 N 筆" counter:
 * non-blank lines, excluding a header row on the first non-blank line.
 */
export function countEntryLines(input: string): number {
  const contentLines = splitInputLines(input)
    .map((line) => line.trim())
    .filter(Boolean);
  if (contentLines.length && isHeaderLine(contentLines[0]!)) {
    return contentLines.length - 1;
  }
  return contentLines.length;
}

function snippet(line: string): string {
  const chars = Array.from(line);
  return chars.length > ERROR_SNIPPET_MAX
    ? `${chars.slice(0, ERROR_SNIPPET_MAX).join('')}…`
    : line;
}

function parseLine(trimmed: string): LineResult {
  const formatError: LineResult = { ok: false, reason: 'format' };

  const parts = splitLine(trimmed);
  if (!parts) {
    return formatError;
  }

  const { name, amountRaw } = parts;
  const amountStr = extractAmount(amountRaw);

  if (!name || !amountStr) {
    return formatError;
  }

  // Names cannot contain delimiters (possible when the tab is the delimiter)
  if (name.includes(',') || name.includes('，') || name.includes('\t')) {
    return formatError;
  }

  if (Array.from(name).length > MAX_NAME_LENGTH) {
    return { ok: false, reason: 'name_too_long' };
  }

  const amount = Number(amountStr);

  if (amount <= 0) {
    return formatError;
  }

  if (amount > MAX_AMOUNT_PER_ENTRY) {
    return { ok: false, reason: 'amount_cap' };
  }

  return { ok: true, entry: { name, amount } };
}

/**
 * Parse money snap input
 */
export function parseMoneySnap(input: string): ParseResult {
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
      const reason = {
        format: '格式錯誤',
        amount_cap: `金額超過上限 (${MAX_AMOUNT_PER_ENTRY.toLocaleString('en-US')})`,
        name_too_long: `姓名超過 ${MAX_NAME_LENGTH} 字`
      }[parsed.reason];
      errors.push(`第 ${i + 1} 行: ${reason}（${snippet(trimmed)}）`);
      continue;
    }

    if (entries.length >= MAX_ENTRIES) {
      errors.push(`超過最大筆數限制 (${MAX_ENTRIES})`);
      break;
    }

    // A person's aggregated total is capped too (same limit as a single entry)
    const { name, amount } = parsed.entry;
    const nameTotal = (nameTotals.get(name) ?? 0) + amount;
    if (nameTotal > MAX_AMOUNT_PER_ENTRY) {
      errors.push(
        `第 ${i + 1} 行: ${name} 合計金額超過上限 (${MAX_AMOUNT_PER_ENTRY.toLocaleString('en-US')})（${snippet(trimmed)}）`
      );
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
 * Bills: 1000, 500, 100, 50, 10, 5, 1 (NT$)
 * Coins: same as bills in this implementation
 */
export interface DenominationBreakdown {
  amount: number;
  denominations: {
    [key: number]: number;
  };
}

export function calculateDenominations(amount: number): DenominationBreakdown {
  const denominations: { [key: number]: number } = Object.fromEntries(
    DENOMINATIONS.map((denom) => [denom, 0])
  );
  
  let remaining = Math.floor(amount);
  
  for (const denom of DENOMINATIONS) {
    if (remaining >= denom) {
      denominations[denom] = Math.floor(remaining / denom);
      remaining = remaining % denom;
    }
  }
  
  return {
    amount,
    denominations
  };
}
