import { computed } from 'vue';
import { Themes } from '~/types/theme';

export const DEFAULT_THEME = Themes.Light;
const STORAGE_KEY = 'theme';
/** Keep the member's choice for a year (refreshed on every change). */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const toTheme = (value: unknown): Themes =>
  value === Themes.Dark || value === Themes.Light ? value : DEFAULT_THEME;

/**
 * Theme handling.
 * Design system: the dark「黑貓」theme is a member feature (switchable after login).
 *
 * - `preference` — the member's saved choice, kept even while logged out. It lives in a cookie so
 *   SSR already renders a dark-theme member's page dark (no light flash on reload).
 * - `theme` — the theme actually shown: members get their preference, guests are always light.
 *   It is derived (computed), so it follows login / logout without any watcher;
 *   app.vue binds it to <html data-theme> via useHead.
 */
export const useTheme = () => {
  const themeCookie = useCookie<string | null>(STORAGE_KEY, {
    default: () => null,
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
  const preference = useState<Themes>('theme', () => toTheme(themeCookie.value));
  const { user } = useAuth();

  const theme = computed<Themes>(() => (user.value ? preference.value : DEFAULT_THEME));

  /** Save a member's choice. */
  const setTheme = (value: Themes) => {
    preference.value = value;
    themeCookie.value = value;
  };

  const toggleTheme = () => {
    setTheme(theme.value === Themes.Light ? Themes.Dark : Themes.Light);
  };

  /**
   * One-time move from the old localStorage key (client only): a choice saved before the cookie
   * existed is kept, unless the cookie already has one.
   */
  const loadSavedTheme = () => {
    if (!import.meta.client) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return;
    if (themeCookie.value === null) setTheme(toTheme(saved));
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    theme,
    preference,
    setTheme,
    toggleTheme,
    loadSavedTheme
  };
};
