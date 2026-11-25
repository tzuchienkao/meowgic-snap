/**
 * Member 偏好設定 storage — wired up to Supabase auth.user_metadata.preferences.
 *
 * Both functions are async on purpose to support multi-device sync via Supabase.
 * - loadMemberPreferences: reads from server (always fresh data), with one-time migration
 *   from localStorage.
 * - saveMemberPreferences: persists to Supabase auth and falls back to localStorage.
 */
import {
  memberPreferencesKey,
  readStoredPreferences,
  sanitizePreferences,
  writeStoredPreferences,
  type IPreferences,
} from '~/utils/preferences';

export interface IPreferencesOwner {
  id: string;
}

/**
 * Load a member's saved preferences from Supabase.
 *
 * Uses getUser() (not getSession) so the data is fresh from the server (multi-device sync), and
 * only accepts it when the signed-in user is the one requested (never another account's data).
 * When the account has none yet, preferences this browser saved for the member are migrated.
 * Throwing is fine (network error, other account): usePreferences catches it and keeps the defaults.
 */
export async function loadMemberPreferences(user: IPreferencesOwner): Promise<IPreferences> {
  const supabase = useNuxtApp().$supabase;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const authUser = data.user;
  if (authUser?.id === user.id) {
    return sanitizePreferences(authUser.user_metadata.preferences ?? migrateLocalPreferences(user));
  }

  throw new Error(`Authenticated user (${authUser?.id}) does not match requested user (${user.id})`);
}

/**
 * One-time migration: when the account has no preferences yet but this browser saved some for
 * the member, use them and copy them to Supabase (fire and forget: a failed write must not fail
 * the load). Returns undefined when this browser never saved any.
 */
function migrateLocalPreferences(user: IPreferencesOwner): IPreferences | undefined {
  const key = memberPreferencesKey(user.id);
  const hasLocalCopy = import.meta.client && localStorage.getItem(key) !== null;

  if (hasLocalCopy) {
    const stored = readStoredPreferences(key);
    saveMemberPreferences(user, stored).catch((err) => {
      console.error('Preferences migration to Supabase failed:', err);
    });
    return stored;
  }

  return undefined;
}

/**
 * Save a member's preferences to Supabase auth.user_metadata with optimistic concurrency.
 *
 * Throws on write failure, which usePreferences catches (the UI keeps the new value).
 * Fallback: if offline or Supabase unavailable, still persists to localStorage.
 * 
 * Note: rapid successive saves may lose intermediate values if earlier requests arrive
 * after later ones (server-side timestamp or ETag checking would be needed to prevent this).
 */
export async function saveMemberPreferences(user: IPreferencesOwner, preferences: IPreferences): Promise<void> {
  const supabase = useNuxtApp().$supabase;
  const { error } = await supabase.auth.updateUser({ data: { preferences } });
  
  if (error) {
    // Fallback: save to localStorage so at least this device keeps the new value.
    writeStoredPreferences(memberPreferencesKey(user.id), preferences);
    throw error;
  }
}
