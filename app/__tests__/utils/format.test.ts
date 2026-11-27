import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, pad2 } from '../../utils/format';

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(24608)).toBe('24,608');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
});

describe('pad2', () => {
  it('pads single digits with a zero', () => {
    expect(pad2(7)).toBe('07');
    expect(pad2(12)).toBe('12');
  });
});

describe('formatDate', () => {
  it('formats a Date in local time', () => {
    expect(formatDate(new Date(2026, 0, 5, 23, 59))).toBe('2026/01/05');
  });

  it('formats an ISO string in local time', () => {
    const local = new Date(2026, 9, 17, 8, 0);
    expect(formatDate(local.toISOString())).toBe('2026/10/17');
  });
});
