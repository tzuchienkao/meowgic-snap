import { computed } from 'vue';
import { Themes } from '~/types/theme';

export const DEFAULT_THEME = Themes.Light;
const STORAGE_KEY = 'theme';

/**
 * Theme handling.
 * Design system: the dark「黑貓」theme is a member feature (switchable after login).
 *
 * - `preference` — the member's saved choice (localStorage), kept even while logged out.
 * - `theme` — the theme actually shown: members get their preference, guests are always light.
 *   It is derived (computed), so it follows login / logout without any watcher;
 *   app.vue binds it to <html data-theme> via useHead.
 */
export const useTheme = () => {
  const preference = useState<Themes>('theme', () => DEFAULT_THEME);
  const { user } = useAuth();

  const theme = computed<Themes>(() => (user.value ? preference.value : DEFAULT_THEME));

  /** Save a member's choice. */
  const setTheme = (value: Themes) => {
    preference.value = value;

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  const toggleTheme = () => {
    setTheme(theme.value === Themes.Light ? Themes.Dark : Themes.Light);
  };

  /** Read the saved preference (client only); invalid values fall back to light. */
  const loadSavedTheme = () => {
    if (!import.meta.client) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    preference.value = saved === Themes.Dark || saved === Themes.Light ? saved : DEFAULT_THEME;
  };

  return {
    theme,
    preference,
    setTheme,
    toggleTheme,
    loadSavedTheme
  };
};
