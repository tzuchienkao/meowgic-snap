import { Themes } from '~/types/theme';

export const DEFAULT_THEME = Themes.Light;

export const useTheme = () => {
  const theme = useState<Themes>('theme', () => DEFAULT_THEME);

  const setTheme = (value: Themes) => {
    theme.value = value;

    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', value)
      localStorage.setItem('theme', value)
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === Themes.Light ? Themes.Dark : Themes.Light);
  }

  const initTheme = () => {
    if (import.meta.client) {
      const savedTheme = localStorage.getItem('theme') as Themes | null;
      setTheme(savedTheme ?? DEFAULT_THEME);
    }
  }

  return {
    theme,
    setTheme,
    toggleTheme,
    initTheme
  }
}
