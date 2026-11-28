import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { RouteName } from '../../constants/navigation';

type AuthCallback = (event: string, session: { user: { id: string; email?: string } } | null) => void;

let user: Ref<{ id: string } | null>;
let onAuthStateChange: AuthCallback;
let loadPreferences: ReturnType<typeof vi.fn>;
let push: ReturnType<typeof vi.fn>;
let currentRoute: Ref<{ name: string }>;

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    user,
    setSessionUser: (sessionUser: { id: string } | null) => {
      user.value = sessionUser ? { id: sessionUser.id } : null;
    },
  }),
}));
vi.mock('../../composables/usePreferences', () => ({
  usePreferences: () => ({ loadPreferences }),
}));

const setUpPlugin = async () => {
  const plugin = (await import('../../plugins/03.authListener.client')).default as unknown as (app: unknown) => void;
  plugin({
    $supabase: { auth: { onAuthStateChange: (cb: AuthCallback) => { onAuthStateChange = cb; } } },
    runWithContext: (fn: () => unknown) => fn(),
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  user = ref(null);
  loadPreferences = vi.fn(async () => {});
  push = vi.fn();
  currentRoute = ref({ name: RouteName.Index });
  vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin);
  vi.stubGlobal('useRouter', () => ({ push, currentRoute }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('plugins/03.authListener.client', () => {
  it('ignores INITIAL_SESSION (app.vue handles start-up)', async () => {
    await setUpPlugin();
    onAuthStateChange('INITIAL_SESSION', { user: { id: 'u1' } });
    expect(user.value).toBeNull();
  });

  it('a login in another tab signs this tab in and loads that member’s 偏好設定 (deferred)', async () => {
    await setUpPlugin();
    onAuthStateChange('SIGNED_IN', { user: { id: 'u1' } });
    expect(user.value).toEqual({ id: 'u1' });
    expect(loadPreferences).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(loadPreferences).toHaveBeenCalledTimes(1);
  });

  it('a refreshed token for the same member changes nothing else', async () => {
    user.value = { id: 'u1' };
    await setUpPlugin();
    onAuthStateChange('TOKEN_REFRESHED', { user: { id: 'u1' } });
    await vi.runAllTimersAsync();
    expect(loadPreferences).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('signed out on a member page → goes to the home page', async () => {
    user.value = { id: 'u1' };
    currentRoute.value = { name: RouteName.Logs };
    await setUpPlugin();
    onAuthStateChange('SIGNED_OUT', null);
    expect(user.value).toBeNull();
    await vi.runAllTimersAsync();
    expect(push).toHaveBeenCalledWith({ name: RouteName.Index });
  });

  it('signed out on the home page stays there', async () => {
    user.value = { id: 'u1' };
    await setUpPlugin();
    onAuthStateChange('SIGNED_OUT', null);
    await vi.runAllTimersAsync();
    expect(push).not.toHaveBeenCalled();
  });
});
