import { computed } from 'vue';
import { loadMemberPreferences, saveMemberPreferences } from '~/utils/memberPreferences';
import {
  arePreferencesEqual,
  clonePreferences,
  createDefaultPreferences,
  GUEST_PREFERENCES_KEY,
  memberPreferencesKey,
  readStoredPreferences,
  withDenominationGroup,
  withDenominationToggled,
  withIncludesNames,
  writeStoredPreferences,
  type IPreferences,
} from '~/utils/preferences';

/**
 * 偏好設定 shared by the home page (guest dialog) and the settings page (members).
 *
 * Loading without a watcher:
 * - The owner of the preferences is derived: `ownerKey` is a computed of the signed-in user
 *   (guest → 'preferences', member → 'preferences:<userId>').
 * - Loaded preferences live in a per-owner cache (global useState). `preferences` is a computed
 *   that picks the current owner's entry, so it follows login / logout by itself.
 * - The cache is filled by explicit calls to `loadPreferences()` right after the auth state is
 *   known: app.vue (after initAuth on start-up) and pages/auth/callback.vue (after the magic-link
 *   login). The guest entry is always loaded too, so after logout the guest's own settings show.
 *
 * Every change is saved immediately (「已自動儲存」): guests to localStorage, members through
 * saveMemberPreferences (a stub until Supabase is wired up — see utils/memberPreferences.ts).
 */
export const usePreferences = () => {
  const { user } = useAuth();
  const cache = useState<Record<string, IPreferences>>('preferences:cache', () => ({}));

  const memberId = computed<string | null>(() => user.value?.id ?? null);
  const isMember = computed(() => !!user.value);
  const ownerKey = computed(() =>
    memberId.value ? memberPreferencesKey(memberId.value) : GUEST_PREFERENCES_KEY,
  );

  const preferences = computed<IPreferences>(
    () => cache.value[ownerKey.value] ?? createDefaultPreferences(),
  );

  const setCacheEntry = (key: string, value: IPreferences) => {
    cache.value = { ...cache.value, [key]: value };
  };

  // A change made in this visit wins over a load that finishes later (e.g. a toggle while the
  // member's preferences are still being fetched), so a load only fills a missing entry.
  const fillCacheEntry = (key: string, value: IPreferences) => {
    if (!(key in cache.value)) setCacheEntry(key, value);
  };

  /** Load the guest's preferences and, when signed in, the member's (client only). */
  const loadPreferences = async () => {
    if (!import.meta.client) return;
    fillCacheEntry(GUEST_PREFERENCES_KEY, readStoredPreferences(GUEST_PREFERENCES_KEY));

    const id = memberId.value;
    if (!id) return;
    try {
      fillCacheEntry(memberPreferencesKey(id), await loadMemberPreferences({ id }));
    } catch (err) {
      // Keep the defaults for this visit
      console.error('Load preferences error:', err);
    }
  };

  /** Apply and save at once. */
  const update = (next: IPreferences) => {
    const id = memberId.value;
    setCacheEntry(ownerKey.value, next);

    if (id) {
      saveMemberPreferences({ id }, next).catch((err) => {
        console.error('Save preferences error:', err);
      });
    } else if (import.meta.client) {
      writeStoredPreferences(GUEST_PREFERENCES_KEY, next);
    }
  };

  /** Save a whole preferences object (used by the guest drawer's save button). */
  const savePreferences = (next: IPreferences) => {
    if (!arePreferencesEqual(next, preferences.value)) update(clonePreferences(next));
  };

  const applyIfChanged = (next: IPreferences) => {
    if (next !== preferences.value) update(next);
  };

  const setIncludesNames = (includesNames: boolean) => {
    applyIfChanged(withIncludesNames(preferences.value, includesNames));
  };

  const isDenominationEnabled = (value: number) => preferences.value.denominations.includes(value);

  /** Turn one denomination on / off; turning off the last enabled one is ignored. */
  const toggleDenomination = (value: number) => {
    applyIfChanged(withDenominationToggled(preferences.value, value));
  };

  /** 全選: turn a whole group on / off; a change that would leave nothing enabled is ignored. */
  const setDenominationGroup = (values: readonly number[], enabled: boolean) => {
    applyIfChanged(withDenominationGroup(preferences.value, values, enabled));
  };

  return {
    preferences,
    isMember,
    loadPreferences,
    savePreferences,
    setIncludesNames,
    isDenominationEnabled,
    toggleDenomination,
    setDenominationGroup,
  };
};
