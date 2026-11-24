import { describe, it, expect } from 'vitest';
import {
  countEntryLines,
  ENTRY_LIMIT_ERROR,
  MAX_ENTRIES,
  parseMoneySnap,
  splitEntryLines,
} from '../../utils/moneyParser';

const amountOnly = { includesNames: false } as const;
const parse = (input: string) => parseMoneySnap(input, amountOnly);

describe('parseMoneySnap — amount-only mode (純金額)', () => {
  it('reads one amount per line and names entries 「第 N 筆」 so they never merge', () => {
    const result = parse('100\n100\n2500');
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.entries).toEqual([
      { name: '第 1 筆', amount: 100 },
      { name: '第 2 筆', amount: 100 },
      { name: '第 3 筆', amount: 2500 },
    ]);
    expect(result.total).toBe(2700);
    expect(result.totalEntries).toBe(3);
    expect(result.totalNames).toBe(3);
  });

  it('uses the same amount rules: thousands separators, quotes, currency and unit text', () => {
    const result = parse('18500\n"45,800"\nNT$32,000\n1,999元\n＄１００\n新台幣 300 元整');
    expect(result.errors).toEqual([]);
    expect(result.entries.map((e) => e.amount)).toEqual([18500, 45800, 32000, 1999, 100, 300]);
  });

  it('numbers entries by entry order, skipping blank lines and errors', () => {
    const result = parse('100\n\nabc\n200');
    expect(result.entries.map((e) => e.name)).toEqual(['第 1 筆', '第 2 筆']);
    expect(result.errors).toEqual(['第 3 行「abc」不是金額']);
  });

  it('skips a 金額 header on the first line only', () => {
    expect(parse('金額\n100').entries).toEqual([{ name: '第 1 筆', amount: 100 }]);
    expect(parse('金額(元)\n100').totalEntries).toBe(1);
    expect(parse('"金額"\n100').totalEntries).toBe(1);
    expect(parse('100\n金額').errors).toEqual(['第 2 行「金額」不是金額']);
  });

  it('rejects negatives, decimals, zero, unknown text, names and extra columns as 不是金額', () => {
    const result = parse('-100\n100.5\n0\n100 退款\n張三,100\n100\t200\n1,00');
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      '第 1 行「-100」不是金額',
      '第 2 行「100.5」不是金額',
      '第 3 行「0」不是金額',
      '第 4 行「100 退款」不是金額',
      '第 5 行「張三,100」不是金額',
      '第 6 行「100\t200」不是金額',
      '第 7 行「1,00」不是金額',
    ]);
  });

  it('rejects amounts over 999,999 with the cap error and accepts 999,999', () => {
    expect(parse('1000000').errors).toEqual(['第 1 行「1000000」金額超過 999,999']);
    expect(parse('999,999').entries).toEqual([{ name: '第 1 筆', amount: 999999 }]);
  });

  it('applies the entry limit', () => {
    const input = Array.from({ length: MAX_ENTRIES + 1 }, () => '1').join('\n');
    const result = parse(input);
    expect(result.totalEntries).toBe(MAX_ENTRIES);
    expect(result.errors).toEqual([ENTRY_LIMIT_ERROR]);
  });

  it('defaults to the names mode (姓名,金額)', () => {
    expect(parseMoneySnap('100').errors).toEqual(['第 1 行「100」少了逗號']);
    expect(parseMoneySnap('張三,100', { includesNames: true }).entries).toEqual([{ name: '張三', amount: 100 }]);
  });
});

describe('countEntryLines — amount-only mode', () => {
  it('counts non-blank lines and excludes a 金額 header', () => {
    expect(countEntryLines('金額\n100\n\n200', amountOnly)).toBe(2);
    expect(countEntryLines('100\n200', amountOnly)).toBe(2);
  });

  it('names mode still needs a 姓名,金額 header to skip it', () => {
    expect(countEntryLines('金額\n100')).toBe(2);
    expect(countEntryLines('姓名,金額\n張三,100')).toBe(1);
  });
});

describe('splitEntryLines', () => {
  it('keeps the header apart and returns trimmed non-blank entry lines', () => {
    expect(splitEntryLines('姓名,金額\n 張三,100 \n\n李四,200')).toEqual({
      header: '姓名,金額',
      lines: ['張三,100', '李四,200'],
    });
  });

  it('has no header when the first line is an entry', () => {
    expect(splitEntryLines('張三,100\r\n李四,200')).toEqual({ header: null, lines: ['張三,100', '李四,200'] });
  });

  it('uses the amount-only header rule in amount-only mode', () => {
    expect(splitEntryLines('金額\n100', amountOnly)).toEqual({ header: '金額', lines: ['100'] });
    expect(splitEntryLines('金額\n100')).toEqual({ header: null, lines: ['金額', '100'] });
  });
});
