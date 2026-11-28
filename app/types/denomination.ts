/** Physical form of a denomination: bills (NT$100 and up) or coins. */
export enum DenomKind {
  Bill = 'bill',
  Coin = 'coin'
}

/** DenomCell highlight: most-used bill · has a count · zero (dashed & faint). */
export enum DenomCellState {
  Top = 'top',
  Has = 'has',
  Zero = 'zero'
}

/** How many of one denomination, e.g. { denomination: 1000, count: 23 } */
export interface IDenominationItem {
  denomination: number;
  count: number;
}

/** Order of a denomination list */
export enum DenominationOrder {
  LargeFirst = 'large_first',
  SmallFirst = 'small_first'
}

/** One person's total in a calculation (name, or 第 N 筆 for amounts only) */
export interface IResultTotal {
  name: string;
  total: number;
}

/** A person's total broken into the enabled denominations */
export interface IResultRow extends IResultTotal {
  /** Non-zero denominations only, smallest → largest */
  items: IDenominationItem[];
  /** Amount the enabled denominations cannot make */
  remainder: number;
}

/** A bill or coin cell in the 面額統計 */
export interface IDenominationCell {
  value: number;
  count: number;
  /** The most-used bill (bills only) */
  isTop?: boolean;
}
