import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { Themes } from '../../types/theme';

// Minimal stand-ins for Nuxt's useState / useCookie: one shared ref per key.
let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};
let cookies: Record<string, Ref<unknown>>;
const useCookieStub = (name: string, options?: { default?: () => unknown }) => {
  if (!cookies[name]) cookies[name] = ref(options?.default?.() ?? null);
  return cookies[name];
};
const setCookie = (name: string, value: string) => { cookies[name] = ref(value); };

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
    cookies = {};
    userRef = ref(null);
    vi.stubGlobal('useState', useStateStub);
    vi.stubGlobal('useCookie', useCookieStub);
    vi.stubGlobal('useAuth', () => ({ user: userRef }));
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows light for a guest even when dark is saved, and keeps the saved preference', async () => {
    setCookie('theme', Themes.Dark);
    const { theme, preference } = (await loadUseTheme())();

    expect(theme.value).toBe(Themes.Light);
    expect(preference.value).toBe(Themes.Dark);
    expect(cookies.theme!.value).toBe(Themes.Dark);
  });

  it('shows the saved theme for a member straight from the cookie (no mount needed, so SSR gets it too)', async () => {
    setCookie('theme', Themes.Dark);
    const { theme } = (await loadUseTheme())();

    login();

    expect(theme.value).toBe(Themes.Dark);
  });

  it('follows login / logout reactively without re-reading storage', async () => {
    setCookie('theme', Themes.Dark);
    const { theme } = (await loadUseTheme())();

    expect(theme.value).toBe(Themes.Light); // guest
    login();
    expect(theme.value).toBe(Themes.Dark);  // member
    logout();
    expect(theme.value).toBe(Themes.Light); // guest again
    login();
    expect(theme.value).toBe(Themes.Dark);  // preference restored
  });

  it('falls back to light when nothing or an invalid value is saved', async () => {
    const { theme } = (await loadUseTheme())();
    login();
    expect(theme.value).toBe(Themes.Light);

    setCookie('theme', 'purple');
    store = {};
    const fresh = (await loadUseTheme())();
    expect(fresh.preference.value).toBe(Themes.Light);
    expect(fresh.theme.value).toBe(Themes.Light);
  });

  it('member toggle saves the choice in the cookie and survives logout / login', async () => {
    const { theme, toggleTheme } = (await loadUseTheme())();
    login();

    toggleTheme();
    expect(theme.value).toBe(Themes.Dark);
    expect(cookies.theme!.value).toBe(Themes.Dark);

    logout();
    expect(theme.value).toBe(Themes.Light);
    expect(cookies.theme!.value).toBe(Themes.Dark);

    login();
    expect(theme.value).toBe(Themes.Dark);

    toggleTheme();
    expect(theme.value).toBe(Themes.Light);
    expect(cookies.theme!.value).toBe(Themes.Light);
  });

  it('shares state across composable calls (same useState key)', async () => {
    const useTheme = await loadUseTheme();
    const a = useTheme();
    const b = useTheme();
    login();

    a.setTheme(Themes.Dark);
    expect(b.theme.value).toBe(Themes.Dark);
  });

  describe('loadSavedTheme moves the old localStorage choice into the cookie', () => {
    it('adopts it when the cookie is empty, then removes the old key', async () => {
      localStorage.setItem('theme', Themes.Dark);
      const { theme, loadSavedTheme } = (await loadUseTheme())();
      login();

      loadSavedTheme();

      expect(theme.value).toBe(Themes.Dark);
      expect(cookies.theme!.value).toBe(Themes.Dark);
      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('keeps the cookie when it already has a choice', async () => {
      setCookie('theme', Themes.Light);
      localStorage.setItem('theme', Themes.Dark);
      const { theme, loadSavedTheme } = (await loadUseTheme())();
      login();

      loadSavedTheme();

      expect(theme.value).toBe(Themes.Light);
      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('stores light for an invalid old value', async () => {
      localStorage.setItem('theme', 'purple');
      const { preference, loadSavedTheme } = (await loadUseTheme())();

      loadSavedTheme();

      expect(preference.value).toBe(Themes.Light);
      expect(cookies.theme!.value).toBe(Themes.Light);
    });
  });
});
