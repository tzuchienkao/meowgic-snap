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
import IndexPage from '../../pages/index.vue';

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
const LIMIT_ERROR = '太多了喵，算不動 (=ΦдΦ=)（最多 1,000 筆）';

let userRef: Ref<unknown>;
let themeRef: Ref<'light' | 'dark'>;
let navigateToMock: ReturnType<typeof vi.fn>;

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

      expectNotCalculated(wrapper);
      expect(wrapper.find('.result-placeholder').text()).toContain(PLACEHOLDER_CAPTION);
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

    it('1001 lines → counter may exceed 1,000, button stays enabled, parser rejects with limit error', async () => {
      const wrapper = mountPage();
      await wrapper.find('textarea').setValue(lines(1001));

      expect(counterText(wrapper)).toBe('已貼 1001 / 1,000 筆');
      const btn = findButton(wrapper, '直接計算')!;
      expect(btn.attributes('disabled')).toBeUndefined();

      await btn.trigger('click');
      await flushPromises();
      expect(errorItems(wrapper)).toEqual([LIMIT_ERROR]);
      // The entry-limit message is not a line error, so no "看不懂" title
      expect(errorTitle(wrapper).exists()).toBe(false);
      expectNotCalculated(wrapper);
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

    it('line errors before the entry limit are capped at 5 and the limit message is shown as-is', async () => {
      const wrapper = mountPage();
      const input = [...Array.from({ length: 7 }, (_, i) => `bad${i}`), lines(1001)].join('\n');
      await typeAndCalculate(wrapper, input, '直接計算');

      expect(errorTitle(wrapper).text()).toBe(ERROR_TITLE);
      const items = errorItems(wrapper);
      expect(items.slice(0, 5)).toEqual(Array.from({ length: 5 }, (_, i) => `第 ${i + 1} 行「bad${i}」少了逗號`));
      expect(items).toContain(LIMIT_ERROR);
      expect(items).toContain('還有 2 行也看不懂');
      expect(items).toHaveLength(7);
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

    it('hides the export ActionTiles until those features exist', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, '張三,100', '直接計算');
      expect(wrapper.find('.app-action-tile').exists()).toBe(false);
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

  describe('design-system feedback components', () => {
    it('errors render inside a warn Alert (role="alert") with the title', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, 'bad', '直接計算');
      const alert = wrapper.find('.money-snap__error-box');
      expect(alert.classes()).toEqual(expect.arrayContaining(['app-alert', 'app-alert--warn']));
      expect(alert.attributes('role')).toBe('alert');
      expect(alert.find('.app-alert__title').text()).toBe(ERROR_TITLE);
    });

    it('the entry-limit message has no title', async () => {
      const wrapper = mountPage();
      await typeAndCalculate(wrapper, lines(1001), '直接計算');
      expect(wrapper.find('.money-snap__error-box').exists()).toBe(true);
      expect(wrapper.find('.money-snap__error-box .app-alert__title').exists()).toBe(false);
    });

    it('placeholder is an IllustrationSlot with the cat caption', () => {
      const wrapper = mountPage();
      const slot = wrapper.find('.result-placeholder');
      expect(slot.classes()).toContain('app-illustration-slot');
      expect(slot.find('.app-illustration-slot__label').text()).toBe(PLACEHOLDER_CAPTION);
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

});
