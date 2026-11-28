import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildRecordName, insertRecord, toInputFormat } from '../../utils/records';
import { InputFormat, type INewRecord } from '../../types/record';
import { createFakeSupabase, type FakeSupabase } from '../helpers/fakeSupabase';

describe('buildRecordName', () => {
  const date = new Date('2026-11-26T04:00:00Z'); // 12:00 in Taiwan

  it('names the first batch "YYYY/MM/DD 兌換"', () => {
    expect(buildRecordName(date, 1)).toBe('2026/11/26 兌換');
  });

  it('adds " #N" from the second batch on', () => {
    expect(buildRecordName(date, 2)).toBe('2026/11/26 兌換 #2');
    expect(buildRecordName(date, 12)).toBe('2026/11/26 兌換 #12');
  });

  it('uses the Taiwan date whatever the device time zone', () => {
    // 17:30 UTC on the 25th is already 01:30 on the 26th in Taiwan
    expect(buildRecordName(new Date('2026-11-25T17:30:00Z'), 1)).toBe('2026/11/26 兌換');
    // 15:59 UTC on the 26th is still 23:59 on the 26th in Taiwan
    expect(buildRecordName(new Date('2026-11-26T15:59:00Z'), 1)).toBe('2026/11/26 兌換');
  });

  it('stays within the 20-character limit of records.name', () => {
    expect(buildRecordName(date, 999).length).toBeLessThanOrEqual(20);
  });
});

describe('toInputFormat', () => {
  it('maps includesNames to the stored input_format', () => {
    expect(toInputFormat(true)).toBe(InputFormat.NameAndAmount);
    expect(toInputFormat(false)).toBe(InputFormat.AmountOnly);
  });
});

describe('insertRecord', () => {
  let currentUserId: string | null;
  let supabase: FakeSupabase;

  const record: INewRecord = {
    name: '2026/11/26 兌換',
    inputFormat: InputFormat.NameAndAmount,
    entryCount: 3,
    totalAmount: 24387,
    denominations: [1000, 500, 100, 50, 10, 5, 1],
    denominationCounts: { 1000: 23, 100: 13, 50: 1, 10: 3, 5: 1, 1: 2 },
    rows: [
      { name: '張三', total: 20499 },
      { name: '李四', total: 3888 },
    ],
  };

  beforeEach(() => {
    currentUserId = 'u1';
    supabase = createFakeSupabase(() => currentUserId);
    vi.stubGlobal('useNuxtApp', () => ({ $supabase: supabase }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('inserts the record into "records" with snake_case columns and returns the new id', async () => {
    const id = await insertRecord(record);

    expect(supabase.from).toHaveBeenCalledWith('records');
    expect(supabase.tables.records).toEqual([
      {
        id,
        user_id: 'u1',
        name: '2026/11/26 兌換',
        input_format: 'name_amount',
        entry_count: 3,
        total_amount: 24387,
        denominations: [1000, 500, 100, 50, 10, 5, 1],
        denomination_counts: { 1000: 23, 100: 13, 50: 1, 10: 3, 5: 1, 1: 2 },
        rows: [
          { name: '張三', total: 20499 },
          { name: '李四', total: 3888 },
        ],
      },
    ]);
  });

  it('does not send user_id (the table defaults it to the signed-in user)', async () => {
    const insert = vi.fn((_row: Record<string, unknown>) => ({ select: () => ({ single: async () => ({ data: { id: 'r1' }, error: null }) }) }));
    supabase.from.mockReturnValueOnce({ insert } as unknown as ReturnType<FakeSupabase['from']>);

    await insertRecord(record);

    expect(insert.mock.calls[0]![0]).not.toHaveProperty('user_id');
  });

  it('throws the Supabase error so the caller can tell the member', async () => {
    currentUserId = null; // signed out → refused by RLS

    await expect(insertRecord(record)).rejects.toThrow('row-level security');
    expect(supabase.tables.records).toBeUndefined();
  });
});
