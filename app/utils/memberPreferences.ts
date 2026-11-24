/**
 * Member 偏好設定 storage — PLACEHOLDER until Supabase is wired up.
 *
 * Both functions are async on purpose so the Supabase version can drop in without changing
 * the callers (composables/usePreferences.ts). Until then they use localStorage under a
 * member-scoped key (`preferences:<userId>`), so preferences already work per account on
 * this browser (but do not follow the member to another device).
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
 * Load a member's saved preferences.
 *
 * TODO(you): read them from Supabase instead of localStorage:
 *   1. Get the client: `const supabase = useNuxtApp().$supabase` (see useAuth.ts).
 *   2. `const { data: { session } } = await supabase.auth.getSession()`
 *      (or `supabase.auth.getUser()` for a fresh copy from the server).
 *   3. Read `session?.user.user_metadata.preferences` — `undefined` for a member who never saved.
 *   4. Return `sanitizePreferences(thatValue)` so a missing / old / broken value becomes valid
 *      (sanitizePreferences already falls back to the defaults).
 *   5. Optional: one-time migration — if Supabase has nothing but localStorage has
 *      `preferences:<userId>`, return that and save it with saveMemberPreferences.
 *   Throwing is fine: usePreferences catches it and keeps the defaults.
 */
export async function loadMemberPreferences(user: IPreferencesOwner): Promise<IPreferences> {
  return sanitizePreferences(readStoredPreferences(memberPreferencesKey(user.id)));
}

/**
 * Save a member's preferences (called after every change, 「已自動儲存」).
 *
 * TODO(you): write them to Supabase instead of localStorage, like `updateUserName` in useAuth.ts:
 *   1. `const supabase = useNuxtApp().$supabase`
 *   2. `const { error } = await supabase.auth.updateUser({ data: { preferences } })`
 *      — `data` is merged into user_metadata, so display_name is kept.
 *   3. `if (error) throw error` — usePreferences catches it (the UI keeps the new value);
 *      you could show a toast there, e.g. 「設定沒有存成功喵，再試一次看看」.
 *   Tip: toggling several checkboxes quickly sends several requests; that is fine to start with
 *   (the last one wins). A small debounce is a nice follow-up exercise.
 */
export async function saveMemberPreferences(user: IPreferencesOwner, preferences: IPreferences): Promise<void> {
  writeStoredPreferences(memberPreferencesKey(user.id), preferences);
}
