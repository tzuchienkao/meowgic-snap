/**
 * Pure builders for the result exports (copy slip · PNG slip · CSV).
 * Everything takes the denominations used for the calculation, so a custom set
 * (偏好設定) works without changes here.
 */
import { CURRENCY_PREFIX, CurrencyUnit } from '~/constants/currency';
import { DenomKind } from '~/types/denomination';
import { isBill } from '~/utils/moneyParser';

export interface IExportRow {
  name: string;
  total: number;
  items: { denomination: number; count: number }[];
}

/** Count per denomination, e.g. { 1000: 23, 500: 2 } */
export type DenominationTotals = Record<number, number>;

export interface ISlipInput {
  totalAmount: number;
  totals: DenominationTotals;
  /** The denominations used for the calculation (any order) */
  denominations: readonly number[];
}

export const SLIP_TITLE = '神機喵算 領款明細';
export const SLIP_FOOTER = '<(ΦωΦ)> 喵 喵 喵幫你算';
/** Separator between the title and an optional record name */
export const SLIP_NAME_SEPARATOR = '｜';
export const SLIP_SUBTOTAL_LABEL = '小計';
export const SLIP_TOTAL_LABEL = '領款總額';
export const SLIP_BILL_LABEL = '紙鈔';
export const SLIP_COIN_LABEL = '硬幣';
export const CSV_NAME_HEADER = '姓名';
/** First header in 純金額 mode (rows are numbered, not named) */
export const CSV_INDEX_HEADER = '編號';
export const CSV_AMOUNT_HEADER = '金額';
export const CSV_TOTAL_LABEL = '合計';
export const CSV_LINE_BREAK = '\r\n';
export const EXPORT_FILE_PREFIX = '領款明細';

