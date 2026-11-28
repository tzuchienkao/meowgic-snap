import { describe, it, expect } from 'vitest';
import { CsvFileError, MAX_CSV_FILE_BYTES, decodeCsvBytes, readCsvFile } from '../../utils/csvFile';

const bytes = (...values: number[]) => new Uint8Array(values).buffer;
const utf8 = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe('decodeCsvBytes', () => {
  it('reads UTF-8', () => {
    expect(decodeCsvBytes(utf8('姓名,金額\n張三,18500'))).toBe('姓名,金額\n張三,18500');
  });

  it('drops a UTF-8 BOM (Excel "CSV UTF-8")', () => {
    expect(decodeCsvBytes(utf8('﻿張三,100'))).toBe('張三,100');
  });

  it('falls back to Big5 (Excel on Traditional Chinese Windows)', () => {
    // 張三,100 in Big5
    expect(decodeCsvBytes(bytes(0xb1, 0x69, 0xa4, 0x54, 0x2c, 0x31, 0x30, 0x30))).toBe('張三,100');
  });
});

describe('readCsvFile', () => {
  it('returns the text of the file', async () => {
    const file = new File(['張三,100\n李四,200'], 'data.csv', { type: 'text/csv' });
    expect(await readCsvFile(file)).toEqual({ ok: true, text: '張三,100\n李四,200' });
  });

  it('refuses a file over the size limit without reading it', async () => {
    const file = new File([new Uint8Array(MAX_CSV_FILE_BYTES + 1)], 'big.csv');
    expect(await readCsvFile(file)).toEqual({ ok: false, error: CsvFileError.TooLarge });
  });
});
