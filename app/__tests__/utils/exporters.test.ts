import { describe, it, expect } from 'vitest';
import {
  buildCsv,
  buildExportFileName,
  buildSlipImageModel,
  buildSlipText,
  escapeCsvField,
  ExportExt,
  type IExportRow,
} from '../../utils/exporters';
import { DEFAULT_DENOMINATIONS } from '../../utils/moneyParser';
import { DenomKind } from '../../types/denomination';

const EXAMPLE_TOTALS = { 1000: 23, 500: 2, 100: 5, 50: 1, 10: 5, 5: 1, 1: 3 };

describe('buildSlipText', () => {
  it('matches the approved multi-line format', () => {
    expect(
      buildSlipText({ totalAmount: 24608, totals: EXAMPLE_TOTALS, denominations: DEFAULT_DENOMINATIONS }),
    ).toBe(
      '領款總額：24,608元\n' +
        '【紙鈔】1,000元 23張 / 500元 2張 / 100元 5張\n' +
        '【硬幣】50元 1個 / 10元 5個 / 5元 1個 / 1元 3個',
    );
  });

  it('omits the 紙鈔 line when only coins are used', () => {
    expect(buildSlipText({ totalAmount: 66, totals: { 50: 1, 10: 1, 5: 1, 1: 1 }, denominations: DEFAULT_DENOMINATIONS }))
      .toBe('領款總額：66元\n【硬幣】50元 1個 / 10元 1個 / 5元 1個 / 1元 1個');
  });

  it('omits the 硬幣 line when only bills are used and skips zero counts', () => {
    expect(buildSlipText({ totalAmount: 1100, totals: { 1000: 1, 500: 0, 100: 1 }, denominations: DEFAULT_DENOMINATIONS }))
      .toBe('領款總額：1,100元\n【紙鈔】1,000元 1張 / 100元 1張');
  });

  it('adds thousands separators to counts', () => {
    expect(buildSlipText({ totalAmount: 1234000, totals: { 1000: 1234 }, denominations: DEFAULT_DENOMINATIONS }))
      .toBe('領款總額：1,234,000元\n【紙鈔】1,000元 1,234張');
  });

  it('uses the passed denominations (any order), not the defaults', () => {
    expect(
      buildSlipText({ totalAmount: 2040, totals: { 2000: 1, 20: 2, 1000: 9 }, denominations: [20, 2000, 1] }),
    ).toBe('領款總額：2,040元\n【紙鈔】2,000元 1張\n【硬幣】20元 2個');
  });
});

describe('buildCsv', () => {
  const rows: IExportRow[] = [
    { name: '張三', total: 20499, items: [{ denomination: 1, count: 4 }, { denomination: 1000, count: 20 }] },
    { name: '李四', total: 3888, items: [{ denomination: 1000, count: 3 }, { denomination: 500, count: 1 }] },
  ];

  it('writes header, one row per person with zeros, and a 合計 row (CRLF, no separators)', () => {
    const csv = buildCsv({ rows, totalAmount: 24387, denominations: DEFAULT_DENOMINATIONS });
    expect(csv.split('\r\n')).toEqual([
      '姓名,金額,NT$1000,NT$500,NT$100,NT$50,NT$10,NT$5,NT$1',
      '張三,20499,20,0,0,0,0,0,4',
      '李四,3888,3,1,0,0,0,0,0',
      '合計,24387,23,1,0,0,0,0,4',
    ]);
    expect(csv.startsWith('﻿')).toBe(false);
  });

  it('uses the passed denominations as columns', () => {
    const csv = buildCsv({
      rows: [{ name: 'A', total: 2020, items: [{ denomination: 2000, count: 1 }, { denomination: 20, count: 1 }] }],
      totalAmount: 2020,
      denominations: [20, 2000],
    });
    expect(csv).toBe('姓名,金額,NT$2000,NT$20\r\nA,2020,1,1\r\n合計,2020,1,1');
  });

  it('uses 編號 as the first header in amount-only mode (includesNames: false)', () => {
    const csv = buildCsv({
      rows: [{ name: '1', total: 100, items: [{ denomination: 100, count: 1 }] }],
      totalAmount: 100,
      denominations: [100],
      includesNames: false,
    });
    expect(csv).toBe('編號,金額,NT$100\r\n1,100,1\r\n合計,100,1');
  });

  it('keeps 姓名 when includesNames is true or omitted', () => {
    const input = { rows: [], totalAmount: 0, denominations: [1] };
    expect(buildCsv(input).split('\r\n')[0]).toBe('姓名,金額,NT$1');
    expect(buildCsv({ ...input, includesNames: true }).split('\r\n')[0]).toBe('姓名,金額,NT$1');
  });

  it('escapes names with quotes, commas or line breaks (RFC 4180)', () => {
    const csv = buildCsv({
      rows: [{ name: '王"小,五', total: 1, items: [{ denomination: 1, count: 1 }] }],
      totalAmount: 1,
      denominations: [1],
    });
    expect(csv.split('\r\n')[1]).toBe('"王""小,五",1,1');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
    expect(escapeCsvField('plain')).toBe('plain');
  });
});

