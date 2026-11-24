import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, type Ref } from 'vue';

// Minimal stand-in for Nuxt's useState: one shared ref per key.
let store: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!store[key]) store[key] = ref(init());
  return store[key] as Ref<T>;
};

let userRef: Ref<{ id: string } | null>;

const loadUsePreferences = async () => {
  vi.resetModules();
  return (await import('../../composables/usePreferences')).usePreferences;
};

const DEFAULTS = [1000, 500, 100, 50, 10, 5, 1];
const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('usePreferences', () => {
  beforeEach(() => {
    store = {};
    userRef = ref(null);
    vi.stubGlobal('useState', useStateStub);
    vi.stubGlobal('useAuth', () => ({ user: userRef }));
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('members load and save under preferences:<userId>, separate from the guest', async () => {
    localStorage.setItem('preferences', JSON.stringify({ includesNames: true, denominations: [100] }));
    localStorage.setItem('preferences:u1', JSON.stringify({ includesNames: false, denominations: [500, 1] }));
    userRef.value = { id: 'u1' };
    const { preferences, loadPreferences, toggleDenomination, isMember } = (await loadUsePreferences())();

    await loadPreferences();
    expect(isMember.value).toBe(true);
    expect(preferences.value).toEqual({ includesNames: false, denominations: [500, 1] });

    toggleDenomination(50);
    expect(saved('preferences:u1').denominations).toEqual([500, 50, 1]);
    expect(saved('preferences').denominations).toEqual([100]);
  });

  it('follows login / logout through the per-owner cache without reloading', async () => {
    localStorage.setItem('preferences', JSON.stringify({ includesNames: true, denominations: [100] }));
    localStorage.setItem('preferences:u1', JSON.stringify({ includesNames: false, denominations: [500, 1] }));
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
    localStorage.setItem('preferences:u1', JSON.stringify({ includesNames: true, denominations: [500, 1] }));
    userRef.value = { id: 'u1' };
    const { preferences, loadPreferences, toggleDenomination } = (await loadUsePreferences())();

    const loading = loadPreferences(); // member load is async
    toggleDenomination(200);
    await loading;
    expect(preferences.value.denominations).toEqual([1000, 500, 200, 100, 50, 10, 5, 1]);
    expect(saved('preferences:u1').denominations).toEqual([1000, 500, 200, 100, 50, 10, 5, 1]);
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
