/**
 * State management for money snap calculation
 */

export interface MoneySnapState {
  input: string;
  isCalculated: boolean;
  entries: Array<{ name: string; amount: number }>;
  total: number;
  totalEntries: number;
  totalNames: number;
  errors: string[];
  calculatedAt: Date | null;
}

export function createInitialState(): MoneySnapState {
  return {
    input: '',
    isCalculated: false,
    entries: [],
    total: 0,
    totalEntries: 0,
    totalNames: 0,
    errors: [],
    calculatedAt: null
  };
}

export function clearState(): MoneySnapState {
  return createInitialState();
}

export function updateState(
  state: MoneySnapState,
  partial: Partial<MoneySnapState>
): MoneySnapState {
  return {
    ...state,
    ...partial
  };
}
