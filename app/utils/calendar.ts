/** Local-day helpers for calendars: days are local midnights, keyed "YYYY-MM-DD" (an <input type="date"> value) */

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Local day → "YYYY-MM-DD" */
export const toDayKey = (date: Date): string => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** "YYYY-MM-DD" → local midnight; null for an empty or malformed value */
export const fromDayKey = (key: string | null | undefined): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

/** Local day → "YYYY/MM/DD" */
export const formatDay = (date: Date): string => `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Same day N months later, clamped to the month's last day (01-31 + 1 month → 02-28) */
export const addMonths = (date: Date, months: number) => {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
};

/** Day cells of a month view, Sunday first: null for the blanks before the 1st and after the last day */
export const monthDays = (month: Date): (Date | null)[] => {
  const first = startOfMonth(month);
  const dayCount = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= dayCount; day += 1) cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  while (cells.length % 7) cells.push(null);
  return cells;
};