export enum ExportExt {
  Png = 'png',
  Csv = 'csv'
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
const pad2 = (value: number) => String(value).padStart(2, '0');
const unitOf = (denomination: number) => (isBill(denomination) ? CurrencyUnit.Bill : CurrencyUnit.Coin);
const largeToSmall = (denominations: readonly number[]) => [...denominations].sort((a, b) => b - a);

interface IDenomLine {
  denomination: number;
  count: number;
}

/** Non-zero denominations, large → small, split into bills and coins. */
const splitLines = ({ totals, denominations }: ISlipInput) => {
  const lines: IDenomLine[] = largeToSmall(denominations)
    .map((denomination) => ({ denomination, count: totals[denomination] ?? 0 }))
    .filter((line) => line.count > 0);
  return {
    bills: lines.filter((line) => isBill(line.denomination)),
    coins: lines.filter((line) => !isBill(line.denomination)),
  };
};

/**
 * Text copied for the bank, e.g.
 * 領款總額：24,608元
 * 【紙鈔】1,000元 23張 / 500元 2張
 * 【硬幣】50元 1個 / 1元 3個
 */
export function buildSlipText(input: ISlipInput): string {
  const { bills, coins } = splitLines(input);
  const formatGroup = (label: string, group: IDenomLine[]) =>
    `【${label}】` +
    group
      .map(({ denomination, count }) =>
        `${formatNumber(denomination)}${CurrencyUnit.Dollar} ${formatNumber(count)}${unitOf(denomination)}`)
      .join(' / ');

  const lines = [`${SLIP_TOTAL_LABEL}：${formatNumber(input.totalAmount)}${CurrencyUnit.Dollar}`];
  if (bills.length) lines.push(formatGroup(SLIP_BILL_LABEL, bills));
  if (coins.length) lines.push(formatGroup(SLIP_COIN_LABEL, coins));
  return lines.join('\n');
}

/** RFC 4180: quote fields containing a comma, quote or line break; double inner quotes. */
export function escapeCsvField(value: string | number): string {
  let text = String(value);
  // Spreadsheet formula injection: text starting with = + - @ (or tab / CR) is run as a formula by
  // Excel / Sheets, so prefix it with ' to keep it as plain text. Numbers are left untouched.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV (no BOM, CRLF): 姓名|編號,金額,NT$<denominations large → small>, one row per person, then 合計.
 * includesNames (default true) picks 姓名 vs 編號 for the first header (純金額 mode).
 * Numbers have no thousands separators.
 */
export function buildCsv(input: {
  rows: IExportRow[];
  totalAmount: number;
  denominations: readonly number[];
  includesNames?: boolean;
}): string {
  const columns = largeToSmall(input.denominations);
  const totals: DenominationTotals = {};

  const body = input.rows.map((row) => {
    const counts: DenominationTotals = {};
    row.items.forEach(({ denomination, count }) => {
      counts[denomination] = (counts[denomination] ?? 0) + count;
      totals[denomination] = (totals[denomination] ?? 0) + count;
    });
    return [row.name, row.total, ...columns.map((d) => counts[d] ?? 0)];
  });

  const firstHeader = input.includesNames === false ? CSV_INDEX_HEADER : CSV_NAME_HEADER;
  const table = [
    [firstHeader, CSV_AMOUNT_HEADER, ...columns.map((d) => `${CURRENCY_PREFIX}${d}`)],
    ...body,
    [CSV_TOTAL_LABEL, input.totalAmount, ...columns.map((d) => totals[d] ?? 0)],
  ];
  return table.map((fields) => fields.map(escapeCsvField).join(',')).join(CSV_LINE_BREAK);
}

/** 領款明細_20261124-1432.png (local time, zero-padded) */
export function buildExportFileName(ext: ExportExt | string, date: Date): string {
  const stamp =
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `-${pad2(date.getHours())}${pad2(date.getMinutes())}`;
  return `${EXPORT_FILE_PREFIX}_${stamp}.${ext}`;
}

/** 2026/11/24 14:32:05 (local time) */
export function formatSlipTimestamp(date: Date): string {
  return (
    `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
}

export interface ISlipImageLine {
  kind: DenomKind;
  /** NT$1,000 */
  label: string;
  /** 23 張 */
  value: string;
  /** 小計 23,000 */
  subtotal: string;
}

export interface ISlipImageModel {
  /** 神機喵算 領款明細 (｜record name) */
  title: string;
  /** 計算時間 2026/11/24 14:32:05 (· 共 N 筆) */
  timeText: string;
  /** 24,608 */
  totalAmount: string;
  totalUnit: string;
  /** Non-zero denominations, large → small (bills, then coins) */
  lines: ISlipImageLine[];
  footer: string;
}

export interface ISlipImageInput extends ISlipInput {
  calculatedAt: Date;
  /** Number of entries (lines) calculated; adds 「· 共 N 筆」 when given */
  entryCount?: number;
  /** Optional record name shown after the title */
  name?: string;
}

/** Layout data for the PNG slip; drawing code only paints it. */
export function buildSlipImageModel(input: ISlipImageInput): ISlipImageModel {
  const { bills, coins } = splitLines(input);
  const lines = [...bills, ...coins].map(({ denomination, count }) => ({
    kind: isBill(denomination) ? DenomKind.Bill : DenomKind.Coin,
    label: `${CURRENCY_PREFIX}${formatNumber(denomination)}`,
    value: `${formatNumber(count)} ${unitOf(denomination)}`,
    subtotal: `${SLIP_SUBTOTAL_LABEL} ${formatNumber(denomination * count)}`,
  }));

  const name = input.name?.trim();
  const time = `計算時間 ${formatSlipTimestamp(input.calculatedAt)}`;
  return {
    title: name ? `${SLIP_TITLE}${SLIP_NAME_SEPARATOR}${name}` : SLIP_TITLE,
    timeText: input.entryCount === undefined ? time : `${time} · 共 ${formatNumber(input.entryCount)} 筆`,
    totalAmount: formatNumber(input.totalAmount),
    totalUnit: CurrencyUnit.Dollar,
    lines,
    footer: SLIP_FOOTER,
  };
}
