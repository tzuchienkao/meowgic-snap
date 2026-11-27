<template>
  <div :ref="onRootRef" class="app-date-picker">
    <span v-if="label" :id="labelId" class="app-date-picker__label">{{ label }}</span>
    <div class="app-date-picker__anchor">
      <button
        :ref="onTriggerRef"
        type="button"
        class="app-date-picker__trigger"
        :class="[`app-date-picker__trigger--${size}`, { 'is-open': isOpen, 'is-invalid': invalid }]"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        :aria-invalid="invalid || undefined"
        :aria-labelledby="label ? `${labelId} ${valueId}` : undefined"
        :aria-label="!label && ariaLabel ? `${ariaLabel}：${shownValue || placeholder}` : undefined"
        :aria-describedby="hintText ? hintId : undefined"
        @click="onTriggerClick"
      >
        <span :id="valueId" class="app-date-picker__value" :class="{ 'is-placeholder': !shownValue }">
          {{ shownValue || placeholder }}
        </span>
        <span class="app-date-picker__glyph" aria-hidden="true">▦</span>
      </button>

      <div v-if="isOpen" role="dialog" aria-label="選擇查詢區間" class="app-date-picker__panel" @keydown="onPanelKeydown">
        <!-- Header: ‹ title › — the title steps up to months, then years -->
        <div class="app-date-picker__header">
          <app-icon-button
            v-if="view !== CalendarView.Years"
            :label="view === CalendarView.Days ? '上個月' : '上一年'"
            glyph="‹"
            tone="soft"
            size="sm"
            :disabled="!canGoPrev"
            @click="onPrevClick"
          />
          <button
            v-if="view !== CalendarView.Years"
            type="button"
            class="app-date-picker__title"
            :aria-label="view === CalendarView.Days ? `${title}，選擇月份` : `${title}，選擇年份`"
            aria-live="polite"
            @click="onTitleClick"
          >
            {{ title }} <span class="app-date-picker__title-caret" aria-hidden="true">▾</span>
          </button>
          <span v-else class="app-date-picker__title is-static" aria-live="polite">選擇年份</span>
          <app-icon-button
            v-if="view !== CalendarView.Years"
            :label="view === CalendarView.Days ? '下個月' : '下一年'"
            glyph="›"
            tone="soft"
            size="sm"
            :disabled="!canGoNext"
            @click="onNextClick"
          />
        </div>

        <!-- Days -->
        <div v-if="view === CalendarView.Days">
          <div class="app-date-picker__weekdays" aria-hidden="true">
            <span v-for="weekday in WEEKDAYS" :key="weekday">{{ weekday }}</span>
          </div>
          <div role="grid" class="app-date-picker__grid" @mouseleave="hoverDay = null">
            <div
              v-for="(cell, index) in dayCells"
              :key="cell.key ?? `blank-${index}`"
              class="app-date-picker__cell"
              :class="cell.bandClass"
              :aria-hidden="cell.date ? undefined : 'true'"
            >
              <button
                v-if="cell.date"
                :ref="(el) => onDayRef(cell.key!, el)"
                type="button"
                class="app-date-picker__day"
                :class="{ 'is-edge': cell.isEdge, 'is-today': cell.isToday }"
                :data-day="cell.key"
                :disabled="cell.isDisabled"
                :tabindex="cell.key === rovingKey ? 0 : -1"
                :aria-label="cell.ariaLabel"
                :aria-pressed="cell.isEdge || undefined"
                :aria-current="cell.isToday ? 'date' : undefined"
                @click="onDayClick(cell.date)"
                @mouseenter="hoverDay = cell.date"
                @focus="focusKey = cell.key"
              >
                {{ cell.date.getDate() }}
              </button>
            </div>
          </div>
        </div>

        <!-- Months of the shown year -->
        <div v-else-if="view === CalendarView.Months" class="app-date-picker__choices">
          <button
            v-for="month in monthChoices"
            :key="month.index"
            type="button"
            class="app-date-picker__choice"
            :class="{ 'is-current': month.isCurrent }"
            :disabled="month.isDisabled"
            :aria-pressed="month.isCurrent"
            @click="onMonthClick(month.index)"
          >
            {{ month.index + 1 }} 月
          </button>
        </div>

        <!-- Years that have pickable days -->
        <div v-else class="app-date-picker__choices">
          <button
            v-for="year in yearChoices"
            :key="year"
            type="button"
            class="app-date-picker__choice"
            :class="{ 'is-current': year === viewMonth.getFullYear() }"
            :aria-pressed="year === viewMonth.getFullYear()"
            @click="onYearClick(year)"
          >
            {{ year }} 年
          </button>
        </div>

        <!-- While only a start is picked: how far the end can go (the line keeps its height) -->
        <p v-if="view === CalendarView.Days" class="app-date-picker__span-hint" aria-live="polite">{{ isPicking ? spanHint : '' }}</p>

        <div class="app-date-picker__footer">
          <app-button variant="outline" size="sm" label="今天" @click="onTodayClick" />
          <div class="app-date-picker__actions">
            <app-button variant="secondary" size="md" label="清除" :disabled="!draft.start" @click="onClearClick" />
            <app-button variant="primary" size="md" label="套用" :disabled="!(draft.start && draft.end)" @click="onApplyClick" />
          </div>
        </div>
      </div>
    </div>
    <span
      v-if="hintText"
      :id="hintId"
      class="app-date-picker__hint"
      :class="{ 'is-invalid': invalid }"
      :role="invalid ? 'alert' : undefined"
    >
      {{ hintText }}
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: DatePicker — desktop date-range picker (紀錄 →「查詢區間」→ 自訂; mobile keeps the native
 * date input). Input-style 48px pill opening a 320px month calendar: first click = start, second = end
 * (earlier than the start → new start), 套用 commits. The calendar is as wide as the field (at least 320px). Days before `min`, after `max` and, while picking,
 * past start + maxSpanMonths are disabled. The month title opens a month grid, whose year title opens a
 * year grid; 今天 jumps back to this month. Keyboard: arrows by day / week, PageUp / PageDown by month,
 * Enter / Space picks, Esc closes.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';
