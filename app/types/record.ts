export enum InputFormat {
  NameAndAmount = 'name_amount',
  AmountOnly = 'amount',
}

/** What the page hands to insertRecord (camelCase; utils/records.ts maps it to the table's snake_case) */
export interface INewRecord {
  name: string;
  inputFormat: InputFormat;
  entryCount: number;
  totalAmount: number;
  denominations: number[];
  denominationCounts: Record<number, number>;
  rows: { name: string; total: number }[];
}