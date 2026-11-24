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