describe('buildExportFileName', () => {
  it('zero-pads local date and time', () => {
    const date = new Date(2026, 0, 5, 3, 7, 9);
    expect(buildExportFileName(ExportExt.Png, date)).toBe('領款明細_20260105-0307.png');
    expect(buildExportFileName(ExportExt.Csv, new Date(2026, 10, 24, 14, 32))).toBe('領款明細_20261124-1432.csv');
  });
});

describe('buildSlipImageModel', () => {
  it('builds title, time, total and non-zero lines with 小計 (bills, then coins)', () => {
    const model = buildSlipImageModel({
      totalAmount: 24608,
      totals: { ...EXAMPLE_TOTALS, 500: 0 },
      denominations: DEFAULT_DENOMINATIONS,
      calculatedAt: new Date(2026, 10, 24, 9, 5, 3),
    });
    expect(model.title).toBe('神機喵算 領款明細');
    expect(model.timeText).toBe('計算時間 2026/11/24 09:05:03');
    expect(model.totalAmount).toBe('24,608');
    expect(model.totalUnit).toBe('元');
    expect(model.footer).toBe('<(ΦωΦ)> 喵 喵 喵幫你算');
    expect(model.lines).toEqual([
      { kind: DenomKind.Bill, label: 'NT$1,000', value: '23 張', subtotal: '小計 23,000' },
      { kind: DenomKind.Bill, label: 'NT$100', value: '5 張', subtotal: '小計 500' },
      { kind: DenomKind.Coin, label: 'NT$50', value: '1 個', subtotal: '小計 50' },
      { kind: DenomKind.Coin, label: 'NT$10', value: '5 個', subtotal: '小計 50' },
      { kind: DenomKind.Coin, label: 'NT$5', value: '1 個', subtotal: '小計 5' },
      { kind: DenomKind.Coin, label: 'NT$1', value: '3 個', subtotal: '小計 3' },
    ]);
  });

  it('adds the entry count to the time line, with thousands separators', () => {
    const base = { totalAmount: 1, totals: { 1: 1 }, denominations: [1], calculatedAt: new Date(2026, 0, 2, 3, 4, 5) };
    expect(buildSlipImageModel({ ...base, entryCount: 3 }).timeText).toBe('計算時間 2026/01/02 03:04:05 · 共 3 筆');
    expect(buildSlipImageModel({ ...base, entryCount: 1200 }).timeText).toBe('計算時間 2026/01/02 03:04:05 · 共 1,200 筆');
  });

  it('appends a record name to the title, ignoring a blank one', () => {
    const base = { totalAmount: 1, totals: { 1: 1 }, denominations: [1], calculatedAt: new Date() };
    expect(buildSlipImageModel({ ...base, name: ' 十一月薪資 ' }).title).toBe('神機喵算 領款明細｜十一月薪資');
    expect(buildSlipImageModel({ ...base, name: '  ' }).title).toBe('神機喵算 領款明細');
  });

  it('subtotals use thousands separators and custom denominations', () => {
    const model = buildSlipImageModel({
      totalAmount: 2040000,
      totals: { 2000: 1020 },
      denominations: [2000, 20],
      calculatedAt: new Date(),
    });
    expect(model.lines).toEqual([
      { kind: DenomKind.Bill, label: 'NT$2,000', value: '1,020 張', subtotal: '小計 2,040,000' },
    ]);
  });
});

describe('escapeCsvField — formula injection', () => {
  it.each(['=SUM(A1)', '+886', '-1', '@cmd', '\tx'])('prefixes %j with an apostrophe', (name) => {
    expect(escapeCsvField(name).startsWith("'") || escapeCsvField(name).startsWith('"\'')).toBe(true);
  });

  it('leaves normal names and numbers untouched', () => {
    expect(escapeCsvField('張三')).toBe('張三');
    expect(escapeCsvField(-1)).toBe('-1');
    expect(escapeCsvField(18500)).toBe('18500');
  });

  it('still quotes fields that need quoting after prefixing', () => {
    expect(escapeCsvField('=a,b')).toBe('"\'=a,b"');
  });
});

