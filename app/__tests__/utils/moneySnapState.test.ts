import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  clearState,
  updateState,
  type MoneySnapState
} from '../../utils/moneySnapState';

describe('MoneySnapState - Clear State Behavior', () => {
  describe('Initial state', () => {
    it('should create initial state with defaults', () => {
      const state = createInitialState();
      expect(state.input).toBe('');
      expect(state.isCalculated).toBe(false);
      expect(state.entries).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.totalEntries).toBe(0);
      expect(state.totalNames).toBe(0);
      expect(state.errors).toEqual([]);
      expect(state.calculatedAt).toBeNull();
    });

    it('should create new instance each time', () => {
      const state1 = createInitialState();
      const state2 = createInitialState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('Clear state', () => {
    it('should reset all state to initial values', () => {
      const state: MoneySnapState = {
        input: '張三,18500',
        isCalculated: true,
        entries: [{ name: '張三', amount: 18500 }],
        total: 18500,
        totalEntries: 1,
        totalNames: 1,
        errors: [],
        calculatedAt: new Date()
      };

      const cleared = clearState();
      expect(cleared.input).toBe('');
      expect(cleared.isCalculated).toBe(false);
      expect(cleared.entries).toEqual([]);
      expect(cleared.total).toBe(0);
      expect(cleared.totalEntries).toBe(0);
      expect(cleared.totalNames).toBe(0);
      expect(cleared.errors).toEqual([]);
      expect(cleared.calculatedAt).toBeNull();
    });

    it('should not affect original state', () => {
      const original: MoneySnapState = {
        input: '張三,18500',
        isCalculated: true,
        entries: [{ name: '張三', amount: 18500 }],
        total: 18500,
        totalEntries: 1,
        totalNames: 1,
        errors: [],
        calculatedAt: new Date()
      };

      const cleared = clearState();
      
      // Original should be unchanged
      expect(original.input).toBe('張三,18500');
      expect(original.isCalculated).toBe(true);
      expect(original.entries).toHaveLength(1);
      
      // Cleared should be fresh
      expect(cleared.input).toBe('');
    });
  });

  describe('Update state', () => {
    it('should update single field', () => {
      const initial = createInitialState();
      const updated = updateState(initial, { input: '張三,18500' });
      
      expect(updated.input).toBe('張三,18500');
      expect(updated.isCalculated).toBe(false);
    });

    it('should update multiple fields', () => {
      const initial = createInitialState();
      const updated = updateState(initial, {
        input: '張三,18500',
        isCalculated: true,
        total: 18500,
        totalEntries: 1,
        totalNames: 1
      });

      expect(updated.input).toBe('張三,18500');
      expect(updated.isCalculated).toBe(true);
      expect(updated.total).toBe(18500);
      expect(updated.totalEntries).toBe(1);
      expect(updated.totalNames).toBe(1);
    });

    it('should not mutate original state', () => {
      const original = createInitialState();
      const updated = updateState(original, { input: '新資料' });

      expect(original.input).toBe('');
      expect(updated.input).toBe('新資料');
    });

    it('should preserve unmodified fields', () => {
      const initial: MoneySnapState = {
        input: '原始輸入',
        isCalculated: false,
        entries: [{ name: '保留', amount: 100 }],
        total: 100,
        totalEntries: 1,
        totalNames: 1,
        errors: ['舊錯誤'],
        calculatedAt: null
      };

      const updated = updateState(initial, { input: '新輸入' });

      expect(updated.input).toBe('新輸入');
      expect(updated.entries).toEqual([{ name: '保留', amount: 100 }]);
      expect(updated.errors).toEqual(['舊錯誤']);
    });

    it('should allow clearing specific fields to reset values', () => {
      const state: MoneySnapState = {
        input: '張三,18500',
        isCalculated: true,
        entries: [{ name: '張三', amount: 18500 }],
        total: 18500,
        totalEntries: 1,
        totalNames: 1,
        errors: ['Error'],
        calculatedAt: new Date()
      };

      const cleared = updateState(state, {
        input: '',
        isCalculated: false,
        entries: [],
        total: 0,
        totalEntries: 0,
        totalNames: 0,
        errors: [],
        calculatedAt: null
      });

      expect(cleared).toEqual(createInitialState());
    });
  });

  describe('State transition workflow', () => {
    it('should transition from initial to calculated state', () => {
      let state = createInitialState();
      
      state = updateState(state, {
        input: '張三,18500\n李四,32000'
      });
      expect(state.input).toBe('張三,18500\n李四,32000');
      expect(state.isCalculated).toBe(false);

      state = updateState(state, {
        isCalculated: true,
        entries: [
          { name: '張三', amount: 18500 },
          { name: '李四', amount: 32000 }
        ],
        total: 50500,
        totalEntries: 2,
        totalNames: 2,
        calculatedAt: new Date()
      });

      expect(state.isCalculated).toBe(true);
      expect(state.total).toBe(50500);
    });

    it('should transition from calculated back to initial via clear', () => {
      let state: MoneySnapState = {
        input: '張三,18500',
        isCalculated: true,
        entries: [{ name: '張三', amount: 18500 }],
        total: 18500,
        totalEntries: 1,
        totalNames: 1,
        errors: [],
        calculatedAt: new Date()
      };

      state = clearState();

      expect(state).toEqual(createInitialState());
    });

    it('should allow re-calculating after clear', () => {
      let state = createInitialState();
      
      // First calculation
      state = updateState(state, {
        input: '張三,18500',
        isCalculated: true,
        entries: [{ name: '張三', amount: 18500 }],
        total: 18500,
        totalEntries: 1,
        totalNames: 1,
        calculatedAt: new Date()
      });

      expect(state.total).toBe(18500);

      // Clear
      state = clearState();
      expect(state.input).toBe('');

      // Second calculation with different data
      state = updateState(state, {
        input: '李四,99999',
        isCalculated: true,
        entries: [{ name: '李四', amount: 99999 }],
        total: 99999,
        totalEntries: 1,
        totalNames: 1,
        calculatedAt: new Date()
      });

      expect(state.total).toBe(99999);
    });
  });

  describe('Error handling in state', () => {
    it('should track parsing errors', () => {
      let state = createInitialState();
      
      state = updateState(state, {
        input: '張三,18500\n李四,',
        errors: ['第 2 行: 格式錯誤']
      });

      expect(state.errors).toContain('第 2 行: 格式錯誤');
    });

    it('should clear errors when resetting state', () => {
      let state: MoneySnapState = {
        ...createInitialState(),
        errors: ['舊錯誤1', '舊錯誤2']
      };

      state = clearState();

      expect(state.errors).toEqual([]);
    });
  });
});
