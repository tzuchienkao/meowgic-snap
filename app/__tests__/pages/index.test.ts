import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import AppTextarea from '../../components/app/Textarea/Textarea.vue';
import AppChip from '../../components/app/Chip/Chip.vue';
import AppAlert from '../../components/app/Alert/Alert.vue';
import AppIllustrationSlot from '../../components/app/IllustrationSlot/IllustrationSlot.vue';
import AppIconButton from '../../components/app/IconButton/IconButton.vue';
import AppTotalCard from '../../components/app/TotalCard/TotalCard.vue';
import AppDenomBadge from '../../components/app/DenomBadge/DenomBadge.vue';
import AppDenomCell from '../../components/app/DenomCell/DenomCell.vue';
import AppActionTile from '../../components/app/ActionTile/ActionTile.vue';
import AppDialog from '../../components/app/Dialog/Dialog.vue';
import AppCheckbox from '../../components/app/Checkbox/Checkbox.vue';
import AppPreferencesForm from '../../components/app/PreferencesForm/PreferencesForm.vue';
import IndexPage from '../../pages/index.vue';
import { createFakeSupabase, type FakeSupabase } from '../helpers/fakeSupabase';

// Simple pass-through stub for app-cat-ear-card exposing its tone prop
const AppCatEarCardStub = defineComponent({
  name: 'AppCatEarCard',
  props: {
    tone: { type: String, default: 'surface' },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: 'cat-card-stub',
          'data-tone': props.tone,
        },
        slots.default?.(),
      );
  },
});

const PLACEHOLDER = '算好的結果會出現在這裡喵';
const PLACEHOLDER_CAPTION = '貓咪插畫：橘白貓趴著等';
const ERROR_TITLE = '喵？有幾行看不懂 (ΦдΦ)';

let userRef: Ref<unknown>;
let themeRef: Ref<'light' | 'dark'>;
let navigateToMock: ReturnType<typeof vi.fn>;
let showToastMock: ReturnType<typeof vi.fn>;
let gtagMock: ReturnType<typeof vi.fn>;
let supabase: FakeSupabase;
// Minimal stand-in for Nuxt's useState (usePreferences keeps its cache there)
let stateStore: Record<string, Ref<unknown>>;
const useStateStub = <T>(key: string, init: () => T) => {
  if (!stateStore[key]) stateStore[key] = ref(init());
  return stateStore[key] as Ref<T>;
};

const mountPage = () =>
  mount(IndexPage, {
    global: {
      components: {
        AppButton,
        AppTextarea,
        AppChip,
        AppAlert,
        AppIllustrationSlot,
        AppIconButton,
        AppTotalCard,
        AppDenomBadge,
        AppDenomCell,
        AppActionTile,
        AppDialog,
        AppCheckbox,
        AppPreferencesForm,
        AppCatEarCard: AppCatEarCardStub,
      },
    },
  });

const findButton = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(label));

// The dark summary card only exists after a successful calculation (DS: one heaviest element per screen)
const summaryCard = (wrapper: VueWrapper) => {
  const cards = wrapper.findAll('.cat-card-stub');
  expect(cards).toHaveLength(2);
  return cards[1]!;
};

// Not calculated: illustration placeholder shown, dark summary card absent
const expectNotCalculated = (wrapper: VueWrapper) => {
  const placeholder = wrapper.find('.result-placeholder');
  expect(placeholder.exists()).toBe(true);
  expect(placeholder.text()).toContain(PLACEHOLDER);
  expect(wrapper.findAll('.cat-card-stub')).toHaveLength(1);
  expect(wrapper.find('.summary-card').exists()).toBe(false);
};

const errorTitle = (wrapper: VueWrapper) => wrapper.find('.money-snap__error-box .app-alert__title');

const counterText = (wrapper: VueWrapper) =>
  wrapper.find('.money-snap__counter').text();

const errorItems = (wrapper: VueWrapper) =>
  wrapper.findAll('.money-snap__errors li').map((li) => li.text());

const typeAndCalculate = async (wrapper: VueWrapper, input: string, label: string) => {
  await wrapper.find('textarea').setValue(input);
  const btn = findButton(wrapper, label);
  expect(btn).toBeDefined();
  await btn!.trigger('click');
  await flushPromises();
};

const lines = (n: number) =>
  Array.from({ length: n }, (_, i) => `name${i},1`).join('\n');

