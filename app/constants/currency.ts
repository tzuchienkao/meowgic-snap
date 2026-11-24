/** Prefix shown before every NT$ denomination / amount, e.g. "NT$1,000". */
export const CURRENCY_PREFIX = 'NT$';

/** Counting units: bills are counted in 張, coins in 個, amounts in 元. */
export enum CurrencyUnit {
  Bill = '張',
  Coin = '個',
  Dollar = '元'
}
