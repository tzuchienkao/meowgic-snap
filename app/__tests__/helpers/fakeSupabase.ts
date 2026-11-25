import { vi } from 'vitest';

/**
 * In-memory stand-in for the parts of the Supabase auth client used by utils/memberPreferences.ts:
 * `getUser()` returns the signed-in user with their user_metadata, `updateUser({ data })` merges
 * `data` into it (like Supabase does). Who is signed in comes from `currentUserId`, so tests can
 * follow their own `userRef`.
 *
 * Install it with `vi.stubGlobal('useNuxtApp', () => ({ $supabase: fake }))`.
 */
export const createFakeSupabase = (currentUserId: () => string | null) => {
  const metadata: Record<string, Record<string, unknown>> = {};

  const auth = {
    getUser: vi.fn(async () => {
      const id = currentUserId();
      return { data: { user: id ? { id, user_metadata: { ...metadata[id] } } : null }, error: null };
    }),
    updateUser: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const id = currentUserId();
      if (!id) return { data: { user: null }, error: new Error('Auth session missing!') };
      metadata[id] = { ...metadata[id], ...data };
      return { data: { user: { id, user_metadata: { ...metadata[id] } } }, error: null };
    }),
  };

  return { auth, metadata };
};

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
