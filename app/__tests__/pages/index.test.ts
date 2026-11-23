import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import AppButton from '../../components/app/Button/Button.vue';
import IndexPage from '../../pages/index.vue';

// Simple pass-through stub for app-cat-card exposing its colour props
const AppCatCardStub = defineComponent({
  name: 'AppCatCard',
  props: {
    bgColor: { type: String, default: 'surface' },
    textColor: { type: String, default: 'ink' },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: 'cat-card-stub',
          'data-bg': props.bgColor,
          'data-text': props.textColor,
        },
        slots.default?.(),
      );
  },
});

const PLACEHOLDER = '粘貼資料後，點擊「計算」以查看結果';

let userRef: Ref<unknown>;
let themeRef: Ref<'light' | 'dark'>;
let navigateToMock: ReturnType<typeof vi.fn>;

const mountPage = () =>
  mount(IndexPage, {
    global: {
      components: {
        AppButton,
        AppCatCard: AppCatCardStub,
      },
    },
  });

const findButton = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(label));

const summaryCard = (wrapper: VueWrapper) => wrapper.findAll('.cat-card-stub')[1]!;

const counterText = (wrapper: VueWrapper) =>
  wrapper.find('.money-snap__notices span.text-muted').text();

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
  userRef = ref(null);
  themeRef = ref('light');
  navigateToMock = vi.fn(() => Promise.resolve());
  vi.stubGlobal('useAuth', () => ({ user: userRef }));
  vi.stubGlobal('useTheme', () => ({ theme: themeRef }));
  vi.stubGlobal('navigateTo', navigateToMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pages/index.vue', () => {
  describe('initial / empty state', () => {
    it('renders placeholder, zero counter, no errors and disabled calculate button', () => {
      const wrapper = mountPage();

      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
      expect(counterText(wrapper)).toBe('已貼 0 / 1,000 筆');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);

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
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
    });
  });

  describe('counter / canCalculate boundaries', () => {
    it('1000 lines → enabled with counter 1000', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue(lines(1000));

      expect(counterText(wrapper)).toBe('已貼 1000 / 1,000 筆');
      expect(findButton(wrapper, '直接計算')!.attributes('disabled')).toBeUndefined();
    });

    it('1001 lines → counter may exceed 1,000, button stays enabled, parser rejects with limit error', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue(lines(1001));

      expect(counterText(wrapper)).toBe('已貼 1001 / 1,000 筆');
      const btn = findButton(wrapper, '直接計算')!;
      expect(btn.attributes('disabled')).toBeUndefined();

      await btn.trigger('click');
      await flushPromises();
      expect(errorItems(wrapper)).toEqual(['超過最大筆數限制 (1000)']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
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
      expect(card.text()).not.toContain(PLACEHOLDER);
      expect(card.find('.text-4xl').text()).toBe('52,499');

      const meta = card.findAll('.summary-card__meta span').map((s) => s.text());
      expect(meta[0]).toBe('總筆數：3 筆 · 2 人');
      expect(meta[1]).toBe('姓名,金額');
      expect(meta[2]).toMatch(/^計算時間 \S+/);

      const rows = card.findAll('.summary-card__row');
      expect(rows).toHaveLength(2);

      const heads = rows.map((r) =>
        r.findAll('.summary-card__row-head span').map((s) => s.text()),
      );
      expect(heads[0]).toEqual(['張三', '20,499 元']);
      expect(heads[1]).toEqual(['李四', '32,000 元']);

      const chips0 = rows[0]!.findAll('.summary-card__row-body span').map((s) => s.text());
      // Spec: denominations are displayed from smallest to largest
      expect(chips0).toEqual(['1×4', '5×1', '10×4', '50×1', '100×4', '500×0', '1000×20']);

      const chips1 = rows[1]!.findAll('.summary-card__row-body span').map((s) => s.text());
      // Spec: chips render for denominations with count 0 too
      expect(chips1).toEqual(['1×0', '5×0', '10×0', '50×0', '100×0', '500×0', '1000×32']);
    });

    it('accepts quoted thousand separators, currency prefix and tab delimiters', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '李四,"45,800"\n王五,NT$32,000\n趙六\t100', '直接計算');

      const card = summaryCard(wrapper);
      expect(card.find('.text-4xl').text()).toBe('77,900');
      expect(card.find('.summary-card__meta span').text()).toBe('總筆數：3 筆 · 3 人');
    });

    it('all-invalid input shows line errors and stays not calculated', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'foo\nbar,abc', '直接計算');

      expect(errorItems(wrapper)).toEqual(['第 1 行: 格式錯誤（foo）', '第 2 行: 格式錯誤（bar,abc）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
      expect(findButton(wrapper, '直接計算')).toBeDefined();
    });

    it('error line numbers count blank lines', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'a,1\n\nbad', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 3 行: 格式錯誤（bad）']);
    });

    it('partial invalid input blocks the whole calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100\nbad line\n李四,200', '直接計算');

      expect(errorItems(wrapper)).toEqual(['第 2 行: 格式錯誤（bad line）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
      expect(wrapper.find('.summary-card__row').exists()).toBe(false);
    });

    it('decimal / zero / negative amounts are rejected as format errors', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'a,1.5\nb,0\nc,-5', '直接計算');
      expect(errorItems(wrapper)).toEqual([
        '第 1 行: 格式錯誤（a,1.5）',
        '第 2 行: 格式錯誤（b,0）',
        '第 3 行: 格式錯誤（c,-5）',
      ]);
    });

    it('an over-cap line among valid lines shows the per-entry cap error and blocks calculation', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,999999\n李四,1000000', '直接計算');

      expect(errorItems(wrapper)).toEqual(['第 2 行: 金額超過上限 (999,999)（李四,1000000）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
    });

    it('single amount above 999,999 → per-entry cap error (success=false path)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1000000', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 1 行: 金額超過上限 (999,999)（張三,1000000）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
    });

    it('amount exactly 999,999 is accepted', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,"999,999"', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('999,999');
    });

    it('a header row on the first line is skipped and calculation succeeds', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '姓名,金額\n張三,100\n李四,200', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('300');
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
      const heads = summaryCard(wrapper)
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
      expect(errorItems(wrapper)).toEqual(['第 2 行: 格式錯誤（李四,(200)）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
    });

    it('name longer than 20 characters shows the name-length error', async () => {
      const wrapper = mountPage();
      const line = `${'王'.repeat(21)},100`;
      await typeAndCalculate(wrapper, line, '直接計算');
      expect(errorItems(wrapper)).toEqual([`第 1 行: 姓名超過 20 字（${'王'.repeat(20)}…）`]);
    });

    it('full-width IME input and Taiwan currency words calculate correctly', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三，１，０００元\n李四,新台幣 500 元整\n王五,NT $２００', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('1,700');
    });

    it('names with hidden zero-width characters are merged into one row', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張\u200B三,100\n張三,200', '直接計算');
      const heads = summaryCard(wrapper)
        .findAll('.summary-card__row-head')
        .map((r) => r.findAll('span').map((x) => x.text()));
      expect(heads).toEqual([['張三', '300 元']]);
      expect(summaryCard(wrapper).text()).toContain('總筆數：2 筆 · 1 人');
    });

    it('lone CR input (Excel export) calculates all rows', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100\r李四,200', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('300');
    });

    it('badly grouped thousand separators block calculation with the line content', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,1,000\n李四,100,20', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 2 行: 格式錯誤（李四,100,20）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
    });

    it('re-calculating after a failure clears previous errors on success', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      expect(errorItems(wrapper)).toEqual(['第 1 行: 格式錯誤（bad）']);

      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('100');
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
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
      expect(findButton(wrapper, '直接計算')).toBeDefined();
      expect(findButton(wrapper, '登入存檔')).toBeDefined();

      await typeAndCalculate(wrapper, '李四,200', '直接計算');
      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('200');
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
      expect(errorItems(wrapper)).toEqual(['第 3 行: 張三 合計金額超過上限 (999,999)（張三,1）']);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
    });

    it('per-person aggregated total exactly 999,999 is accepted', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,500000\n張三,499999', '直接計算');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      const head = summaryCard(wrapper).findAll('.summary-card__row-head span').map((s) => s.text());
      expect(head).toEqual(['張三', '999,999 元']);
    });

    it('English names are case-sensitive (Amy and amy are separate rows)', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'Amy,100\namy,200', '直接計算');
      const rows = summaryCard(wrapper).findAll('.summary-card__row-head');
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
    it('shows calculate + 登入存檔 buttons (no separate login prompt) and no current-settings button', () => {
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

      expect(summaryCard(wrapper).find('.text-4xl').text()).toBe('300');
      expect(findButton(wrapper, '計算並存檔')).toBeUndefined();
      const clear = findButton(wrapper, '清除資料，算下一筆');
      expect(clear).toBeDefined();

      await clear!.trigger('click');
      await nextTick();

      expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('');
      expect(wrapper.find('.money-snap__errors').exists()).toBe(false);
      expect(summaryCard(wrapper).text()).toContain(PLACEHOLDER);
      expect(counterText(wrapper)).toBe('已貼 0 / 1,000 筆');
      expect(findButton(wrapper, '計算並存檔')).toBeDefined();
      expect(findButton(wrapper, '計算並存檔')!.attributes('disabled')).toBeDefined();
    });

    it('failed calculation keeps the save button (no clear button) and shows errors', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '計算並存檔');
      expect(errorItems(wrapper)).toEqual(['第 1 行: 格式錯誤（bad）']);
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

  describe('theme', () => {
    it('light theme → summary card bg ink / text bg', () => {
      themeRef.value = 'light';
      const wrapper = mountPage();
      const card = summaryCard(wrapper);
      expect(card.attributes('data-bg')).toBe('ink');
      expect(card.attributes('data-text')).toBe('bg');
    });

    it('dark theme → summary card bg surface / text ink', () => {
      themeRef.value = 'dark';
      const wrapper = mountPage();
      const card = summaryCard(wrapper);
      expect(card.attributes('data-bg')).toBe('surface');
      expect(card.attributes('data-text')).toBe('ink');
    });

    it('input card uses default colours (no props passed)', () => {
      const wrapper = mountPage();
      const card = wrapper.findAll('.cat-card-stub')[0]!;
      expect(card.attributes('data-bg')).toBe('surface');
      expect(card.attributes('data-text')).toBe('ink');
    });

    it('summary card colours react to theme changes', async () => {
      const wrapper = mountPage();
      themeRef.value = 'dark';
      await nextTick();
      expect(summaryCard(wrapper).attributes('data-bg')).toBe('surface');
      expect(summaryCard(wrapper).attributes('data-text')).toBe('ink');
    });
  });
});
