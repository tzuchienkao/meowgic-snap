import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  clearState,
  updateState,
  type MoneySnapState
} from '../../utils/moneySnapState';

const sampleState = (): MoneySnapState => ({
  input: '張三,100',
  isCalculated: true,
  entries: [{ name: '張三', amount: 100 }],
  total: 100,
  totalEntries: 1,
  totalNames: 1,
  errors: ['第 2 行: 格式錯誤'],
  calculatedAt: new Date('2026-01-01T00:00:00Z')
});

describe('MoneySnapState - edge cases', () => {
  describe('Fresh arrays', () => {
    it('should not leak entries mutations between createInitialState calls', () => {
      const a = createInitialState();
      a.entries.push({ name: '張三', amount: 1 });
      a.errors.push('err');
      const b = createInitialState();
      expect(b.entries).toEqual([]);
      expect(b.errors).toEqual([]);
      expect(b.entries).not.toBe(a.entries);
      expect(b.errors).not.toBe(a.errors);
    });

    it('should not leak entries mutations between clearState calls', () => {
      const a = clearState();
      a.entries.push({ name: '張三', amount: 1 });
      a.errors.push('err');
      const b = clearState();
      expect(b.entries).toEqual([]);
      expect(b.errors).toEqual([]);
    });

    it('should return a new object from clearState each call', () => {
      const a = clearState();
      const b = clearState();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('updateState', () => {
    it('should return an equal but new object for an empty partial', () => {
      const state = sampleState();
      const updated = updateState(state, {});
      expect(updated).not.toBe(state);
      expect(updated).toEqual(state);
    });

    it('should override a field with explicit undefined', () => {
      const state = sampleState();
      const updated = updateState(state, { input: undefined });
      expect('input' in updated).toBe(true);
      expect(updated.input).toBeUndefined();
      expect(state.input).toBe('張三,100');
    });

    it('should share arrays and Date by reference (shallow copy)', () => {
      const state = sampleState();
      const updated = updateState(state, { input: 'x' });
      expect(updated.entries).toBe(state.entries);
      expect(updated.errors).toBe(state.errors);
      expect(updated.calculatedAt).toBe(state.calculatedAt);
    });

    it('should propagate mutations of shared arrays back to the original state', () => {
      const state = sampleState();
      const updated = updateState(state, {});
      updated.entries.push({ name: '李四', amount: 200 });
      expect(state.entries).toHaveLength(2);
    });

    it('should use the partial array reference as-is', () => {
      const entries = [{ name: '王五', amount: 5 }];
      const updated = updateState(createInitialState(), { entries });
      expect(updated.entries).toBe(entries);
    });
  });
});
