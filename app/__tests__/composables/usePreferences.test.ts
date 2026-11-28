import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, type Ref } from 'vue';
import { PREFERENCES_LOAD_FAILED_MESSAGE, PREFERENCES_SAVE_FAILED_MESSAGE } from '../../constants/user';
import { MEMBER_SAVE_DEBOUNCE_MS } from '../../composables/usePreferences';
import { createFakeSupabase, type FakeSupabase } from '../helpers/fakeSupabase';
import { MemberSaveStatus } from '../../types/preferences';

// Minimal stand-in for Nuxt's useState: one shared ref per key.
let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};

let userRef: Ref<{ id: string } | null>;
let supabase: FakeSupabase;
let showToast: ReturnType<typeof vi.fn>;

const loadUsePreferences = async () => {
  vi.resetModules();
  return (await import('../../composables/usePreferences')).usePreferences;
};

const DEFAULTS = [1000, 500, 100, 50, 10, 5, 1];
const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');
const savedInAccount = (id: string) => supabase.metadata[id]?.preferences;

describe('usePreferences', () => {
  beforeEach(() => {
    store = {};
    userRef = ref(null);
    supabase = createFakeSupabase(() => userRef.value?.id ?? null);
    showToast = vi.fn();
    vi.stubGlobal('useState', useStateStub);
    vi.stubGlobal('useAuth', () => ({ user: userRef }));
    vi.stubGlobal('useNuxtApp', () => ({ $supabase: supabase }));
    vi.stubGlobal('useToast', () => ({ showToast }));
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts with the defaults before anything is loaded', async () => {
    const { preferences } = (await loadUsePreferences())();
    expect(preferences.value).toEqual({ includesNames: true, denominations: DEFAULTS });
  });

  it('loads and sanitises the guest preferences from localStorage', async () => {
    localStorage.setItem('preferences', JSON.stringify({ includesNames: false, denominations: [1, 2000, 1, 3] }));
    const { preferences, loadPreferences } = (await loadUsePreferences())();
    await loadPreferences();
    expect(preferences.value).toEqual({ includesNames: false, denominations: [2000, 1] });
  });

  it('guest changes save immediately under the guest key', async () => {
    const { preferences, setIncludesNames, toggleDenomination } = (await loadUsePreferences())();

    setIncludesNames(false);
    expect(preferences.value.includesNames).toBe(false);
    expect(saved('preferences').includesNames).toBe(false);

    toggleDenomination(1);
    expect(preferences.value.denominations).toEqual([1000, 500, 100, 50, 10, 5]);
    toggleDenomination(2000);
    expect(preferences.value.denominations).toEqual([2000, 1000, 500, 100, 50, 10, 5]);
    expect(saved('preferences').denominations).toEqual([2000, 1000, 500, 100, 50, 10, 5]);
  });

  it('members load from and save to their account, separate from the guest', async () => {
    localStorage.setItem('preferences', JSON.stringify({ includesNames: true, denominations: [100] }));
    supabase.metadata.u1 = { preferences: { includesNames: false, denominations: [500, 1] } };
    userRef.value = { id: 'u1' };
    const { preferences, loadPreferences, toggleDenomination, isMember } = (await loadUsePreferences())();

    await loadPreferences();
    expect(isMember.value).toBe(true);
    expect(preferences.value).toEqual({ includesNames: false, denominations: [500, 1] });

    vi.useFakeTimers();
    toggleDenomination(50);
    expect(preferences.value.denominations).toEqual([500, 50, 1]); // applied at once
    await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
    expect(savedInAccount('u1')).toEqual({ includesNames: false, denominations: [500, 50, 1] });
    expect(saved('preferences').denominations).toEqual([100]);
  });

  describe('debounced member saves', () => {
    const signInAndLoad = async (id = 'u1') => {
      userRef.value = { id };
      const api = (await loadUsePreferences())();
      await api.loadPreferences();
      vi.useFakeTimers();
      return api;
    };

    it('quick changes become one request with the latest value', async () => {
      const { toggleDenomination, setIncludesNames } = await signInAndLoad();
      toggleDenomination(20);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS - 100);
      toggleDenomination(1);
      setIncludesNames(false);
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1);
      expect(savedInAccount('u1')).toEqual({ includesNames: false, denominations: [1000, 500, 100, 50, 20, 10, 5] });
    });

    it('a change still pending at logout is dropped, not saved to the next account', async () => {
      const { toggleDenomination } = await signInAndLoad('u1');
      toggleDenomination(20);
      userRef.value = { id: 'u2' }; // logout + login as someone else within the debounce

      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
      expect(savedInAccount('u2')).toBeUndefined();

      userRef.value = { id: 'u1' }; // back as u1: the change was not saved
      const { saveStatus } = (await import('../../composables/usePreferences')).usePreferences();
      expect(saveStatus.value).toBe(MemberSaveStatus.Failed);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('sends one request at a time: a change made while saving goes out after it, with the latest value', async () => {
      const { saveStatus, toggleDenomination } = await signInAndLoad();
      // Hold the first request open until we resolve it
      let finishFirst!: () => void;
      const realUpdate = supabase.auth.updateUser.getMockImplementation()!;
      supabase.auth.updateUser.mockImplementationOnce(async (args) => {
        await new Promise<void>((resolve) => (finishFirst = resolve));
        return realUpdate(args);
      });

      toggleDenomination(20);
      expect(saveStatus.value).toBe(MemberSaveStatus.Saving);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1); // first request in flight

      toggleDenomination(5); // off
      toggleDenomination(2000);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1); // waits for the first one

      finishFirst();
      await vi.advanceTimersByTimeAsync(0);
      expect(supabase.auth.updateUser).toHaveBeenCalledTimes(2);
      expect(savedInAccount('u1')).toEqual({ includesNames: true, denominations: [2000, 1000, 500, 100, 50, 20, 10, 1] });
      expect(saveStatus.value).toBe(MemberSaveStatus.Saved);
    });

    it('stays 儲存中 while a newer change is still waiting for its debounce', async () => {
      const { saveStatus, toggleDenomination } = await signInAndLoad();
      let finishFirst!: () => void;
      const realUpdate = supabase.auth.updateUser.getMockImplementation()!;
      supabase.auth.updateUser.mockImplementationOnce(async (args) => {
        await new Promise<void>((resolve) => (finishFirst = resolve));
        return realUpdate(args);
      });

      toggleDenomination(20);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      toggleDenomination(2000); // debounce running when the first request returns
      finishFirst();
      await vi.advanceTimersByTimeAsync(0);
      expect(saveStatus.value).toBe(MemberSaveStatus.Saving);

      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(saveStatus.value).toBe(MemberSaveStatus.Saved);
      expect(savedInAccount('u1')).toMatchObject({ denominations: expect.arrayContaining([2000, 20]) });
    });

    it('a failed save shows a toast and keeps the new value on screen', async () => {
      const { preferences, toggleDenomination } = await signInAndLoad();
      supabase.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      toggleDenomination(20);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(showToast).toHaveBeenCalledWith(PREFERENCES_SAVE_FAILED_MESSAGE);
      expect(preferences.value.denominations).toContain(20);
    });

    it('retrySave sends the current preferences again after a failure', async () => {
      const api = await signInAndLoad();
      supabase.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      api.toggleDenomination(20);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(api.saveStatus.value).toBe(MemberSaveStatus.Failed);

      api.retrySave();
      expect(api.saveStatus.value).toBe(MemberSaveStatus.Saving);
      await vi.advanceTimersByTimeAsync(0);
      expect(api.saveStatus.value).toBe(MemberSaveStatus.Saved);
      expect(savedInAccount('u1')).toMatchObject({ denominations: expect.arrayContaining([20]) });
    });
  });

  describe('when the member preferences fail to load', () => {
    const failLoad = () => {
      supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') } as never);
    };

    it('shows a toast and never saves the defaults over the account', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      supabase.metadata.u1 = { preferences: { includesNames: false, denominations: [500, 1] } };
      userRef.value = { id: 'u1' };
      const { preferences, loadPreferences, toggleDenomination, saveStatus } = (await loadUsePreferences())();
      vi.useFakeTimers();
      failLoad();
      await loadPreferences();
      expect(showToast).toHaveBeenCalledWith(PREFERENCES_LOAD_FAILED_MESSAGE);
      expect(preferences.value.denominations).toEqual(DEFAULTS);

      toggleDenomination(20);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(preferences.value.denominations).toContain(20);
      expect(saveStatus.value).toBe(MemberSaveStatus.Failed);
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
      expect(savedInAccount('u1')).toEqual({ includesNames: false, denominations: [500, 1] });
    });

    it('retrySave loads the saved preferences, which then save normally', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      supabase.metadata.u1 = { preferences: { includesNames: false, denominations: [500, 1] } };
      userRef.value = { id: 'u1' };
      const api = (await loadUsePreferences())();
      vi.useFakeTimers();
      failLoad();
      await api.loadPreferences();
      api.toggleDenomination(20);

      await api.retrySave();
      expect(api.saveStatus.value).toBe(MemberSaveStatus.Saved);
      expect(api.preferences.value.denominations).toEqual([500, 1]);

      api.toggleDenomination(20);
      await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
      expect(savedInAccount('u1')).toEqual({ includesNames: false, denominations: [500, 20, 1] });
    });
  });

  it('follows login / logout through the per-owner cache without reloading', async () => {
    localStorage.setItem('preferences', JSON.stringify({ includesNames: true, denominations: [100] }));
    supabase.metadata.u1 = { preferences: { includesNames: false, denominations: [500, 1] } };
    userRef.value = { id: 'u1' };
    const { preferences, loadPreferences } = (await loadUsePreferences())();
    await loadPreferences();

    userRef.value = null; // logout
    expect(preferences.value.denominations).toEqual([100]);
    userRef.value = { id: 'u1' }; // same member again
    expect(preferences.value.denominations).toEqual([500, 1]);
    userRef.value = { id: 'u2' }; // a member that has not been loaded yet → defaults
    expect(preferences.value.denominations).toEqual(DEFAULTS);
  });

  it('ignores turning off the last enabled denomination', async () => {
    localStorage.setItem('preferences', JSON.stringify({ includesNames: true, denominations: [1] }));
    const { preferences, loadPreferences, toggleDenomination } = (await loadUsePreferences())();
    await loadPreferences();

    toggleDenomination(1);
    expect(preferences.value.denominations).toEqual([1]);
  });

  it('全選 turns a whole group on / off, but never leaves nothing enabled', async () => {
    const { preferences, setDenominationGroup } = (await loadUsePreferences())();
    const bills = [2000, 1000, 500, 200, 100];
    const coins = [50, 20, 10, 5, 1];

    setDenominationGroup(bills, true);
    expect(preferences.value.denominations).toEqual([2000, 1000, 500, 200, 100, 50, 10, 5, 1]);
    setDenominationGroup(coins, false);
    expect(preferences.value.denominations).toEqual(bills);
    setDenominationGroup(bills, false); // would empty the set → ignored
    expect(preferences.value.denominations).toEqual(bills);
    expect(saved('preferences').denominations).toEqual(bills);
  });

  it('a denomination turned on changes the breakdown, before and after loading', async () => {
    const { calculateDenominations } = await import('../../utils/moneyParser');
    const { preferences, loadPreferences, toggleDenomination } = (await loadUsePreferences())();
    const breakdown = () => calculateDenominations(1850, preferences.value.denominations).denominations;
    expect(breakdown()[200]).toBeUndefined();

    toggleDenomination(200); // before app.vue has loaded anything
    expect(breakdown()).toMatchObject({ 1000: 1, 500: 1, 200: 1, 100: 1, 50: 1 });
    await loadPreferences();
    expect(breakdown()).toMatchObject({ 1000: 1, 500: 1, 200: 1, 100: 1, 50: 1 });

    toggleDenomination(200);
    expect(breakdown()).toMatchObject({ 1000: 1, 500: 1, 100: 3, 50: 1 });
  });

  it('a change made while the member preferences load is not overwritten by the load', async () => {
    supabase.metadata.u1 = { preferences: { includesNames: true, denominations: [500, 1] } };
    userRef.value = { id: 'u1' };
    const { preferences, loadPreferences, toggleDenomination } = (await loadUsePreferences())();

    vi.useFakeTimers();
    const loading = loadPreferences(); // member load is async
    toggleDenomination(200);
    await loading;
    expect(preferences.value.denominations).toEqual([1000, 500, 200, 100, 50, 10, 5, 1]);
    await vi.advanceTimersByTimeAsync(MEMBER_SAVE_DEBOUNCE_MS);
    expect(savedInAccount('u1')).toEqual({ includesNames: true, denominations: [1000, 500, 200, 100, 50, 10, 5, 1] });
  });

  it('shares state across composable calls', async () => {
    const usePreferences = await loadUsePreferences();
    const a = usePreferences();
    const b = usePreferences();
    a.setIncludesNames(false);
    expect(b.preferences.value.includesNames).toBe(false);
    expect(b.isDenominationEnabled(1)).toBe(true);
  });
});
