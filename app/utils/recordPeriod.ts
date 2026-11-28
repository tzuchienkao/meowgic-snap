import { addDays, fromDayKey, startOfDay, toDayKey } from '~/utils/calendar';
import { MAX_RANGE_MONTHS, RECORD_DATES_ERRORS, RECORD_RANGE_OPTIONS, RECORD_RETENTION_YEARS } from '~/constants/record';
import type { IRecordDates, IRecordPeriod, RecordRange } from '~/types/record';

/** "YYYY-MM-DD" → local midnight; only called with days that passed validation */
const dayOf = (key: string): Date => fromDayKey(key)!;

/**
 * Same time N months later, overflowing into the next month (08-31 + 6 months → 03-03), unlike the
 * calendar's clamped addMonths: the 查詢區間 limits have always been worked out this way.
 */
const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/** 近 N 個月: from N months ago (now) to now */
export const periodFromRange = (range: RecordRange, now = new Date()): IRecordPeriod => ({
  from: addMonths(now, -range).toISOString(),
});

/** 自訂: from the start day's midnight to the midnight after the end day */
export const periodFromDates = ({ start, end }: IRecordDates): IRecordPeriod => ({
  from: dayOf(start).toISOString(),
  to: addDays(dayOf(end), 1).toISOString(),
});

/** The earliest and latest days a 自訂 查詢區間 can use, as <input type="date"> min / max */
export const recordDatesLimits = (now = new Date()) => ({
  min: toDayKey(addMonths(startOfDay(now), -12 * RECORD_RETENTION_YEARS)),
  max: toDayKey(startOfDay(now)),
});

/** Why a 自訂 查詢區間 can't be used ('' when it can) */
export const validateRecordDates = ({ start, end }: IRecordDates, now = new Date()): string => {
  if (!start || !end) return RECORD_DATES_ERRORS.required;
  const { min, max } = recordDatesLimits(now);
  // YYYY-MM-DD strings compare in date order
  if (start > end) return RECORD_DATES_ERRORS.order;
  if (start < min) return RECORD_DATES_ERRORS.tooOld;
  if (end > max) return RECORD_DATES_ERRORS.future;
  if (end > toDayKey(addMonths(dayOf(start), MAX_RANGE_MONTHS))) return RECORD_DATES_ERRORS.tooLong;
  return '';
};

/**
 * The 查詢區間 that shows a record created at `createdAt` near the top of the list: the shortest 近 N 個月
 * that reaches back to it; for an older one, 自訂 ending on its day (so it is the newest), half a year long.
 */
export const rangeForRecord = (
  createdAt: string,
  now = new Date(),
): { range: RecordRange; dates: null } | { range: null; dates: IRecordDates } => {
  const range = RECORD_RANGE_OPTIONS.map((option) => option.value)
    .sort((a, b) => a - b)
    .find((value) => new Date(createdAt) >= new Date(periodFromRange(value, now).from));
  if (range) return { range, dates: null };
  const end = startOfDay(new Date(createdAt));
  const start = toDayKey(addMonths(end, -MAX_RANGE_MONTHS));
  const { min } = recordDatesLimits(now);
  return { range: null, dates: { start: start < min ? min : start, end: toDayKey(end) } };
};
