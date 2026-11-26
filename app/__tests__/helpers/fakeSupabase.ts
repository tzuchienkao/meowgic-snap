import { vi } from 'vitest';

/**
 * In-memory stand-in for the parts of the Supabase client the app uses:
 * - auth (utils/memberPreferences.ts): `getUser()` returns the signed-in user with their
 *   user_metadata, `updateUser({ data })` merges `data` into it (like Supabase does);
 * - tables (utils/records.ts): `from(table).insert(row).select('id').single()` stores the row with a
 *   generated `id` and `user_id` = the signed-in user, like the table defaults; signed out it is
 *   refused like RLS does. Rows end up in `tables[table]`.
 * Who is signed in comes from `currentUserId`, so tests can follow their own `userRef`.
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

  const tables: Record<string, Record<string, unknown>[]> = {};
  let nextId = 1;

  const from = vi.fn((table: string) => ({
    insert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          const userId = currentUserId();
          if (!userId) {
            return { data: null, error: new Error(`new row violates row-level security policy for table "${table}"`) };
          }
          const stored = { id: `${table}-${nextId++}`, user_id: userId, ...row };
          (tables[table] ??= []).push(stored);
          return { data: { id: stored.id }, error: null };
        },
      }),
    }),
  }));

  return { auth, from, metadata, tables };
};

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
