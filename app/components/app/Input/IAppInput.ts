export interface IAppInput {
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  /** Label above the field (rendered as a <label> wrapping the input) */
  label?: string;
  /** Helper / error text under the field, left side */
  hint?: string;
  /** Counter under the field, right side, e.g. "4 / 20" */
  count?: string;
  /** Warn-coloured border, hint and counter; sets aria-invalid */
  invalid?: boolean;
  /** Soft, non-editable pill (e.g. 登入信箱) */
  readonly?: boolean;
  disabled?: boolean;
}
