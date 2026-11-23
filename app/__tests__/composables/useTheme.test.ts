import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { Themes } from '../../types/theme';

// Minimal stand-in for Nuxt's useState: one shared ref per key.
let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};

let userRef: Ref<object | null>;

const loadUseTheme = async () => {
  vi.resetModules();
  return (await import('../../composables/useTheme')).useTheme;
};

const login = () => { userRef.value = { id: 'u1' }; };
const logout = () => { userRef.value = null; };

describe('useTheme — guests are always light, members get their saved theme', () => {
  beforeEach(() => {
    store = {};
    userRef = ref(null);
    vi.stubGlobal('useState', useStateStub);
    vi.stubGlobal('useAuth', () => ({ user: userRef }));
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows light for a guest even when dark is saved, and keeps the saved preference', async () => {
    localStorage.setItem('theme', Themes.Dark);
    const { theme, preference, loadSavedTheme } = (await loadUseTheme())();

    loadSavedTheme();

    expect(theme.value).toBe(Themes.Light);
    expect(preference.value).toBe(Themes.Dark);
    expect(localStorage.getItem('theme')).toBe(Themes.Dark);
  });

  it('shows the saved theme for a member', async () => {
    localStorage.setItem('theme', Themes.Dark);
    const { theme, loadSavedTheme } = (await loadUseTheme())();

    loadSavedTheme();
    login();

    expect(theme.value).toBe(Themes.Dark);
  });

  it('follows login / logout reactively without re-reading storage', async () => {
    localStorage.setItem('theme', Themes.Dark);
    const { theme, loadSavedTheme } = (await loadUseTheme())();
    loadSavedTheme();

    expect(theme.value).toBe(Themes.Light); // guest
    login();
    expect(theme.value).toBe(Themes.Dark);  // member
    logout();
    expect(theme.value).toBe(Themes.Light); // guest again
    login();
    expect(theme.value).toBe(Themes.Dark);  // preference restored
  });

  it('falls back to light when nothing or an invalid value is saved', async () => {
    const { theme, preference, loadSavedTheme } = (await loadUseTheme())();
    login();

    loadSavedTheme();
    expect(theme.value).toBe(Themes.Light);

    localStorage.setItem('theme', 'purple');
    loadSavedTheme();
    expect(preference.value).toBe(Themes.Light);
    expect(theme.value).toBe(Themes.Light);
  });

  it('member toggle saves the choice and survives logout / login', async () => {
    const { theme, toggleTheme } = (await loadUseTheme())();
    login();

    toggleTheme();
    expect(theme.value).toBe(Themes.Dark);
    expect(localStorage.getItem('theme')).toBe(Themes.Dark);

    logout();
    expect(theme.value).toBe(Themes.Light);
    expect(localStorage.getItem('theme')).toBe(Themes.Dark);

    login();
    expect(theme.value).toBe(Themes.Dark);

    toggleTheme();
    expect(theme.value).toBe(Themes.Light);
    expect(localStorage.getItem('theme')).toBe(Themes.Light);
  });

  it('shares state across composable calls (same useState key)', async () => {
    const useTheme = await loadUseTheme();
    const a = useTheme();
    const b = useTheme();
    login();

    a.setTheme(Themes.Dark);
    expect(b.theme.value).toBe(Themes.Dark);
  });
});
