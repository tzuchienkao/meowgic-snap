import { describe, it, expect } from 'vitest';
import { RecordRange } from '../../types/record';
import {
  periodFromDates,
  periodFromRange,
  rangeForRecord,
  recordDatesLimits,
  validateRecordDates,
} from '../../utils/recordPeriod';
import { toDayKey } from '../../utils/calendar';

const NOW = new Date('2026-11-27T10:00:00+08:00');

describe('utils/recordPeriod', () => {
  it('toDayKey (the <input type="date"> value) gives the local day as YYYY-MM-DD', () => {
    expect(toDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('periodFromRange reaches back N months from now, with no end', () => {
    expect(periodFromRange(RecordRange.ThreeMonths, NOW)).toEqual({ from: new Date('2026-08-27T10:00:00+08:00').toISOString() });
  });

  it('periodFromDates runs from the start day to the midnight after the end day (local)', () => {
    expect(periodFromDates({ start: '2026-06-01', end: '2026-06-30' })).toEqual({
      from: new Date(2026, 5, 1).toISOString(),
      to: new Date(2026, 6, 1).toISOString(),
    });
  });

  it('recordDatesLimits: from 2 years ago to today', () => {
    expect(recordDatesLimits(NOW)).toEqual({ min: '2024-11-27', max: '2026-11-27' });
  });

  describe('validateRecordDates', () => {
    it.each([
      ['2026-06-01', '2026-11-27', ''],
      ['2024-11-27', '2025-05-27', ''],
      ['', '2026-11-27', '請選開始和結束日期喵'],
      ['2026-10-01', '2026-09-01', '開始日期要在結束日期之前喵'],
      ['2024-11-26', '2025-01-31', '只能查 2 年內的紀錄喵'],
      ['2026-11-01', '2026-11-28', '結束日期不能超過今天喵'],
      ['2026-01-01', '2026-07-02', '一次最多查半年喵'],
    ])('%s – %s → "%s"', (start, end, message) => {
      expect(validateRecordDates({ start, end }, NOW)).toBe(message);
    });
  });

  describe('rangeForRecord', () => {
    it('picks the shortest 近 N 個月 that reaches back to the record', () => {
      expect(rangeForRecord('2026-11-20T12:00:00+08:00', NOW)).toEqual({ range: RecordRange.OneMonth, dates: null });
      expect(rangeForRecord('2026-09-01T12:00:00+08:00', NOW)).toEqual({ range: RecordRange.ThreeMonths, dates: null });
      expect(rangeForRecord('2026-06-01T12:00:00+08:00', NOW)).toEqual({ range: RecordRange.SixMonths, dates: null });
    });

    it('an older record: 自訂 ending on its day, half a year long, not before 2 years ago', () => {
      expect(rangeForRecord('2026-03-15T12:00:00+08:00', NOW)).toEqual({
        range: null,
        dates: { start: '2025-09-15', end: '2026-03-15' },
      });
      expect(rangeForRecord('2025-01-10T12:00:00+08:00', NOW)).toEqual({
        range: null,
        dates: { start: '2024-11-27', end: '2025-01-10' },
      });
    });
  });
});
