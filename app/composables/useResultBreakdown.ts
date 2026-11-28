import { computed, type Ref } from 'vue';
import type { IDenominationCell, IResultRow, IResultTotal } from '~/types/denomination';
import { DenominationOrder } from '~/types/denomination';
import { toDenominationItems } from '~/utils/denominations';
import { ALL_DENOMINATIONS, calculateDenominations, isBill } from '~/utils/moneyParser';

/**
 * 首頁 result: each person's total broken into the enabled denominations, the totals per
 * denomination across everyone, and what can't be made with them.
 */
export const useResultBreakdown = (rows: Ref<IResultTotal[]>, denominations: Ref<number[]>) => {
  // Always with the current 偏好設定 denominations
  const resultRows = computed<IResultRow[]>(() =>
    rows.value.map((row) => {
      const breakdown = calculateDenominations(row.total, denominations.value);
      return {
        ...row,
        items: toDenominationItems(breakdown.denominations, DenominationOrder.SmallFirst),
        remainder: breakdown.remainder,
      };
    }),
  );

  /** Count per denomination across everyone */
  const denominationTotals = computed(() => {
    const totals: Record<number, number> = {};
    resultRows.value.forEach((row) => {
      row.items.forEach(({ denomination, count }) => {
        totals[denomination] = (totals[denomination] ?? 0) + count;
      });
    });
    return totals;
  });

  // DS: the most-used bill is highlighted (ties → the larger bill); no highlight when no bills are used
  const billCells = computed<IDenominationCell[]>(() => {
    const cells = denominations.value.filter(isBill).map((value) => ({
      value,
      count: denominationTotals.value[value] ?? 0,
      isTop: false,
    }));
    // No bills enabled (coins only) → no cells and no highlight
    const top = cells.reduce<(typeof cells)[number] | undefined>(
      (best, cell) => (!best || cell.count > best.count ? cell : best),
      undefined,
    );
    if (top && top.count > 0) top.isTop = true;
    return cells;
  });

  const coinCells = computed<IDenominationCell[]>(() =>
    denominations.value.filter((value) => !isBill(value)).map((value) => ({
      value,
      count: denominationTotals.value[value] ?? 0,
    })),
  );

  /**
   * What the enabled denominations can't make: the total left over and the smallest turned-off
   * denomination that would have been needed (a remainder is always below the smallest enabled
   * one, so every denomination the full breakdown uses for it is a turned-off one — usually NT$1).
   */
  const remainder = computed(() => {
    const short = resultRows.value.filter((row) => row.remainder > 0);
    if (!short.length) return null;
    return {
      total: short.reduce((sum, row) => sum + row.remainder, 0),
      needed: Math.min(
        ...short.flatMap((row) =>
          toDenominationItems(calculateDenominations(row.remainder, ALL_DENOMINATIONS).denominations)
            .map((item) => item.denomination),
        ),
      ),
    };
  });

  return { resultRows, denominationTotals, billCells, coinCells, remainder };
};
