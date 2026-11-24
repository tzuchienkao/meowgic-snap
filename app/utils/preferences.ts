/**
 * 偏好設定 (preferences): model, defaults, sanitising and storage keys.
 * Pure helpers — the reactive state lives in composables/usePreferences.ts.
 */
import { CURRENCY_PREFIX } from '~/constants/currency';
import { ALL_DENOMINATIONS, DEFAULT_DENOMINATIONS, isBill } from '~/utils/moneyParser';
import {
  CSV_AMOUNT_HEADER,
  CSV_LINE_BREAK,
  CSV_NAME_HEADER,
  escapeCsvField,
} from '~/utils/exporters';

export interface IPreferences {
  /** true: lines are 「姓名,金額」 · false: amount only (純金額) */
  includesNames: boolean;
  /** Enabled denominations, a subset of ALL_DENOMINATIONS, large → small (never empty) */
  denominations: number[];
}

/** localStorage key for guests; members use `preferences:<userId>` (see memberPreferences.ts). */
export const GUEST_PREFERENCES_KEY = 'preferences';

export const memberPreferencesKey = (userId: string) => `${GUEST_PREFERENCES_KEY}:${userId}`;

export const createDefaultPreferences = (): IPreferences => ({
  includesNames: true,
  denominations: [...DEFAULT_DENOMINATIONS],
});

/** 偏好設定 groups (large → small). */
export const BILL_DENOMINATIONS: readonly number[] = ALL_DENOMINATIONS.filter(isBill);
export const COIN_DENOMINATIONS: readonly number[] = ALL_DENOMINATIONS.filter((value) => !isBill(value));

/** The smallest denomination; turning it off can leave a remainder, so it is 「建議保留」. */
export const RECOMMENDED_DENOMINATION = Math.min(...ALL_DENOMINATIONS);

/** "NT$2,000" */
export const formatDenominationLabel = (value: number) =>
  `${CURRENCY_PREFIX}${value.toLocaleString('en-US')}`;

const KNOWN_DENOMINATIONS = new Set<number>(ALL_DENOMINATIONS);

/** Known denominations only, no duplicates, large → small; an empty result falls back to the defaults. */
export function sanitizeDenominations(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_DENOMINATIONS];
  const unique = [...new Set(value.filter((item): item is number => KNOWN_DENOMINATIONS.has(item)))];
  return unique.length ? unique.sort((a, b) => b - a) : [...DEFAULT_DENOMINATIONS];
}

/** Turn anything loaded from storage into valid preferences. */
export function sanitizePreferences(value: unknown): IPreferences {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    includesNames: typeof raw.includesNames === 'boolean' ? raw.includesNames : true,
    denominations: sanitizeDenominations(raw.denominations),
  };
}

/** Read and sanitise preferences saved under a localStorage key (defaults when missing or broken). */
export function readStoredPreferences(key: string): IPreferences {
  try {
    const saved = localStorage.getItem(key);
    return saved ? sanitizePreferences(JSON.parse(saved)) : createDefaultPreferences();
  } catch {
    return createDefaultPreferences();
  }
}

export function writeStoredPreferences(key: string, preferences: IPreferences): void {
  try {
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Storage full or blocked: the in-memory preferences still apply for this visit
  }
}

// --- CSV 範例 -----------------------------------------------------------------

export const SAMPLE_CSV_FILE_NAME = {
  names: '神機喵算_範例_姓名金額.csv',
  amountOnly: '神機喵算_範例_純金額.csv',
} as const;

const SAMPLE_ROWS: readonly [string, number][] = [
  ['張三', 18500],
  ['李四', 45800],
  ['王五', 32000],
];

/** Small sample CSV for the current mode (no BOM — createCsvBlob adds it; CRLF like buildCsv). */
export function buildSampleCsv(includesNames: boolean): string {
  const lines = includesNames
    ? [[CSV_NAME_HEADER, CSV_AMOUNT_HEADER], ...SAMPLE_ROWS]
    : [[CSV_AMOUNT_HEADER], ...SAMPLE_ROWS.map(([, amount]) => [amount])];
  return lines.map((cells) => cells.map(escapeCsvField).join(',')).join(CSV_LINE_BREAK);
}

/* Pure updates — return a new object, or the same one when nothing changes (so callers can skip saving). */

export function withIncludesNames(preferences: IPreferences, includesNames: boolean): IPreferences {
  return preferences.includesNames === includesNames ? preferences : { ...preferences, includesNames };
}

/** Turn one denomination on / off; turning off the last enabled one is ignored. */
export function withDenominationToggled(preferences: IPreferences, value: number): IPreferences {
  const current = preferences.denominations;
  if (current.includes(value)) {
    if (current.length <= 1) return preferences;
    return { ...preferences, denominations: current.filter((item) => item !== value) };
  }
  return { ...preferences, denominations: sanitizeDenominations([...current, value]) };
}

/** 全選: turn a whole group on / off; a change that would leave nothing enabled is ignored. */
export function withDenominationGroup(
  preferences: IPreferences,
  values: readonly number[],
  enabled: boolean
): IPreferences {
  const current = preferences.denominations;
  const next = enabled
    ? sanitizeDenominations([...current, ...values])
    : current.filter((item) => !values.includes(item));
  if (!next.length || (next.length === current.length && next.every((d, i) => d === current[i]))) return preferences;
  return { ...preferences, denominations: next };
}

export const arePreferencesEqual = (a: IPreferences, b: IPreferences) =>
  a.includesNames === b.includesNames &&
  a.denominations.length === b.denominations.length &&
  a.denominations.every((d, i) => d === b.denominations[i]);

export const clonePreferences = (preferences: IPreferences): IPreferences => ({
  includesNames: preferences.includesNames,
  denominations: [...preferences.denominations]
});

