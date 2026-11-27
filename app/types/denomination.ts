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
