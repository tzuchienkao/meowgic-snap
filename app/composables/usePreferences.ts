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
import { PREFERENCES_SAVE_FAILED_MESSAGE } from '~/constants/user';
import { MemberSaveStatus } from '~/types/preferences';

/** Quiet period before a member's change is sent to Supabase; quick toggles become one request. */
export const MEMBER_SAVE_DEBOUNCE_MS = 500;

// Member-save bookkeeping per owner key. Module-level (client only, never serialised), unlike
// useState, which must hold payload-safe data.
const pendingSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Owners with a save request on its way to Supabase. */
const savesInFlight = new Set<string>();
/** Owners whose preferences changed while a request was in flight: send the latest once it returns. */
const changedWhileSaving = new Set<string>();

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
 * Every change applies at once. Guests save to localStorage immediately; members save to Supabase
 * auth.user_metadata via saveMemberPreferences, debounced and one request at a time, with a
 * `saveStatus` for the settings page and a toast + `retrySave` when a save fails.
 */
export const usePreferences = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const cache = useState<Record<string, IPreferences>>('preferences:cache', () => ({}));
  const saveStatuses = useState<Record<string, MemberSaveStatus>>('preferences:saveStatus', () => ({}));

  const memberId = computed<string | null>(() => user.value?.id ?? null);
  const isMember = computed(() => !!user.value);
  const ownerKey = computed(() =>
    memberId.value ? memberPreferencesKey(memberId.value) : GUEST_PREFERENCES_KEY,
  );

  const preferences = computed<IPreferences>(
    () => cache.value[ownerKey.value] ?? createDefaultPreferences(),
  );

  /** The signed-in member's save status (settings page: 儲存中… / 已自動儲存 / 沒存成功). */
  const saveStatus = computed<MemberSaveStatus>(
    () => saveStatuses.value[ownerKey.value] ?? MemberSaveStatus.Saved,
  );
  const setSaveStatus = (key: string, status: MemberSaveStatus) => {
    saveStatuses.value = { ...saveStatuses.value, [key]: status };
  };

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

  /**
   * Send the member's latest preferences, one request at a time per owner, so requests always
   * reach Supabase in order and the last one carries the newest value:
   * - while a request is in flight, a new change only marks the owner as changed;
   * - when the request returns, a marked owner is sent again with the then-latest cache value.
   * It re-checks the signed-in member first: updateUser writes to whoever is signed in now, so a
   * change left pending across logout / account switch is dropped instead of being written to the
   * wrong account.
   */
  const sendMemberSave = async (id: string, key: string) => {
    if (memberId.value !== id) {
      // Not saved: show 沒存成功 if that member comes back (no toast on someone else's screen)
      setSaveStatus(key, MemberSaveStatus.Failed);
      return;
    }
    if (savesInFlight.has(key)) {
      changedWhileSaving.add(key);
      return;
    }
    const latest = cache.value[key];
    if (!latest) return;

    savesInFlight.add(key);
    let failed = false;
    try {
      await saveMemberPreferences({ id }, latest);
    } catch (err) {
      failed = true;
      console.error('Save preferences error:', err);
    } finally {
      savesInFlight.delete(key);
    }

    if (changedWhileSaving.delete(key)) {
      await sendMemberSave(id, key);
      return;
    }
    // A newer change is still waiting for its debounce: it will report its own result
    if (pendingSaveTimers.has(key)) return;
    setSaveStatus(key, failed ? MemberSaveStatus.Failed : MemberSaveStatus.Saved);
    if (failed) showToast(PREFERENCES_SAVE_FAILED_MESSAGE);
  };

  /** Debounced: each change restarts one timer per owner, so quick toggles send one request. */
  const scheduleMemberSave = (id: string, key: string) => {
    setSaveStatus(key, MemberSaveStatus.Saving);
    clearTimeout(pendingSaveTimers.get(key));
    pendingSaveTimers.set(
      key,
      setTimeout(() => {
        pendingSaveTimers.delete(key);
        sendMemberSave(id, key);
      }, MEMBER_SAVE_DEBOUNCE_MS),
    );
  };

  /** 再試一次 after a failed save: send the current preferences right away. */
  const retrySave = () => {
    const id = memberId.value;
    if (!id || saveStatus.value !== MemberSaveStatus.Failed) return;
    const key = ownerKey.value;
    setSaveStatus(key, MemberSaveStatus.Saving);
    sendMemberSave(id, key);
  };

  /** Apply at once; guests save immediately, members after a short debounce. */
  const update = (next: IPreferences) => {
    const id = memberId.value;
    const key = ownerKey.value;
    setCacheEntry(key, next);

    if (id) {
      scheduleMemberSave(id, key);
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
    saveStatus,
    retrySave,
    loadPreferences,
    savePreferences,
    setIncludesNames,
    isDenominationEnabled,
    toggleDenomination,
    setDenominationGroup,
  };
};
