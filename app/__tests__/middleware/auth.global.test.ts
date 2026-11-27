import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computed, ref } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';
import { RouteName } from '../../constants/navigation';

let user: ReturnType<typeof ref<{ id: string } | null>>;
let navigateTo: ReturnType<typeof vi.fn>;

vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: computed(() => !!user.value) }),
}));

const route = (name: string) => ({ name }) as unknown as RouteLocationNormalized;

/** The middleware, with defineNuxtRouteMiddleware returning the function itself */
const loadMiddleware = async () =>
  (await import('../../middleware/auth.global')).default as unknown as (to: RouteLocationNormalized) => unknown;

beforeEach(() => {
  user = ref(null);
  navigateTo = vi.fn((to) => to);
  vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: unknown) => middleware);
  vi.stubGlobal('navigateTo', navigateTo);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('middleware/auth.global', () => {
  it.each([RouteName.Dashboard, RouteName.Logs, RouteName.Settings])('sends a guest from %s to the home page', async (name) => {
    const middleware = await loadMiddleware();
    expect(middleware(route(name))).toEqual({ name: RouteName.Index });
  });

  it('lets a member open the member pages', async () => {
    user.value = { id: 'u1' };
    const middleware = await loadMiddleware();
    expect(middleware(route(RouteName.Logs))).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });

  it.each([RouteName.Index, 'auth-callback'])('lets a guest open %s', async (name) => {
    const middleware = await loadMiddleware();
    expect(middleware(route(name))).toBeUndefined();
    expect(navigateTo).not.toHaveBeenCalled();
  });
});
