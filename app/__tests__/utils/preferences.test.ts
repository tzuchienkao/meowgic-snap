import { describe, it, expect, beforeEach } from 'vitest';
import {
  BILL_DENOMINATIONS,
  buildSampleCsv,
  COIN_DENOMINATIONS,
  createDefaultPreferences,
  formatDenominationLabel,
  GUEST_PREFERENCES_KEY,
  memberPreferencesKey,
  readStoredPreferences,
  RECOMMENDED_DENOMINATION,
  sanitizePreferences,
  writeStoredPreferences,
} from '../../utils/preferences';
import { loadMemberPreferences, saveMemberPreferences } from '../../utils/memberPreferences';

const DEFAULTS = [1000, 500, 100, 50, 10, 5, 1];

describe('utils/preferences', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to names mode with the 7 common denominations', () => {
    expect(createDefaultPreferences()).toEqual({ includesNames: true, denominations: DEFAULTS });
  });

  it('groups bills and coins large → small', () => {
    expect(BILL_DENOMINATIONS).toEqual([2000, 1000, 500, 200, 100]);
    expect(COIN_DENOMINATIONS).toEqual([50, 20, 10, 5, 1]);
    expect(RECOMMENDED_DENOMINATION).toBe(1);
  });

  it('formats labels with the currency prefix and thousands separators', () => {
    expect(formatDenominationLabel(2000)).toBe('NT$2,000');
    expect(formatDenominationLabel(1)).toBe('NT$1');
  });

  describe('sanitizePreferences', () => {
    it('drops unknown denominations, removes duplicates and sorts large → small', () => {
      expect(sanitizePreferences({ includesNames: false, denominations: [1, 3, 500, 1, '100', 2000, 20] })).toEqual({
        includesNames: false,
        denominations: [2000, 500, 20, 1],
      });
    });

    it('falls back to the default denominations when nothing valid is left', () => {
      expect(sanitizePreferences({ includesNames: true, denominations: [] }).denominations).toEqual(DEFAULTS);
      expect(sanitizePreferences({ includesNames: true, denominations: [7, 'x'] }).denominations).toEqual(DEFAULTS);
      expect(sanitizePreferences({ includesNames: true, denominations: 'all' }).denominations).toEqual(DEFAULTS);
    });

    it('non-boolean includesNames becomes true; non-objects become the defaults', () => {
      expect(sanitizePreferences({ includesNames: 'no', denominations: [1] }).includesNames).toBe(true);
      expect(sanitizePreferences(null)).toEqual(createDefaultPreferences());
      expect(sanitizePreferences(42)).toEqual(createDefaultPreferences());
    });
  });

  it('reads stored preferences (sanitised), defaults when missing or broken JSON', () => {
    expect(readStoredPreferences(GUEST_PREFERENCES_KEY)).toEqual(createDefaultPreferences());
    localStorage.setItem(GUEST_PREFERENCES_KEY, '{oops');
    expect(readStoredPreferences(GUEST_PREFERENCES_KEY)).toEqual(createDefaultPreferences());
    writeStoredPreferences(GUEST_PREFERENCES_KEY, { includesNames: false, denominations: [100, 1] });
    expect(readStoredPreferences(GUEST_PREFERENCES_KEY)).toEqual({ includesNames: false, denominations: [100, 1] });
  });

  it('member storage stubs use the member-scoped key until Supabase is wired up', async () => {
    expect(memberPreferencesKey('u1')).toBe('preferences:u1');
    await saveMemberPreferences({ id: 'u1' }, { includesNames: false, denominations: [500, 1] });
    expect(JSON.parse(localStorage.getItem('preferences:u1')!)).toEqual({ includesNames: false, denominations: [500, 1] });
    expect(localStorage.getItem(GUEST_PREFERENCES_KEY)).toBeNull();
    expect(await loadMemberPreferences({ id: 'u1' })).toEqual({ includesNames: false, denominations: [500, 1] });
    expect(await loadMemberPreferences({ id: 'u2' })).toEqual(createDefaultPreferences());
  });

  it('builds a CRLF sample CSV for each mode', () => {
    expect(buildSampleCsv(true)).toBe('姓名,金額\r\n張三,18500\r\n李四,45800\r\n王五,32000');
    expect(buildSampleCsv(false)).toBe('金額\r\n18500\r\n45800\r\n32000');
  });
});