import { CalendarView, type IDateRange } from './IDatePicker';
import {
  addDays,
  addMonths,
  formatDay,
  fromDayKey,
  monthDays,
  startOfDay,
  startOfMonth,
  toDayKey,
} from '~/utils/calendar';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
const DAY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const MONTH_COUNT = 12;
/** Years shown when there is no `min` */
const DEFAULT_YEARS_BACK = 10;

const {
  modelValue = null,
  label = '',
  ariaLabel = '',
  size = 'md',
  placeholder = '選擇日期',
  hint = '',
  invalid = false,
  min = '',
  max = '',
  maxSpanMonths = 6,
  spanHint = '一次最多查半年喵',
} = defineProps<{
  /** Committed range */
  modelValue?: IDateRange | null;
  label?: string;
  /** Accessible name when there is no visible label, e.g. 自訂查詢區間 */
  ariaLabel?: string;
  /** md: Input height (48px) · sm: FilterChip height (36px), to sit in a row of chips */
  size?: 'md' | 'sm';
  placeholder?: string;
  /** Message under the field (Input hint style) */
  hint?: string;
  invalid?: boolean;
  /** Earliest pickable day, "YYYY-MM-DD" (none by default) */
  min?: string;
  /** Latest pickable day, "YYYY-MM-DD" (today by default) */
  max?: string;
  /** Longest range: the end is at most this many months after the start */
  maxSpanMonths?: number;
  /** Shown in the calendar while only a start is picked */
  spanHint?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [range: IDateRange] }>();

const labelId = useId();
const valueId = useId();
const hintId = useId();

const today = startOfDay(new Date());
const minDate = computed(() => fromDayKey(min));
const maxDate = computed(() => fromDayKey(max) ?? today);

const isOpen = ref(false);
const view = ref<CalendarView>(CalendarView.Days);
/** First day of the month the calendar shows */
const viewMonth = ref(startOfMonth(today));
/** In-progress range; committed on 套用 */
const draft = ref<{ start: Date | null; end: Date | null }>({ start: null, end: null });
const hoverDay = ref<Date | null>(null);
/** The day button that keeps keyboard focus (roving tabindex) */
const focusKey = ref<string | null>(null);