beforeEach(() => {
  stateStore = {};
  localStorage.clear();
  vi.stubGlobal('useState', useStateStub);
  userRef = ref(null);
  themeRef = ref('light');
  navigateToMock = vi.fn(() => Promise.resolve());
  vi.stubGlobal('useAuth', () => ({ user: userRef }));
  vi.stubGlobal('useTheme', () => ({ theme: themeRef }));
  vi.stubGlobal('navigateTo', navigateToMock);
  showToastMock = vi.fn();
  vi.stubGlobal('useToast', () => ({ showToast: showToastMock }));
  gtagMock = vi.fn();
  vi.stubGlobal('useGtag', () => ({ gtag: gtagMock }));
  // Member preferences load from Supabase; with nothing there yet they are migrated from
  // localStorage `preferences:<id>`, which is how these tests seed them.
  supabase = createFakeSupabase(() => userRef.value?.id ?? null);
  vi.stubGlobal('useNuxtApp', () => ({ $supabase: supabase }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pages/index.vue', () => {
  describe('initial / empty state', () => {
    it('renders placeholder, zero counter, no errors and disabled calculate button', () => {
      const wrapper = mountPage();

      expectNotCalculated(wrapper);
      expect(wrapper.find('.result-placeholder img').attributes('alt')).toBe(PLACEHOLDER_CAPTION);
      expect(counterText(wrapper)).toBe('已貼 0 / 1,000 筆');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(errorTitle(wrapper).exists()).toBe(false);

      const calc = findButton(wrapper, '直接計算');
      expect(calc).toBeDefined();
      expect(calc!.attributes('disabled')).toBeDefined();
    });

    it('shows the example placeholder in the textarea', () => {
      const wrapper = mountPage();
      expect(wrapper.find('textarea').attributes('placeholder')).toBe(
        '張三,18500\n李四,"45,800"\n王五,NT$32,000\n張三,1999',
      );
    });

    it('whitespace-only input keeps button disabled and counter at 0', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('   \n  \n\t ');

      expect(counterText(wrapper)).toBe('已貼 0 / 1,000 筆');
      expect(findButton(wrapper, '直接計算')!.attributes('disabled')).toBeDefined();
    });

    it('clicking the disabled calculate button does nothing', async () => {
      const wrapper = mountPage();
      await findButton(wrapper, '直接計算')!.trigger('click');
      await flushPromises();
      expectNotCalculated(wrapper);
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
    });
  });

  describe('counter / canCalculate boundaries', () => {
    it('counter is a soft Chip up to 1,000 and turns warn above 1,000', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue(lines(1000));
      expect(wrapper.find('.money-snap__counter').classes()).toEqual(expect.arrayContaining(['app-chip', 'app-chip--soft']));
      await wrapper.find('textarea').setValue(lines(1001));
      expect(wrapper.find('.money-snap__counter').classes()).toContain('app-chip--warn');
    });

    it('1000 lines → enabled with counter 1000', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue(lines(1000));

      expect(counterText(wrapper)).toBe('已貼 1000 / 1,000 筆');
      expect(findButton(wrapper, '直接計算')!.attributes('disabled')).toBeUndefined();
    });

    it('1001 lines → counter may exceed 1,000 and the button stays enabled', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue(lines(1001));

      expect(counterText(wrapper)).toBe('已貼 1001 / 1,000 筆');
      expect(findButton(wrapper, '直接計算')!.attributes('disabled')).toBeUndefined();
    });

    it('counter ignores blank lines in the middle', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('a,1\n\nb,2');
      expect(counterText(wrapper)).toBe('已貼 2 / 1,000 筆');
    });

    it('counter ignores whitespace-only lines', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('a,1\n   \n\t\nb,2');
      expect(counterText(wrapper)).toBe('已貼 2 / 1,000 筆');
    });

    it('counter counts invalid lines', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('a,1\ngarbage\nb,xyz');
      // NOTE: current behaviour — invalid lines are counted toward the "已貼" counter
      expect(counterText(wrapper)).toBe('已貼 3 / 1,000 筆');
    });

    it('leading/trailing blank lines are trimmed from the count', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('\n\na,1\nb,2\n\n');
      expect(counterText(wrapper)).toBe('已貼 2 / 1,000 筆');
    });

    it('1000 valid rows with blank lines in between → counter 1000 and calculation succeeds', async () => {
      const wrapper = mountPage();
      const input = `${lines(999)}\n\n\nlast,1`; // 1000 valid rows + 2 blank lines
      await typeAndCalculate(wrapper, input, '直接計算');
      expect(counterText(wrapper)).toBe('已貼 1000 / 1,000 筆');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).text()).toContain('總筆數：1000 筆');
    });

    it('header row is not counted', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('姓名,金額\n張三,1\n李四,2');
      expect(counterText(wrapper)).toBe('已貼 2 / 1,000 筆');
    });

    it('1000 data rows plus a header row → counter 1000 and calculation succeeds', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, `姓名,金額\n${lines(1000)}`, '直接計算');
      expect(counterText(wrapper)).toBe('已貼 1000 / 1,000 筆');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
    });

    it('lone CR line endings are counted as separate lines', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('a,1\rb,2\rc,3');
      expect(counterText(wrapper)).toBe('已貼 3 / 1,000 筆');
    });

    it('CRLF line endings are counted as single lines', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue('a,1\r\nb,2');
      expect(counterText(wrapper)).toBe('已貼 2 / 1,000 筆');
    });
  });

  describe('calculate flow (guest)', () => {
    it('valid input renders total, meta, aggregated rows and denomination chips', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,18500\n李四,32000\n張三,1999', '直接計算');

      const card = summaryCard(wrapper);
      expect(wrapper.find('.result-placeholder').exists()).toBe(false);
      expect(card.text()).not.toContain(PLACEHOLDER);
      expect(card.find('.app-total-card__amount-value').text()).toBe('52,499');

      const meta = card.findAll('.app-total-card__chips .app-chip').map((s) => s.text());
      expect(meta[0]).toBe('總筆數：3 筆 · 2 人');
      expect(meta[1]).toBe('姓名,金額');
      expect(meta[2]).toMatch(/^計算時間 \S+/);

      const rows = wrapper.findAll('.summary-card__row');
      expect(rows).toHaveLength(2);

      const heads = rows.map((r) =>
        r.findAll('.summary-card__row-head span').map((s) => s.text()),
      );
      expect(heads[0]).toEqual(['張三', '20,499 元']);
      expect(heads[1]).toEqual(['李四', '32,000 元']);

      const chips0 = rows[0]!.findAll('.summary-card__row-body .app-denom-badge').map((s) => s.text());
      // DS: "NT$面額 N 張 / N 個", smallest → largest, zero counts not rendered
      // Default (common) denominations: 20,499 = 1000×20 + 100×4 + 50×1 + 10×4 + 5×1 + 1×4
      expect(chips0).toEqual([
        'NT$1 4 個',
        'NT$5 1 個',
        'NT$10 4 個',
        'NT$50 1 個',
        'NT$100 4 張',
        'NT$1,000 20 張',
      ]);

      const chips1 = rows[1]!.findAll('.summary-card__row-body .app-denom-badge').map((s) => s.text());
      expect(chips1).toEqual(['NT$1,000 32 張']);
    });

    it('denomination chips use 張 for bills and 個 for coins with thousand separators', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,18500\n李四,3888\n王五,5', '直接計算');

      const chips = wrapper
        .findAll('.summary-card__row')
        .map((r) => r.findAll('.summary-card__row-body .app-denom-badge').map((s) => s.text()));
      expect(chips[0]).toEqual(['NT$500 1 張', 'NT$1,000 18 張']);
      // 3888 = 1000×3 + 500 + 100×3 + 50 + 10×3 + 5 + 1×3 (no 2000 / 200 / 20 by default)
      expect(chips[1]).toEqual([
        'NT$1 3 個',
        'NT$5 1 個',
        'NT$10 3 個',
        'NT$50 1 個',
        'NT$100 3 張',
        'NT$500 1 張',
        'NT$1,000 3 張',
      ]);
      expect(chips[2]).toEqual(['NT$5 1 個']);
      expect(chips.flat().some((c) => c.includes('×'))).toBe(false);
      expect(chips.flat().some((c) => / 0 [張個]$/.test(c))).toBe(false);
    });

    it('accepts quoted thousand separators, currency prefix and tab delimiters', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '李四,"45,800"\n王五,NT$32,000\n趙六\t100', '直接計算');

      const card = summaryCard(wrapper);
      expect(card.find('.app-total-card__amount-value').text()).toBe('77,900');
      expect(card.find('.app-total-card__chips .app-chip').text()).toBe('總筆數：3 筆 · 3 人');
    });

    it('all-invalid input shows line errors and stays not calculated', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'foo\nbar,abc', '直接計算');

      expect(errorTitle(wrapper).text()).toBe(ERROR_TITLE);
      expect(errorItems(wrapper)).toEqual(['第 1 行「foo」少了逗號', '第 2 行「bar,abc」不是金額']);
      expectNotCalculated(wrapper);
      expect(findButton(wrapper, '直接計算')).toBeDefined();
    });

    it('shows at most 5 line errors plus 「還有 N 行也看不懂」 when there are more', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, Array.from({ length: 8 }, (_, i) => `bad${i}`).join('\n'), '直接計算');

      expect(errorTitle(wrapper).text()).toBe(ERROR_TITLE);
      expect(errorItems(wrapper)).toEqual([
        '第 1 行「bad0」少了逗號',
        '第 2 行「bad1」少了逗號',
        '第 3 行「bad2」少了逗號',
        '第 4 行「bad3」少了逗號',
        '第 5 行「bad4」少了逗號',
        '還有 3 行也看不懂',
      ]);
      expectNotCalculated(wrapper);
    });

    it('6 line errors → 5 shown plus 「還有 1 行也看不懂」', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, Array.from({ length: 6 }, (_, i) => `bad${i}`).join('\n'), '直接計算');
      const items = errorItems(wrapper);
      expect(items).toHaveLength(6);
      expect(items[5]).toBe('還有 1 行也看不懂');
    });

    it('exactly 5 line errors → all 5 shown, no 「還有」 line', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, `張三,100\n${Array.from({ length: 5 }, (_, i) => `bad${i}`).join('\n')}`, '直接計算');

      expect(errorTitle(wrapper).text()).toBe(ERROR_TITLE);
      const items = errorItems(wrapper);
      expect(items).toHaveLength(5);
      expect(items.every((e) => e.startsWith('第 '))).toBe(true);
      expect(items.some((e) => e.includes('還有'))).toBe(false);
      expect(wrapper.find('.money-snap__errors-more').exists()).toBe(false);
    });

    it('error line numbers count blank lines', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'a,1\n\nbad', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 3 行「bad」少了逗號']);
    });

    it('partial invalid input blocks the whole calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100\nbad line\n李四,200', '直接計算');

      expect(errorItems(wrapper)).toEqual(['第 2 行「bad line」少了逗號']);
      expectNotCalculated(wrapper);
      expect(wrapper.find('.summary-card__row').exists()).toBe(false);
    });

    it('decimal / zero / negative amounts are rejected as format errors', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'a,1.5\nb,0\nc,-5', '直接計算');
      expect(errorItems(wrapper)).toEqual([
        '第 1 行「a,1.5」不是金額',
        '第 2 行「b,0」不是金額',
        '第 3 行「c,-5」不是金額',
      ]);
    });

    it('an over-cap line among valid lines shows the per-entry cap error and blocks calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,999999\n李四,1000000', '直接計算');

      expect(errorItems(wrapper)).toEqual(['第 2 行「李四,1000000」金額超過 999,999']);
      expectNotCalculated(wrapper);
    });

    it('single amount above 999,999 → per-entry cap error (success=false path)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1000000', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 1 行「張三,1000000」金額超過 999,999']);
      expectNotCalculated(wrapper);
    });

    it('amount exactly 999,999 is accepted', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,"999,999"', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('999,999');
    });

    it('a header row on the first line is skipped and calculation succeeds', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '姓名,金額\n張三,100\n李四,200', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('300');
      expect(summaryCard(wrapper).text()).toContain('總筆數：2 筆 · 2 人');
    });

    it('Excel CSV paste with BOM, header, quoted names and 元 suffix merges into one person per name', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(
        wrapper,
        '\uFEFF姓名,金額(元)\r\n"張三","1,000元"\r\n張三，NT$ 500\r\n李四,200 元',
        '直接計算',
      );
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      const heads = wrapper
        .findAll('.summary-card__row-head')
        .map((r) => r.findAll('span').map((x) => x.text()));
      expect(heads).toEqual([
        ['張三', '1,500 元'],
        ['李四', '200 元'],
      ]);
      expect(summaryCard(wrapper).text()).toContain('總筆數：3 筆 · 2 人');
    });

    it('accounting-format negative amount shows a format error and blocks calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100\n李四,(200)', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 2 行「李四,(200)」不是金額']);
      expectNotCalculated(wrapper);
    });

    it('name longer than 20 characters shows the name-length error', async () => {
      const wrapper = mountPage();
      const line = `${'王'.repeat(21)},100`;
      await typeAndCalculate(wrapper, line, '直接計算');
      expect(errorItems(wrapper)).toEqual([`第 1 行「${'王'.repeat(20)}…」姓名超過 20 字`]);
    });

    it('full-width IME input and Taiwan currency words calculate correctly', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三，１，０００元\n李四,新台幣 500 元整\n王五,NT $２００', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('1,700');
    });

    it('names with hidden zero-width characters are merged into one row', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張\u200B三,100\n張三,200', '直接計算');
      const heads = wrapper
        .findAll('.summary-card__row-head')
        .map((r) => r.findAll('span').map((x) => x.text()));
      expect(heads).toEqual([['張三', '300 元']]);
      expect(summaryCard(wrapper).text()).toContain('總筆數：2 筆 · 1 人');
    });

    it('lone CR input (Excel export) calculates all rows', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100\r李四,200', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('300');
    });

    it('badly grouped thousand separators block calculation with the line content', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1,000\n李四,100,20', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 2 行「李四,100,20」不是金額']);
      expectNotCalculated(wrapper);
    });

    it('re-calculating after a failure clears previous errors on success', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 1 行「bad」少了逗號']);

      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('100');
    });

    it('after success guests see only the clear button', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');

      expect(findButton(wrapper, '直接計算')).toBeUndefined();
      expect(findButton(wrapper, '登入存檔')).toBeUndefined();
      expect(wrapper.find('.login-prompt').exists()).toBe(false);
      const actionButtons = wrapper.find('.action-buttons').findAll('button');
      expect(actionButtons.map((b) => b.text())).toEqual(['清除資料，算下一筆']);
    });

    it('guest clear button resets input, errors and summary, then allows a new calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');

      await findButton(wrapper, '清除資料，算下一筆')!.trigger('click');
      await flushPromises();

      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('');
      expect(counterText(wrapper)).toBe('已貼 0 / 1,000 筆');
      expectNotCalculated(wrapper);
      expect(findButton(wrapper, '直接計算')).toBeDefined();
      expect(findButton(wrapper, '登入存檔')).toBeDefined();

      await typeAndCalculate(wrapper, '李四,200', '直接計算');
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('200');
    });

    it('textarea is editable before calculation and after a failed calculation', async () => {
      const wrapper = mountPage();
      expect(wrapper.find('textarea').attributes('readonly')).toBeUndefined();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      expect(wrapper.find('textarea').attributes('readonly')).toBeUndefined();
    });

    it('textarea is locked (readonly) after a successful guest calculation so the result cannot go stale', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');

      expect(wrapper.find('textarea').attributes('readonly')).toBeDefined();
      expect(findButton(wrapper, '清除資料，算下一筆')).toBeDefined();
    });

    it('clear unlocks the textarea again', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      await findButton(wrapper, '清除資料，算下一筆')!.trigger('click');
      await flushPromises();
      expect(wrapper.find('textarea').attributes('readonly')).toBeUndefined();
    });

    it('per-person aggregated total over 999,999 shows an error and blocks calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,999999\n李四,1\n張三,1', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 3 行「張三,1」張三 合計超過 999,999']);
      expectNotCalculated(wrapper);
    });

    it('per-person aggregated total exactly 999,999 is accepted', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,500000\n張三,499999', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      const head = wrapper.findAll('.summary-card__row-head span').map((s) => s.text());
      expect(head).toEqual(['張三', '999,999 元']);
    });

    it('English names are case-sensitive (Amy and amy are separate rows)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'Amy,100\namy,200', '直接計算');
      const rows = wrapper.findAll('.summary-card__row-head');
      expect(rows.map((r) => r.findAll('span')[0]!.text())).toEqual(['Amy', 'amy']);
      expect(summaryCard(wrapper).text()).toContain('總筆數：2 筆 · 2 人');
    });

    it('textarea and buttons are not disabled after processing finishes', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      expect(wrapper.find('textarea').attributes('disabled')).toBeUndefined();
      expect(findButton(wrapper, '匯入 CSV')!.attributes('disabled')).toBeUndefined();
      expect(findButton(wrapper, '直接計算')!.attributes('disabled')).toBeUndefined();
      expect(findButton(wrapper, '登入存檔')!.attributes('disabled')).toBeUndefined();

      await typeAndCalculate(wrapper, '張三,1', '直接計算');
      expect(wrapper.find('textarea').attributes('disabled')).toBeUndefined();
      expect(findButton(wrapper, '匯入 CSV')!.attributes('disabled')).toBeUndefined();
    });
  });

  describe('guest login prompt', () => {
    it('shows calculate + 登入存檔 buttons and no current-settings pill (guests use the left-edge 偏好設定 tab)', () => {
      const wrapper = mountPage();
      expect(wrapper.find('.login-prompt').exists()).toBe(false);
      const actions = wrapper.find('.action-buttons').findAll('button').map((b) => b.text());
      expect(actions).toEqual(['直接計算', '登入存檔 ฅ^•ﻌ•^ฅ']);
      expect(wrapper.find('.current-settings').exists()).toBe(false);
    });

    it('"登入存檔" calls navigateTo("/")', async () => {
      const wrapper = mountPage();
      await findButton(wrapper, '登入存檔')!.trigger('click');
      await flushPromises();
      expect(navigateToMock).toHaveBeenCalledTimes(1);
      expect(navigateToMock).toHaveBeenCalledWith('/');
    });
  });

  describe('logged in', () => {
    beforeEach(() => {
      userRef.value = { id: 'u1' };
    });

    it('shows current-settings button, save label, and hides guest prompt', () => {
      const wrapper = mountPage();
      const settings = wrapper.find('.current-settings button');
      expect(settings.exists()).toBe(true);
      expect(settings.text()).toContain('目前設定：姓名,金額 · 7 種面額');
      expect(settings.text()).toContain('到設定修改 ›');

      expect(findButton(wrapper, '計算並存檔 ฅ^•ﻌ•^ฅ')).toBeDefined();
      expect(findButton(wrapper, '直接計算')).toBeUndefined();
      expect(wrapper.find('.login-prompt').exists()).toBe(false);
      expect(findButton(wrapper, '登入存檔')).toBeUndefined();
    });

    it('save button disabled when empty', () => {
      const wrapper = mountPage();
      expect(findButton(wrapper, '計算並存檔')!.attributes('disabled')).toBeDefined();
    });

    it('after calculate shows clear button; clear resets everything', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100\n李四,200', '計算並存檔');

      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('300');
      expect(findButton(wrapper, '計算並存檔')).toBeUndefined();
      const clear = findButton(wrapper, '清除資料，算下一筆');
      expect(clear).toBeDefined();

      await clear!.trigger('click');
      await nextTick();

      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expectNotCalculated(wrapper);
      expect(counterText(wrapper)).toBe('已貼 0 / 1,000 筆');
      expect(findButton(wrapper, '計算並存檔')).toBeDefined();
      expect(findButton(wrapper, '計算並存檔')!.attributes('disabled')).toBeDefined();
    });

    it('failed calculation keeps the save button (no clear button) and shows errors', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '計算並存檔');
      expect(errorItems(wrapper)).toEqual(['第 1 行「bad」少了逗號']);
      expect(findButton(wrapper, '計算並存檔')).toBeDefined();
      expect(findButton(wrapper, '清除資料')).toBeUndefined();
    });

    it('does not perform any save / navigation on calculate', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '計算並存檔');
      // NOTE: current behaviour — "計算並存檔" only calculates; nothing is persisted
      expect(navigateToMock).not.toHaveBeenCalled();
    });

    it('reacts to the user ref changing at runtime', async () => {
      const wrapper = mountPage();
      userRef.value = null;
      await nextTick();
      expect(findButton(wrapper, '直接計算')).toBeDefined();
      expect(wrapper.find('.current-settings').exists()).toBe(false);
    });
  });

  describe('result area (design-system layout)', () => {
    const billCells = (wrapper: VueWrapper) =>
      wrapper.findAll('.result-area__bills .app-denom-cell').map((c) => ({
        value: c.find('.app-denom-cell__value').text(),
        count: c.find('.app-denom-cell__count').text(),
        state: ['top', 'has', 'zero'].find((st) => c.classes().includes(`app-denom-cell--${st}`)),
      }));
    const coinCells = (wrapper: VueWrapper) =>
      wrapper.findAll('.result-area__coins .app-denom-cell').map((c) => ({
        value: c.find('.app-denom-cell__value').text(),
        count: c.find('.app-denom-cell__count').text(),
      }));

    it('the total card holds only the amount and chips; details are outside it', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(summaryCard(wrapper).find('.summary-card__row').exists()).toBe(false);
      expect(wrapper.find('.result-area__details .summary-card__row').exists()).toBe(true);
    });

    it('shows the three enabled export ActionTiles between the total card and the denominations', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      const tiles = wrapper.findAll('.result-area__actions .app-action-tile');
      expect(tiles.map((t) => t.text())).toEqual(['⧉複製領款單', '▣下載明細圖', '↓匯出 CSV']);
      tiles.forEach((t) => expect(t.attributes('disabled')).toBeUndefined());
      const order = wrapper.findAll('.result-area > *').map((el) => el.classes());
      expect(order[0]).toContain('summary-card');
      expect(order[1]).toContain('result-area__actions');
      expect(order[2]).toContain('result-area__denoms');
    });

    describe('export actions', () => {
      const INPUT = '張三,18500\n李四,3888\n張三,1999';
      const SLIP_TEXT =
        '領款總額：24,387元\n' +
        '【紙鈔】1,000元 23張 / 500元 1張 / 100元 7張\n' +
        '【硬幣】50元 2個 / 10元 7個 / 5元 2個 / 1元 7個';
      const CSV =
        '\uFEFF姓名,金額,NT$1000,NT$500,NT$100,NT$50,NT$10,NT$5,NT$1\r\n' +
        '張三,20499,20,0,4,1,4,1,4\r\n' +
        '李四,3888,3,1,3,1,3,1,3\r\n' +
        '合計,24387,23,1,7,2,7,2,7';

      let createObjectURL: ReturnType<typeof vi.fn>;
      let revokeObjectURL: ReturnType<typeof vi.fn>;
      let clickSpy: ReturnType<typeof vi.spyOn>;
      let downloadNames: string[];
      let originalUrlFns: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;

      const clickTile = async (wrapper: VueWrapper, label: string) => {
        const tile = wrapper.findAll('.app-action-tile').find((t) => t.text().includes(label));
        expect(tile).toBeDefined();
        await tile!.trigger('click');
        await flushPromises();
      };

      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        createObjectURL = vi.fn(() => 'blob:mock');
        revokeObjectURL = vi.fn();
        originalUrlFns = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
        Object.assign(URL, { createObjectURL, revokeObjectURL });
        downloadNames = [];
        clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
          downloadNames.push(this.download);
        });
      });

      // happy-dom has no canvas API: define getContext / toBlob for one test
      const stubCanvas = (getContext: () => unknown, toBlob?: (cb: BlobCallback) => void) => {
        const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
        Object.defineProperty(proto, 'getContext', { value: vi.fn(getContext), configurable: true, writable: true });
        Object.defineProperty(proto, 'toBlob', { value: vi.fn(toBlob ?? (() => {})), configurable: true, writable: true });
        return proto as { getContext: ReturnType<typeof vi.fn>; toBlob: ReturnType<typeof vi.fn> };
      };

      afterEach(() => {
        const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
        delete proto.getContext;
        delete proto.toBlob;
        Object.assign(URL, originalUrlFns);
        delete (document as unknown as Record<string, unknown>).execCommand;
        clickSpy.mockRestore();
        vi.restoreAllMocks();
        vi.useRealTimers();
      });

      it('copy writes the slip text to the clipboard and shows a toast', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, INPUT, '直接計算');

        await clickTile(wrapper, '複製領款單');

        expect(writeText).toHaveBeenCalledWith(SLIP_TEXT);
        expect(showToastMock).toHaveBeenCalledWith('領款單已複製，可以貼給銀行了喵');
        expect(gtagMock).toHaveBeenCalledWith('event', 'copy_slip', { result: 'success', entry_count: 3 });
      });

      it('copy shows the failure toast when no copy method works', async () => {
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) } });
        Object.defineProperty(document, 'execCommand', { value: vi.fn(() => false), configurable: true });
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, INPUT, '直接計算');

        await clickTile(wrapper, '複製領款單');

        expect(showToastMock).toHaveBeenCalledWith('複製失敗了喵，再試一次看看');
        expect(gtagMock).toHaveBeenCalledWith('event', 'copy_slip', { result: 'failed', entry_count: 3 });
      });

      it('CSV downloads a BOM + CRLF CSV blob named 領款明細_*.csv', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, INPUT, '直接計算');

        await clickTile(wrapper, '匯出 CSV');

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        const blob = createObjectURL.mock.calls[0]![0] as Blob;
        expect(blob.type).toBe('text/csv;charset=utf-8');
        const bytes = new Uint8Array(await blob.arrayBuffer());
        expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
        expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)).toBe(CSV);
        expect(downloadNames[0]).toMatch(/^領款明細_\d{8}-\d{4}\.csv$/);
        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
        expect(showToastMock).toHaveBeenCalledWith('CSV 匯出好了喵');
        expect(gtagMock).toHaveBeenCalledWith('event', 'export_csv', { result: 'success', entry_count: 3 });
      });

      it('image draws the slip on a canvas and downloads a PNG', async () => {
        const drawnTexts: string[] = [];
        const ctx = new Proxy({} as Record<string | symbol, unknown>, {
          get: (target, prop) => {
            if (prop in target) return target[prop];
            if (prop === 'measureText') return () => ({ width: 100 });
            if (prop === 'fillText') return (text: string) => drawnTexts.push(text);
            return () => {};
          },
          set: (target, prop, value) => { target[prop] = value; return true; },
        });
        const png = new Blob(['png'], { type: 'image/png' });
        const { toBlob } = stubCanvas(() => ctx, (cb) => cb(png));
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, INPUT, '直接計算');

        await clickTile(wrapper, '下載明細圖');

        expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
        expect(createObjectURL).toHaveBeenCalledWith(png);
        expect(downloadNames[0]).toMatch(/^領款明細_\d{8}-\d{4}\.png$/);
        // Time line ends with the number of entries calculated (3 lines, 2 people)
        expect(drawnTexts.some((t) => t.startsWith('計算時間 ') && t.endsWith(' · 共 3 筆'))).toBe(true);
        expect(showToastMock).toHaveBeenCalledWith('明細圖下載好了喵');
        expect(gtagMock).toHaveBeenCalledWith('event', 'download_image', { result: 'success', entry_count: 3 });
      });

      it('CSV in amount-only mode starts with 編號,金額 (the mode the calculation used)', async () => {
        localStorage.setItem('preferences', JSON.stringify({ includesNames: false, denominations: [1000, 500, 100, 50, 10, 5, 1] }));
        const { usePreferences } = await import('../../composables/usePreferences');
        await usePreferences().loadPreferences();
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, '金額\n1500\n3', '直接計算');

        await clickTile(wrapper, '匯出 CSV');

        const blob = createObjectURL.mock.calls[0]![0] as Blob;
        const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(await blob.arrayBuffer()));
        expect(csv).toBe(
          '\uFEFF編號,金額,NT$1000,NT$500,NT$100,NT$50,NT$10,NT$5,NT$1\r\n' +
          '第 1 筆,1500,1,1,0,0,0,0,0\r\n' +
          '第 2 筆,3,0,0,0,0,0,0,3\r\n' +
          '合計,1503,1,1,0,0,0,0,3',
        );
      });

      it('image shows the failure toast when the canvas is unavailable', async () => {
        stubCanvas(() => null);
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, INPUT, '直接計算');

        await clickTile(wrapper, '下載明細圖');

        expect(createObjectURL).not.toHaveBeenCalled();
        expect(showToastMock).toHaveBeenCalledWith('明細圖下載失敗了喵，再試一次看看');
        expect(gtagMock).toHaveBeenCalledWith('event', 'download_image', { result: 'failed', entry_count: 3 });
      });
    });

    it('bill cells sum everyone (large → small), highlight the most-used bill and mark zeros', async () => {
      const wrapper = mountPage();
      // 張三 20,499 = 1000×20 + 100×4 + 50 + 10×4 + 5 + 1×4 ; 李四 32,000 = 1000×32
      await typeAndCalculate(wrapper, '張三,18500\n李四,32000\n張三,1999', '直接計算');
      // Only the common bills are shown: 1000, 500, 100
      expect(billCells(wrapper)).toEqual([
        { value: 'NT$1,000', count: '52', state: 'top' },
        { value: 'NT$500', count: '0', state: 'zero' },
        { value: 'NT$100', count: '4', state: 'has' },
      ]);
    });

    it('shows only the common denominations (no 2000 / 200 / 20 cells)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,2220', '直接計算');
      const values = wrapper.findAll('.result-area__denoms .app-denom-cell__value').map((v) => v.text());
      expect(values).toEqual(['NT$1,000', 'NT$500', 'NT$100', 'NT$50', 'NT$10', 'NT$5', 'NT$1']);
    });

    it('coin cells sum everyone (large → small)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,18500\n李四,3888\n王五,5', '直接計算');
      // 3888 → 50×1, 10×3, 5×1, 1×3 ; 王五 5 → 5×1
      expect(coinCells(wrapper)).toEqual([
        { value: 'NT$50', count: '1' },
        { value: 'NT$10', count: '3' },
        { value: 'NT$5', count: '2' },
        { value: 'NT$1', count: '3' },
      ]);
      expect(wrapper.find('.result-area__unit').text()).toBe('單位：個');
    });

    it('a tie for most-used bill highlights the larger bill', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1500', '直接計算'); // 1000×1 + 500×1
      expect(billCells(wrapper).filter((c) => c.state === 'top').map((c) => c.value)).toEqual(['NT$1,000']);
    });

    it('no bill is highlighted when only coins are used', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,66', '直接計算');
      expect(billCells(wrapper).every((c) => c.state === 'zero')).toBe(true);
    });

    it('每筆明細 is open by default and can be collapsed / expanded', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      const toggle = wrapper.find('.result-area__details-toggle');
      const list = wrapper.find('#result-details-list');
      expect(toggle.attributes('aria-expanded')).toBe('true');
      expect(toggle.attributes('aria-controls')).toBe('result-details-list');
      expect(toggle.text()).toContain('收起 ▲');
      expect((list.element as HTMLElement).style.display).not.toBe('none');

      await toggle.trigger('click');
      expect(toggle.attributes('aria-expanded')).toBe('false');
      expect(toggle.text()).toContain('展開 ▼');
      expect((list.element as HTMLElement).style.display).toBe('none');

      await toggle.trigger('click');
      expect(toggle.attributes('aria-expanded')).toBe('true');
    });

    it('每筆明細 re-opens on the next calculation after being collapsed', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      await wrapper.find('.result-area__details-toggle').trigger('click');
      await findButton(wrapper, '清除資料，算下一筆')!.trigger('click');
      await flushPromises();
      await typeAndCalculate(wrapper, '李四,200', '直接計算');
      expect(wrapper.find('.result-area__details-toggle').attributes('aria-expanded')).toBe('true');
    });
  });

  describe('偏好設定 (preferences)', () => {
    const savePreferences = (key: string, value: object) => localStorage.setItem(key, JSON.stringify(value));
    const guestPrefs = (value: object) => savePreferences('preferences', value);
    const loadPrefs = async () => {
      const { usePreferences } = await import('../../composables/usePreferences');
      await usePreferences().loadPreferences();
    };
    const cellValues = (wrapper: VueWrapper) =>
      wrapper.findAll('.result-area__denoms .app-denom-cell__value').map((v) => v.text());
    const remainder = (wrapper: VueWrapper) => wrapper.find('.result-area__remainder');

    it('member pill reads 到設定修改 and navigates to the settings route', async () => {
      userRef.value = { id: 'u1' };
      const wrapper = mountPage();
      await wrapper.find('.current-settings button').trigger('click');
      expect(navigateToMock).toHaveBeenCalledWith({ name: 'settings' });
    });

    it('member pill text reflects saved preferences (amount-only, N denominations)', async () => {
      userRef.value = { id: 'u1' };
      savePreferences('preferences:u1', { includesNames: false, denominations: [2000, 1000, 100, 1] });
      await loadPrefs();
      const wrapper = mountPage();
      expect(wrapper.find('.current-settings button').text()).toContain('目前設定：純金額 · 4 種面額');
    });

    it('member pill uses the member preferences', async () => {
      userRef.value = { id: 'u1' };
      savePreferences('preferences:u1', { includesNames: true, denominations: [500, 100, 1] });
      await loadPrefs();
      const wrapper = mountPage();
      expect(wrapper.find('.current-settings button').text()).toContain('目前設定：姓名,金額 · 3 種面額');
    });

    it('cells, badges and the calculation use the enabled denominations', async () => {
      guestPrefs({ includesNames: true, denominations: [2000, 200, 20, 1] });
      await loadPrefs();
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,2241', '直接計算');

      expect(cellValues(wrapper)).toEqual(['NT$2,000', 'NT$200', 'NT$20', 'NT$1']);
      // 2241 = 2000 + 200 + 20×2 + 1
      const badges = wrapper.findAll('.summary-card__row-body .app-denom-badge').map((b) => b.text());
      expect(badges).toHaveLength(4);
      expect(remainder(wrapper).exists()).toBe(false);
    });

    it('shows the remainder warning when NT$1 is off (guest copy), and keeps the results', async () => {
      guestPrefs({ includesNames: true, denominations: [1000, 500, 100, 50, 10, 5] });
      await loadPrefs();
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1003\n李四,1004', '直接計算');

      expect(remainder(wrapper).attributes('role')).toBe('alert');
      expect(remainder(wrapper).text()).toBe('還有 7 元找不開喵，因為你關掉了 NT$1。到左邊的偏好設定把它打開吧。');
      expect(wrapper.find('.summary-card').exists()).toBe(true);
    });

    it('remainder warning names the smallest needed denomination and uses the member copy', async () => {
      userRef.value = { id: 'u1' };
      // 5 and 1 are off: 1005 leaves 5 (needs NT$5), 1007 leaves 7 (needs NT$5 + NT$1) → smallest is NT$1
      savePreferences('preferences:u1', { includesNames: true, denominations: [1000, 500, 100, 50, 10] });
      await loadPrefs();
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1005', '計算並存檔');
      expect(remainder(wrapper).text()).toBe('還有 5 元找不開喵，因為你關掉了 NT$5。到設定頁把它打開吧。');

      await findButton(wrapper, '清除資料')!.trigger('click');
      await typeAndCalculate(wrapper, '張三,1005\n李四,1007', '計算並存檔');
      expect(remainder(wrapper).text()).toBe('還有 12 元找不開喵，因為你關掉了 NT$1。到設定頁把它打開吧。');
    });

    it('turning NT$1 back on (e.g. from the guest drawer) recalculates and removes the warning', async () => {
      guestPrefs({ includesNames: true, denominations: [1000, 500, 100, 50, 10, 5] });
      await loadPrefs();
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1003', '直接計算');
      expect(remainder(wrapper).exists()).toBe(true);

      const { usePreferences } = await import('../../composables/usePreferences');
      usePreferences().toggleDenomination(1);
      await nextTick();
      expect(remainder(wrapper).exists()).toBe(false);
    });

    describe('changing denominations through the guest form (drawer)', () => {
      // The page next to the real 偏好設定 form, like the landing layout with its drawer
      const mountWithForm = () => {
        const Host = defineComponent({
          setup: () => () => h('div', [h(AppPreferencesForm, { stacked: true }), h(IndexPage)]),
        });
        return mount(Host, {
          global: {
            components: {
              AppButton, AppTextarea, AppChip, AppAlert, AppIllustrationSlot, AppIconButton,
              AppTotalCard, AppDenomBadge, AppDenomCell, AppActionTile, AppDialog, AppCheckbox,
              AppPreferencesForm, AppCatEarCard: AppCatEarCardStub,
            },
          },
        });
      };
      const formBox = (wrapper: VueWrapper, label: string) =>
        wrapper
          .findAll('.app-preferences-form [role="checkbox"]')
          .find((b) => b.find('.app-checkbox__label').text() === label)!;
      const groupAll = (wrapper: VueWrapper, group: string) =>
        wrapper.find(`.app-preferences-form__group[aria-label="${group}"] .app-preferences-form__group-head [role="checkbox"]`);
      const cellCounts = (wrapper: VueWrapper) =>
        wrapper.findAll('.result-area__denoms .app-denom-cell').map((c) => [
          c.find('.app-denom-cell__value').text(),
          c.find('.app-denom-cell__count').text(),
        ]);
      const badges = (wrapper: VueWrapper) =>
        wrapper.findAll('.summary-card__row-body .app-denom-badge').map((b) => b.text());
      // 1850 with [1000, 500, 200, 100, 50, 10, 5, 1] = 1000 + 500 + 200 + 100 + 50
      const WITH_200 = [['NT$1,000', '1'], ['NT$500', '1'], ['NT$200', '1'], ['NT$100', '1'], ['NT$50', '1'], ['NT$10', '0'], ['NT$5', '0'], ['NT$1', '0']];
      // Defaults: 1000 + 500 + 100×3 + 50
      const DEFAULTS = [['NT$1,000', '1'], ['NT$500', '1'], ['NT$100', '3'], ['NT$50', '1'], ['NT$10', '0'], ['NT$5', '0'], ['NT$1', '0']];

      it('NT$200 turned on before calculating is used (also before preferences are loaded)', async () => {
        const wrapper = mountWithForm();
        await formBox(wrapper, 'NT$200').trigger('click');
        await loadPrefs(); // app.vue may finish loading after the toggle
        await typeAndCalculate(wrapper, '張三,1850', '直接計算');

        expect(formBox(wrapper, 'NT$200').attributes('aria-checked')).toBe('true');
        expect(cellCounts(wrapper)).toEqual(WITH_200);
        expect(badges(wrapper)).toHaveLength(5);
        expect(JSON.parse(localStorage.getItem('preferences')!).denominations).toEqual([1000, 500, 200, 100, 50, 10, 5, 1]);
      });

      it('toggling NT$200 after calculating updates cells and badges live', async () => {
        await loadPrefs();
        const wrapper = mountWithForm();
        await typeAndCalculate(wrapper, '張三,1850', '直接計算');
        expect(cellCounts(wrapper)).toEqual(DEFAULTS);

        await formBox(wrapper, 'NT$200').trigger('click');
        expect(cellCounts(wrapper)).toEqual(WITH_200);
        await formBox(wrapper, 'NT$200').trigger('click');
        expect(cellCounts(wrapper)).toEqual(DEFAULTS);
      });

      it('coins only (紙鈔 全選 off) does not break the results, and bills can come back', async () => {
        await loadPrefs();
        const wrapper = mountWithForm();
        await typeAndCalculate(wrapper, '張三,1850', '直接計算');

        await groupAll(wrapper, '紙鈔').trigger('click'); // all bills on
        await groupAll(wrapper, '紙鈔').trigger('click'); // all bills off
        // 1850 = 50 × 37; no 紙鈔 group is shown
        expect(cellCounts(wrapper)).toEqual([['NT$50', '37'], ['NT$10', '0'], ['NT$5', '0'], ['NT$1', '0']]);
        expect(wrapper.find('.result-area__bills').exists()).toBe(false);
        expect(wrapper.find('.app-denom-cell--top').exists()).toBe(false);

        await formBox(wrapper, 'NT$200').trigger('click');
        // 1850 = 200 × 9 + 50
        expect(cellCounts(wrapper)).toEqual([['NT$200', '9'], ['NT$50', '1'], ['NT$10', '0'], ['NT$5', '0'], ['NT$1', '0']]);
      });
    });

    describe('amount-only mode', () => {
      beforeEach(async () => {
        guestPrefs({ includesNames: false, denominations: [1000, 500, 100, 50, 10, 5, 1] });
        await loadPrefs();
      });

      it('shows the 純金額 header, amount placeholder and reworded instructions', () => {
        const wrapper = mountPage();
        expect(wrapper.find('.text-lg').text()).toBe('現在支援純金額資料');
        expect(wrapper.find('.text-accent-dark').text()).toBe('純金額');
        expect(wrapper.find('textarea').attributes('placeholder')).toBe('18500\n"45,800"\nNT$32,000\n1999');
        const notice = wrapper.find('.instruction--notice').text();
        expect(notice).toContain('每一行只能有一筆金額。例如：18500。');
        expect(notice).not.toContain('姓名');
      });

      it('parses amounts only, counts a 金額 header out, and shows the 純金額 chip', async () => {
        const wrapper = mountPage();
        await wrapper.find('textarea').setValue('金額\n100\n100');
        expect(counterText(wrapper)).toBe('已貼 2 / 1,000 筆');
        await findButton(wrapper, '直接計算')!.trigger('click');
        await flushPromises();

        const chips = summaryCard(wrapper).findAll('.app-total-card__chips .app-chip').map((c) => c.text());
        expect(chips).toContain('純金額');
        expect(chips).not.toContain('姓名,金額');
        const rows = wrapper.findAll('.summary-card__row-head span:first-child').map((s) => s.text());
        expect(rows).toEqual(['第 1 筆', '第 2 筆']);
      });

      it('shows amount-only errors', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, '張三,100', '直接計算');
        expect(errorItems(wrapper)).toEqual(['第 1 行「張三,100」不是金額']);
      });
    });
  });

  describe('design-system feedback components', () => {
    it('errors render inside a warn Alert (role="alert") with the title', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      const alert = wrapper.find('.money-snap__error-box');
      expect(alert.classes()).toEqual(expect.arrayContaining(['app-alert', 'app-alert--warn']));
      expect(alert.attributes('role')).toBe('alert');
      expect(alert.find('.app-alert__title').text()).toBe(ERROR_TITLE);
    });

    it('a non-line message (header row only) is shown without the title', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '姓名,金額', '直接計算');
      expect(errorItems(wrapper)).toEqual(['請輸入正確的資料格式']);
      expect(wrapper.find('.money-snap__error-box .app-alert__title').exists()).toBe(false);
    });

    it('placeholder is an IllustrationSlot with the cat illustration', () => {
      const wrapper = mountPage();
      const slot = wrapper.find('.result-placeholder');
      expect(slot.classes()).toContain('app-illustration-slot');
      expect(slot.find('img').attributes('alt')).toBe(PLACEHOLDER_CAPTION);
    });
  });

    describe('card tones (theme colours come from the hero tone tokens)', () => {
    it('before calculation there is no dark card, only the illustration placeholder', () => {
      const wrapper = mountPage();
      expectNotCalculated(wrapper);
      expect(wrapper.findAll('[data-tone="hero"]')).toHaveLength(0);
    });

    it('input card uses the default surface tone', () => {
      const wrapper = mountPage();
      const card = wrapper.findAll('.cat-card-stub')[0]!;
      expect(card.attributes('data-tone')).toBe('surface');
    });

    it('summary card uses the hero tone after calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(summaryCard(wrapper).attributes('data-tone')).toBe('hero');
    });
  });

  describe('more than 1,000 entries (too-many card)', () => {
    // n0000,1 … ; amounts of 1 make totals equal to the entry count
    const overCard = (wrapper: VueWrapper) => wrapper.find('.over-card');
    const textareaValue = (wrapper: VueWrapper) => (wrapper.find('textarea').element as HTMLTextAreaElement).value;
    const notice = (wrapper: VueWrapper) => wrapper.find('.truncated-notice');
    const clickButton = async (wrapper: VueWrapper, label: string) => {
      const btn = findButton(wrapper, label);
      expect(btn).toBeDefined();
      await btn!.trigger('click');
      await flushPromises();
    };
    const restOf = (n: number) =>
      Array.from({ length: n - 1000 }, (_, i) => `name${i + 1000},1`).join('\n');

    afterEach(() => {
      delete (document as unknown as Record<string, unknown>).execCommand;
      vi.useRealTimers();
    });

    it('calculate with 1,248 entries shows the too-many card instead of the placeholder, without parsing', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1248), '直接計算');

      const card = overCard(wrapper);
      expect(card.exists()).toBe(true);
      expect(card.classes()).toContain('cat-card-stub');
      expect(wrapper.find('.result-placeholder').exists()).toBe(false);
      expect(wrapper.find('.summary-card').exists()).toBe(false);
      expect(wrapper.find('.money-snap__error-box').exists()).toBe(false);

      expect(card.find('.app-illustration-slot__label').text()).toBe('貓咪插畫：被一疊鈔票壓住');
      expect(card.find('.over-card__title').text()).toBe('太多了喵，算不動 (=ΦдΦ=)');
      expect(card.find('.over-card__desc').text()).toBe('你貼了 1,248 筆，每次最多只支援 1,000 筆，多出 248 筆。');
      expect(card.find('.over-card__desc b.text-ink').text()).toBe('1,248');
      expect(card.find('.over-card__desc b.text-warn-text').text()).toBe('248');
      expect(card.findAll('.over-card__split-item').map((i) => i.text())).toEqual(['這次先算1,000 筆', '下一批248 筆']);
      expect(card.find('.over-card__split-value.text-warn-text').text()).toBe('248 筆');

      const buttons = card.findAll('button');
      expect(buttons.map((b) => b.text())).toEqual(['只算前 1,000 筆', '複製第 1,001 筆之後的 248 筆']);
      expect(buttons[0]!.classes()).toEqual(expect.arrayContaining(['app-button--primary', 'app-button--full']));
      expect(buttons[1]!.classes()).toEqual(expect.arrayContaining(['app-button--secondary', 'app-button--full']));
    });

    it('the textarea stays editable, the counter stays warn and the calculate button stays', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1248), '直接計算');
      expect(wrapper.find('textarea').attributes('readonly')).toBeUndefined();
      expect(wrapper.find('.money-snap__counter').classes()).toContain('app-chip--warn');
      expect(findButton(wrapper, '直接計算')).toBeDefined();
      expect(findButton(wrapper, '清除資料')).toBeUndefined();
    });

    it('clears previous errors when the too-many card is shown', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      expect(errorItems(wrapper)).toHaveLength(1);
      await typeAndCalculate(wrapper, lines(1001), '直接計算');
      expect(wrapper.find('.money-snap__error-box').exists()).toBe(false);
      expect(overCard(wrapper).exists()).toBe(true);
    });

    it('a header row is not counted (1,001 entries + header → 多出 1 筆)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, `姓名,金額\n${lines(1001)}`, '直接計算');
      expect(overCard(wrapper).find('.over-card__desc').text()).toBe('你貼了 1,001 筆，每次最多只支援 1,000 筆，多出 1 筆。');
      expect(findButton(wrapper, '複製第 1,001 筆之後的 1 筆')).toBeDefined();
    });

    it('a fresh calculation after editing down to ≤ 1,000 entries leaves the too-many card', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1001), '直接計算');
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(overCard(wrapper).exists()).toBe(false);
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('100');
      expect(notice(wrapper).exists()).toBe(false);
    });

    describe('copy the rest', () => {
      it('copies lines 1,001+ and shows 「已複製 ✓」 for 1.6s', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, lines(1248), '直接計算');

        await clickButton(wrapper, '複製第 1,001 筆之後的 248 筆');

        expect(writeText).toHaveBeenCalledWith(restOf(1248));
        expect(gtagMock).toHaveBeenCalledWith('event', 'copy_rest', { result: 'success', entry_count: 248 });
        expect(findButton(wrapper, '已複製 ✓')).toBeDefined();
        expect(wrapper.find('.app-dialog').exists()).toBe(false);

        vi.advanceTimersByTime(1599);
        await nextTick();
        expect(findButton(wrapper, '已複製 ✓')).toBeDefined();
        vi.advanceTimersByTime(1);
        await nextTick();
        expect(findButton(wrapper, '已複製 ✓')).toBeUndefined();
        expect(findButton(wrapper, '複製第 1,001 筆之後的 248 筆')).toBeDefined();
      });

      it('copies the original lines (header excluded) in amount-only mode', async () => {
        localStorage.setItem('preferences', JSON.stringify({ includesNames: false, denominations: [1000, 500, 100, 50, 10, 5, 1] }));
        const { usePreferences } = await import('../../composables/usePreferences');
        await usePreferences().loadPreferences();
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        const amounts = Array.from({ length: 1002 }, (_, i) => String(i + 1));
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, `金額\n${amounts.join('\n')}`, '直接計算');

        expect(overCard(wrapper).find('.over-card__desc').text()).toBe('你貼了 1,002 筆，每次最多只支援 1,000 筆，多出 2 筆。');
        await clickButton(wrapper, '複製第 1,001 筆之後的 2 筆');
        expect(writeText).toHaveBeenCalledWith('1001\n1002');
      });

      it('opens a dialog with the text in a readonly textarea when copying fails', async () => {
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) } });
        Object.defineProperty(document, 'execCommand', { value: vi.fn(() => false), configurable: true });
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, lines(1248), '直接計算');

        await clickButton(wrapper, '複製第 1,001 筆之後的 248 筆');

        expect(gtagMock).toHaveBeenCalledWith('event', 'copy_rest', { result: 'failed', entry_count: 248 });
        const dialog = wrapper.find('.app-dialog');
        expect(dialog.exists()).toBe(true);
        expect(dialog.find('.app-dialog__title').text()).toBe('複製剩下的 248 筆');
        const box = dialog.find('textarea');
        expect(box.attributes('readonly')).toBeDefined();
        expect((box.element as HTMLTextAreaElement).value).toBe(restOf(1248));
        expect(findButton(wrapper, '已複製 ✓')).toBeUndefined();

        await dialog.findAll('button').find((b) => b.text() === '複製好了')!.trigger('click');
        expect(wrapper.find('.app-dialog').exists()).toBe(false);
      });
    });

    describe('只算前 1,000 筆', () => {
      it('calculates the first 1,000 entries and shows the notice with the next-batch button in the total card', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, lines(1248), '直接計算');
        await clickButton(wrapper, '只算前 1,000 筆');

        expect(overCard(wrapper).exists()).toBe(false);
        const card = summaryCard(wrapper);
        expect(card.find('.app-total-card__amount-value').text()).toBe('1,000');
        expect(card.text()).toContain('總筆數：1000 筆 · 1000 人');
        const row = card.find('.truncated-notice');
        expect(row.exists()).toBe(true);
        expect(row.find('.truncated-notice__text').text()).toBe('只算了前 1,000 筆，還有 248 筆等下一批喵。');
        const next = row.find('button');
        expect(next.text()).toBe('算下一批 248 筆 ›');
        expect(next.classes()).toEqual(expect.arrayContaining(['app-button--primary', 'app-button--sm']));
        // Calculated: textarea locked, input kept as pasted
        expect(wrapper.find('textarea').attributes('readonly')).toBeDefined();
        expect(textareaValue(wrapper)).toBe(lines(1248));
        expect(findButton(wrapper, '清除資料')).toBeDefined();
      });

      it('keeps the header row and calculates exactly 1,000 entries', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, `姓名,金額\n${lines(1003)}`, '直接計算');
        await clickButton(wrapper, '只算前 1,000 筆');

        expect(wrapper.find('.money-snap__error-box').exists()).toBe(false);
        expect(summaryCard(wrapper).text()).toContain('總筆數：1000 筆');
        expect(notice(wrapper).text()).toContain('還有 3 筆等下一批喵');
      });

      it('uses the amount-only mode for the calculation', async () => {
        localStorage.setItem('preferences', JSON.stringify({ includesNames: false, denominations: [1000, 500, 100, 50, 10, 5, 1] }));
        const { usePreferences } = await import('../../composables/usePreferences');
        await usePreferences().loadPreferences();
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, Array.from({ length: 1001 }, () => '2').join('\n'), '直接計算');
        await clickButton(wrapper, '只算前 1,000 筆');

        expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('2,000');
        const chips = summaryCard(wrapper).findAll('.app-total-card__chips .app-chip').map((c) => c.text());
        expect(chips).toContain('純金額');
        expect(notice(wrapper).text()).toContain('還有 1 筆等下一批喵');
      });

      it('line errors in the first batch block the calculation and set no pending batch', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, `bad\n${lines(1001)}`, '直接計算');
        await clickButton(wrapper, '只算前 1,000 筆');

        expect(errorItems(wrapper)).toEqual(['第 1 行「bad」少了逗號']);
        expect(overCard(wrapper).exists()).toBe(false);
        expectNotCalculated(wrapper);
      });
    });

    describe('算下一批', () => {
      it('≤ 1,000 pending entries: become the input, are calculated, and a toast is shown', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, lines(1248), '直接計算');
        await clickButton(wrapper, '只算前 1,000 筆');
        await clickButton(wrapper, '算下一批 248 筆 ›');

        expect(textareaValue(wrapper)).toBe(restOf(1248));
        expect(counterText(wrapper)).toBe('已貼 248 / 1,000 筆');
        expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('248');
        expect(summaryCard(wrapper).text()).toContain('總筆數：248 筆');
        expect(notice(wrapper).exists()).toBe(false);
        expect(showToastMock).toHaveBeenCalledWith('已帶入下一批 248 筆並算好了喵');
        expect(wrapper.find('textarea').attributes('readonly')).toBeDefined();
      });

      it('> 1,000 pending entries: become the input and show the too-many card again', async () => {
        const wrapper = mountPage();
        await typeAndCalculate(wrapper, lines(2300), '直接計算');
        await clickButton(wrapper, '只算前 1,000 筆');
        await clickButton(wrapper, '算下一批 1,300 筆 ›');

        expect(textareaValue(wrapper)).toBe(restOf(2300));
        expect(wrapper.find('.summary-card').exists()).toBe(false);
        expect(overCard(wrapper).find('.over-card__desc').text()).toBe('你貼了 1,300 筆，每次最多只支援 1,000 筆，多出 300 筆。');
        expect(wrapper.find('textarea').attributes('readonly')).toBeUndefined();
        expect(showToastMock).not.toHaveBeenCalled();

        // …and the next round calculates lines 1,001–2,000 of the original paste
        await clickButton(wrapper, '只算前 1,000 筆');
        expect(summaryCard(wrapper).text()).toContain('總筆數：1000 筆');
        expect(notice(wrapper).text()).toContain('還有 300 筆等下一批喵');
      });
    });

    it('清除資料 resets the truncated notice and pending batch', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1248), '直接計算');
      await clickButton(wrapper, '只算前 1,000 筆');
      await clickButton(wrapper, '清除資料');

      expectNotCalculated(wrapper);
      expect(overCard(wrapper).exists()).toBe(false);
      expect(textareaValue(wrapper)).toBe('');

      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(notice(wrapper).exists()).toBe(false);
    });

    it('members see 「只算前 1,000 筆並存檔」', async () => {
      userRef.value = { id: 'u1' };
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1001), '計算並存檔');
      const buttons = overCard(wrapper).findAll('button').map((b) => b.text());
      expect(buttons).toEqual(['只算前 1,000 筆並存檔', '複製第 1,001 筆之後的 1 筆']);

      await clickButton(wrapper, '只算前 1,000 筆並存檔');
      expect(notice(wrapper).text()).toContain('還有 1 筆等下一批喵');
    });
  });

  describe('saving records (members)', () => {
    // 張三 20,499 + 李四 3,888 with the default 7 denominations
    const INPUT = '張三,18500\n李四,3888\n張三,1999';

    const click = async (wrapper: VueWrapper, label: string) => {
      const btn = findButton(wrapper, label);
      expect(btn).toBeDefined();
      await btn!.trigger('click');
      await flushPromises();
    };
    const savedRecords = () => supabase.tables.records ?? [];

    beforeEach(() => {
      userRef.value = { id: 'u1' };
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-26T04:00:00Z')); // 12:00 in Taiwan
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('計算並存檔 saves one record with the calculation result', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, INPUT, '計算並存檔');

      expect(savedRecords()).toEqual([
        {
          id: expect.any(String),
          user_id: 'u1',
          name: '2026/11/26 兌換',
          input_format: 'name_amount',
          entry_count: 3,
          total_amount: 24387,
          denominations: [1000, 500, 100, 50, 10, 5, 1],
          denomination_counts: { 1000: 23, 500: 1, 100: 7, 50: 2, 10: 7, 5: 2, 1: 7 },
          rows: [
            { name: '張三', total: 20499 },
            { name: '李四', total: 3888 },
          ],
        },
      ]);
      expect(showToastMock).not.toHaveBeenCalledWith('紀錄沒有存成功喵');
    });

    it('saves amount-only calculations as input_format "amount"', async () => {
      localStorage.setItem('preferences:u1', JSON.stringify({ includesNames: false, denominations: [1000, 500, 100, 50, 10, 5, 1] }));
      const { usePreferences } = await import('../../composables/usePreferences');
      await usePreferences().loadPreferences();
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '金額\n1500\n3', '計算並存檔');

      expect(savedRecords()).toHaveLength(1);
      expect(savedRecords()[0]).toMatchObject({ input_format: 'amount', entry_count: 2, total_amount: 1503 });
    });

    it('over 1,000 entries: each batch is its own record, named 兌換, 兌換 #2, 兌換 #3', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(2300), '計算並存檔');
      expect(savedRecords()).toHaveLength(0); // the too-many card calculates nothing

      await click(wrapper, '只算前 1,000 筆並存檔');
      await click(wrapper, '算下一批 1,300 筆 ›'); // too many again → nothing saved
      await click(wrapper, '只算前 1,000 筆並存檔');
      await click(wrapper, '算下一批 300 筆 ›');

      expect(savedRecords().map(({ name, entry_count }) => ({ name, entry_count }))).toEqual([
        { name: '2026/11/26 兌換', entry_count: 1000 },
        { name: '2026/11/26 兌換 #2', entry_count: 1000 },
        { name: '2026/11/26 兌換 #3', entry_count: 300 },
      ]);
    });

    it('a new calculation after 清除資料 starts again from the first batch name', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1248), '計算並存檔');
      await click(wrapper, '只算前 1,000 筆並存檔');
      await click(wrapper, '算下一批 248 筆 ›');
      await click(wrapper, '清除資料，算下一筆');
      await typeAndCalculate(wrapper, INPUT, '計算並存檔');

      expect(savedRecords().map((record) => record.name)).toEqual([
        '2026/11/26 兌換',
        '2026/11/26 兌換 #2',
        '2026/11/26 兌換',
      ]);
    });

    it('a failed save shows a toast and keeps the result on screen', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      supabase.from.mockReturnValueOnce({
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('offline') }) }) }),
      } as unknown as ReturnType<FakeSupabase['from']>);
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, INPUT, '計算並存檔');

      expect(showToastMock).toHaveBeenCalledWith('紀錄沒有存成功喵');
      expect(summaryCard(wrapper).find('.app-total-card__amount-value').text()).toBe('24,387');
    });

    it('a failed calculation saves nothing', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '計算並存檔');
      expect(savedRecords()).toHaveLength(0);
    });

    it('guests never save records', async () => {
      userRef.value = null;
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, INPUT, '直接計算');
      await click(wrapper, '清除資料，算下一筆');
      await typeAndCalculate(wrapper, lines(1248), '直接計算');
      await click(wrapper, '只算前 1,000 筆');
      await click(wrapper, '算下一批 248 筆 ›');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

});
