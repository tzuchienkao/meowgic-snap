/** Shared display formatting: numbers with thousands separators, dates in local time */

/** 24608 → "24,608" */
export const formatNumber = (value: number): string => value.toLocaleString('en-US');

/** 7 → "07" (dates, times, file names) */
export const pad2 = (value: number): string => String(value).padStart(2, '0');

/** An ISO string or a Date → "2026/10/17" (local time) */
export const formatDate = (value: string | Date): string => {
  const date = new Date(value);
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
};