const committed = computed(() => ({ start: fromDayKey(modelValue?.start), end: fromDayKey(modelValue?.end) }));
const shownValue = computed(() => {
  const { start, end } = committed.value;
  return start ? `${formatDay(start)} – ${end ? formatDay(end) : ''}` : '';
});
const hintText = computed(() => hint);
const isPicking = computed(() => !!draft.value.start && !draft.value.end);

/** While only a start is picked: the latest day the end can be */
const spanLimit = computed(() =>
  draft.value.start && !draft.value.end ? addMonths(draft.value.start, maxSpanMonths) : null,
);
const isDisabledDay = (date: Date) =>
  (!!minDate.value && date < minDate.value) || date > maxDate.value || (!!spanLimit.value && date > spanLimit.value);

const clampDay = (date: Date) => {
  if (minDate.value && date < minDate.value) return minDate.value;
  return date > maxDate.value ? maxDate.value : date;
};

// Header
const title = computed(() =>
  view.value === CalendarView.Days
    ? `${viewMonth.value.getFullYear()} 年 ${viewMonth.value.getMonth() + 1} 月`
    : `${viewMonth.value.getFullYear()} 年`,
);
const firstMonth = computed(() => startOfMonth(minDate.value ?? addMonths(maxDate.value, -DEFAULT_YEARS_BACK * MONTH_COUNT)));
const lastMonth = computed(() => startOfMonth(maxDate.value));
const canGoPrev = computed(() =>
  view.value === CalendarView.Days
    ? viewMonth.value > firstMonth.value
    : viewMonth.value.getFullYear() > firstMonth.value.getFullYear(),
);
const canGoNext = computed(() =>
  view.value === CalendarView.Days
    ? viewMonth.value < lastMonth.value
    : viewMonth.value.getFullYear() < lastMonth.value.getFullYear(),
);

/** Shows this month (within the pickable months) */
const showMonth = (date: Date) => {
  const month = startOfMonth(date);
  viewMonth.value = month < firstMonth.value ? firstMonth.value : month > lastMonth.value ? lastMonth.value : month;
};

// Days
const previewEnd = computed(() => {
  const { start, end } = draft.value;
  const hover = hoverDay.value;
  return start && !end && hover && hover > start && !isDisabledDay(hover) ? hover : null;
});
const dayCells = computed(() => {
  const { start } = draft.value;
  const end = draft.value.end ?? previewEnd.value;
  const startKey = start ? toDayKey(start) : null;
  const endKey = end ? toDayKey(end) : null;
  const todayKey = toDayKey(today);
  const cells = monthDays(viewMonth.value);
  const lastDate = cells.filter(Boolean).length;
  return cells.map((date, index) => {
    if (!date) return { date: null, key: null };
    const key = toDayKey(date);
    const column = index % 7;
    const isStart = key === startKey;
    const isEnd = key === endKey;
    const isDisabled = isDisabledDay(date);
    const isToday = key === todayKey;
    const inBand = !!start && !!end && date > start && date < end;
    const hasBand = !!end && startKey !== endKey && (inBand || isStart || isEnd);
    return {
      date,
      key,
      isEdge: isStart || isEnd,
      isToday,
      isDisabled,
      ariaLabel: `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日${isToday ? '（今天）' : ''}${isDisabled ? '（不可選）' : ''}`,
      bandClass: hasBand
        ? {
            'is-band': inBand,
            'is-band-start': isStart,
            'is-band-end': isEnd,
            // The band rounds off where a week row or the month breaks it
            'is-round-start': inBand && (column === 0 || date.getDate() === 1),
            'is-round-end': inBand && (column === 6 || date.getDate() === lastDate),
          }
        : null,
    };
  });
});
/** Tab stop in the grid: the focused day, else the start, today, or the first pickable day shown */
const rovingKey = computed(() => {
  const keys = dayCells.value.filter((cell) => cell.date && !cell.isDisabled).map((cell) => cell.key);
  const startKey = draft.value.start ? toDayKey(draft.value.start) : null;
  return [focusKey.value, startKey, toDayKey(today)].find((key) => key && keys.includes(key)) ?? keys[0] ?? null;
});

