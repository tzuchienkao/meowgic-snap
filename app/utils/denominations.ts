import { DenominationOrder, type IDenominationItem } from '~/types/denomination';

/**
 * Counts per denomination (e.g. { 1000: 23, 500: 2, 100: 0 }) → the non-zero ones as items,
 * large → small by default.
 */
export const toDenominationItems = (
  counts: Readonly<Record<number, number>>,
  order: DenominationOrder = DenominationOrder.LargeFirst,
): IDenominationItem[] => {
  const direction = order === DenominationOrder.LargeFirst ? -1 : 1;
  return Object.entries(counts)
    .map(([denomination, count]) => ({ denomination: Number(denomination), count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => (a.denomination - b.denomination) * direction);
};
