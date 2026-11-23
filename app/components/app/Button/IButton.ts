/** Design system: Button variants — primary = 橘貓 accent (one per screen) · strong = dark ink (登入存檔) · secondary = soft fill · surface = white on soft bg · outline · danger. */
export type ButtonVariant = 'primary' | 'strong' | 'secondary' | 'surface' | 'outline' | 'danger';

/** lg 48px (main CTA) · md 44px · sm 36px · xs 32px — heights come from font size + padding on the 4px grid. */
export type ButtonSize = 'lg' | 'md' | 'sm' | 'xs';

export interface IAppButton {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  /** Unicode glyph shown before the label, e.g. "↑" "↓" */
  icon?: string;
  disabled?: boolean;
}
