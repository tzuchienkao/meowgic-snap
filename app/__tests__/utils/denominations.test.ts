import { describe, it, expect } from 'vitest';
import { toDenominationItems } from '../../utils/denominations';
import { DenominationOrder } from '../../types/denomination';

describe('toDenominationItems', () => {
  const counts = { 100: 3, 1000: 23, 5: 0, 500: 2, 1: 4 };

  it('keeps non-zero counts, large → small by default', () => {
    expect(toDenominationItems(counts)).toEqual([
      { denomination: 1000, count: 23 },
      { denomination: 500, count: 2 },
      { denomination: 100, count: 3 },
      { denomination: 1, count: 4 },
    ]);
  });

  it('small → large when asked', () => {
    expect(toDenominationItems(counts, DenominationOrder.SmallFirst).map((item) => item.denomination)).toEqual([1, 100, 500, 1000]);
  });

  it('nothing to show → empty list', () => {
    expect(toDenominationItems({})).toEqual([]);
    expect(toDenominationItems({ 100: 0 })).toEqual([]);
  });
});
