/** Reading a CSV the user picked (首頁 匯入 CSV) into text for the input box */

/** Largest CSV we read: far more than MAX_ENTRIES lines of 姓名,金額 */
export const MAX_CSV_FILE_BYTES = 1024 * 1024;

/** File picker filter */
export const CSV_ACCEPT = '.csv,text/csv';

export enum CsvFileError {
  TooLarge = 'too_large',
  Unreadable = 'unreadable',
}

export type CsvFileResult = { ok: true; text: string } | { ok: false; error: CsvFileError };

const UTF8_BOM = '﻿';

/**
 * Bytes → text. UTF-8 first (Google Sheets, Numbers, Excel's "CSV UTF-8"); anything that isn't valid
 * UTF-8 is read as Big5, which is what Excel on a Traditional Chinese Windows saves a plain CSV as.
 */
export const decodeCsvBytes = (bytes: ArrayBuffer): string => {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('big5').decode(bytes);
  }
  return text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text;
};

/** The picked file → its text, or why it can't be used */
export const readCsvFile = async (file: File): Promise<CsvFileResult> => {
  if (file.size > MAX_CSV_FILE_BYTES) return { ok: false, error: CsvFileError.TooLarge };
  try {
    return { ok: true, text: decodeCsvBytes(await file.arrayBuffer()) };
  } catch {
    return { ok: false, error: CsvFileError.Unreadable };
  }
};
