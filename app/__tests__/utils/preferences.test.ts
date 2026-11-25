import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('member preferences are loaded from Supabase getUser() with server-fresh data', async () => {
    // Mock useNuxtApp for Supabase client
    const mockSupabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'u1',
              user_metadata: {
                preferences: { includesNames: false, denominations: [500, 1] },
              },
            },
          },
        })),
        updateUser: vi.fn(async () => ({ error: null })),
      },
    };
    vi.stubGlobal('useNuxtApp', () => ({ $supabase: mockSupabase }));

    // Load from Supabase
    expect(await loadMemberPreferences({ id: 'u1' })).toEqual({
      includesNames: false,
      denominations: [500, 1],
    });

    // Save to Supabase
    await saveMemberPreferences({ id: 'u1' }, { includesNames: true, denominations: [1] });
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { preferences: { includesNames: true, denominations: [1] } },
    });
  });

  it('member load fails if the authenticated user does not match the requested user', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'u2', user_metadata: {} } },
        })),
      },
    };
    vi.stubGlobal('useNuxtApp', () => ({ $supabase: mockSupabase }));

    await expect(loadMemberPreferences({ id: 'u1' })).rejects.toThrow(
      'Authenticated user (u2) does not match requested user (u1)',
    );
  });

  it('member load rethrows the getUser error instead of reporting an account mismatch', async () => {
    localStorage.setItem('preferences:u1', JSON.stringify({ includesNames: false, denominations: [500, 1] }));
    const networkError = new Error('Failed to fetch');
    const mockSupabase = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: networkError })),
        updateUser: vi.fn(async () => ({ error: null })),
      },
    };
    vi.stubGlobal('useNuxtApp', () => ({ $supabase: mockSupabase }));

    await expect(loadMemberPreferences({ id: 'u1' })).rejects.toBe(networkError);
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled(); // no migration on a failed read
  });

  it('member load migrates localStorage preferences to Supabase on first load', async () => {
    // Save to localStorage first
    localStorage.setItem('preferences:u1', JSON.stringify({ includesNames: false, denominations: [500, 1] }));

    // Mock Supabase: empty preferences, but updateUser succeeds
    const mockSupabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: 'u1',
              user_metadata: { preferences: undefined }, // No Supabase data yet
            },
          },
        })),
        updateUser: vi.fn(async () => ({ error: null })),
      },
    };
    vi.stubGlobal('useNuxtApp', () => ({ $supabase: mockSupabase }));

    // Load: should return localStorage value and migrate it
    expect(await loadMemberPreferences({ id: 'u1' })).toEqual({
      includesNames: false,
      denominations: [500, 1],
    });

    // The migration write is fire-and-forget, but updateUser is called right away
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { preferences: { includesNames: false, denominations: [500, 1] } },
    });
  });

  it('builds a CRLF sample CSV for each mode', () => {
    expect(buildSampleCsv(true)).toBe('姓名,金額\r\n張三,18500\r\n李四,45800\r\n王五,32000');
    expect(buildSampleCsv(false)).toBe('金額\r\n18500\r\n45800\r\n32000');
  });
});
