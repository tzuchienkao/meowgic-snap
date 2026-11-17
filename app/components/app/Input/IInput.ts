export interface IInput {
  modelValue: string | number;
  type: string;
  placeholder: string;
  hasError: boolean;
  errorMessage: string;
  hasCounter: boolean;
  maxCounter: number;
  isDisabled: boolean;
  isReadOnly: boolean;
}