// Months / years
const monthChoices = computed(() => {
  const year = viewMonth.value.getFullYear();
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const month = new Date(year, index, 1);
    return {
      index,
      isDisabled: month < firstMonth.value || month > lastMonth.value,
      isCurrent: index === viewMonth.value.getMonth(),
    };
  });
});
const yearChoices = computed(() => {
  const first = firstMonth.value.getFullYear();
  return Array.from({ length: lastMonth.value.getFullYear() - first + 1 }, (_, index) => first + index);
});

// Open / close
let rootElement: HTMLElement | null = null;
let triggerElement: HTMLElement | null = null;
const dayElements = new Map<string, HTMLElement>();
const onRootRef = (el: unknown) => {
  rootElement = el as HTMLElement | null;
};
const onTriggerRef = (el: unknown) => {
  triggerElement = el as HTMLElement | null;
};
const onDayRef = (key: string, el: unknown) => {
  if (el) dayElements.set(key, el as HTMLElement);
  else dayElements.delete(key);
};

const onDocumentPointerDown = (event: Event) => {
  if (rootElement && !rootElement.contains(event.target as Node)) close(false);
};

const open = () => {
  draft.value = { ...committed.value };
  view.value = CalendarView.Days;
  focusKey.value = null;
  showMonth(committed.value.start ?? today);
  isOpen.value = true;
  document.addEventListener('mousedown', onDocumentPointerDown);
};

const close = (refocus: boolean) => {
  isOpen.value = false;
  hoverDay.value = null;
  document.removeEventListener('mousedown', onDocumentPointerDown);
  if (refocus) triggerElement?.focus();
};

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointerDown);
});

const onTriggerClick = () => {
  if (isOpen.value) close(false);
  else open();
};

// Header actions
const onPrevClick = () => {
  showMonth(view.value === CalendarView.Days ? addMonths(viewMonth.value, -1) : addMonths(viewMonth.value, -MONTH_COUNT));
};
const onNextClick = () => {
  showMonth(view.value === CalendarView.Days ? addMonths(viewMonth.value, 1) : addMonths(viewMonth.value, MONTH_COUNT));
};
const onTitleClick = () => {
  view.value = view.value === CalendarView.Days ? CalendarView.Months : CalendarView.Years;
};
const onMonthClick = (index: number) => {
  showMonth(new Date(viewMonth.value.getFullYear(), index, 1));
  view.value = CalendarView.Days;
};
const onYearClick = (year: number) => {
  showMonth(new Date(year, viewMonth.value.getMonth(), 1));
  view.value = CalendarView.Months;
};

// Picking
const onDayClick = (date: Date) => {
  if (isDisabledDay(date)) return;
  const { start, end } = draft.value;
  draft.value = !start || end || date < start ? { start: date, end: null } : { start, end: date };
};

const onTodayClick = () => {
  view.value = CalendarView.Days;
  showMonth(today);
  focusKey.value = toDayKey(clampDay(today));
};

const onClearClick = () => {
  draft.value = { start: null, end: null };
  hoverDay.value = null;
};

const onApplyClick = () => {
  const { start, end } = draft.value;
  if (!start || !end) return;
  emit('update:modelValue', { start: toDayKey(start), end: toDayKey(end) });
  close(true);
};

// Keyboard
const focusDay = async (date: Date) => {
  const day = clampDay(date);
  focusKey.value = toDayKey(day);
  showMonth(day);
  await nextTick();
  dayElements.get(focusKey.value)?.focus();
};

const onPanelKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    close(true);
    return;
  }
  const target = event.target as HTMLElement;
  const current = fromDayKey(target.dataset?.day);
  if (view.value !== CalendarView.Days || !current) return;
  let next: Date | null = null;
  if (event.key in DAY_STEPS) next = addDays(current, DAY_STEPS[event.key]!);
  else if (event.key === 'PageUp') next = addMonths(current, -1);
  else if (event.key === 'PageDown') next = addMonths(current, 1);
  if (!next) return;
  event.preventDefault();
  focusDay(next);
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-date-picker { @apply flex min-w-0 flex-col gap-1; }
  .app-date-picker__label { @apply px-2 text-helper font-medium text-ink-2; }
  .app-date-picker__anchor { @apply relative; }

  /* Same pill as Input: 2px border + 12px padding + 20px line = 48px */
  .app-date-picker__trigger {
    @apply flex w-full items-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-left cursor-pointer outline-none;
    transition: border-color 0.2s;
  }
  .app-date-picker__trigger--md { @apply py-3; }
  /* sm: 2px border + 8px padding + 16px line = 36px, as tall as a FilterChip */
  .app-date-picker__trigger--sm { @apply py-2; }
  .app-date-picker__trigger:focus-visible,
  .app-date-picker__trigger.is-open { @apply border-accent; }
  .app-date-picker__trigger.is-invalid { @apply border-warn-text; }
  .app-date-picker__value { @apply min-w-0 flex-1 truncate text-btn leading-5 text-ink; }
  .app-date-picker__trigger--sm .app-date-picker__value { @apply text-sm leading-4; }
  .app-date-picker__trigger--sm .app-date-picker__glyph { @apply text-base leading-4; }
  .app-date-picker__value.is-placeholder { @apply text-placeholder; }
  .app-date-picker__glyph { @apply text-lg leading-5 text-accent-text; }

  .app-date-picker__hint { @apply px-2 text-xs text-muted; }
  .app-date-picker__hint.is-invalid { @apply text-warn-text; }

  /* DS: 320px Card surface, radius 28, padding 20, menu shadow */
  .app-date-picker__panel {
    @apply absolute top-full left-0 z-20 mt-2 flex w-full min-w-80 flex-col gap-3 rounded-card bg-surface p-5 shadow-menu;
  }

  .app-date-picker__header { @apply flex items-center justify-between gap-2; }
  .app-date-picker__title {
    @apply flex items-center gap-1 rounded-full px-3 py-2 text-btn leading-6 text-ink cursor-pointer;
    transition: background-color 0.2s;
  }
  .app-date-picker__title:not(.is-static):hover { @apply bg-hover; }
  .app-date-picker__title.is-static { @apply mx-auto cursor-default; }
  .app-date-picker__title-caret { @apply text-xs text-muted; }

  .app-date-picker__weekdays { @apply grid grid-cols-7 pb-1; }
  .app-date-picker__weekdays > span { @apply py-1 text-center text-xs text-muted; }
  .app-date-picker__grid { @apply grid grid-cols-7 gap-y-1; }

  /* The range band sits on the cells; it joins into the start / end fills */
  .app-date-picker__cell.is-band { @apply bg-dp-range; }
  .app-date-picker__cell.is-band-start { background: linear-gradient(to right, transparent 50%, var(--color-dp-range) 50%); }
  .app-date-picker__cell.is-band-end { background: linear-gradient(to left, transparent 50%, var(--color-dp-range) 50%); }
  .app-date-picker__cell.is-round-start { @apply rounded-l-full; }
  .app-date-picker__cell.is-round-end { @apply rounded-r-full; }

  /* Day: 8px padding + 24px line = 40px (DS 10 + 20, 4px grid) */
  .app-date-picker__day {
    @apply relative block w-full rounded-full py-2 text-sm leading-6 text-ink cursor-pointer;
    transition: background-color 0.2s;
  }
  .app-date-picker__day:not(:disabled):not(.is-edge):hover { @apply bg-dp-hover; }
  .app-date-picker__day.is-edge { @apply bg-nav-active text-nav-active-text; }
  .app-date-picker__day:disabled { @apply text-faint line-through cursor-not-allowed; }
  /* Today: a small accent dot */
  .app-date-picker__day.is-today::after {
    @apply absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent-text content-[''];
  }
  .app-date-picker__day.is-today.is-edge::after { @apply bg-nav-active-text; }

  /* Month / year grids: 3 columns of pills */
  .app-date-picker__choices { @apply grid grid-cols-3 gap-2; }
  .app-date-picker__choice {
    @apply rounded-full py-3 text-sm leading-5 text-ink cursor-pointer;
    transition: background-color 0.2s;
  }
  .app-date-picker__choice:not(:disabled):not(.is-current):hover { @apply bg-dp-hover; }
  .app-date-picker__choice.is-current { @apply bg-nav-active text-nav-active-text; }
  .app-date-picker__choice:disabled { @apply text-faint cursor-not-allowed; }

  .app-date-picker__span-hint { @apply min-h-4 text-center text-xs leading-4 text-muted; }

  .app-date-picker__footer { @apply flex items-center justify-between gap-2 pt-1; }
  .app-date-picker__actions { @apply flex gap-2; }
}
</style>
