<template>
  <div class="app-preferences-form" :class="{ 'app-preferences-form--stacked': stacked }">
    <!-- Data format + CSV sample -->
    <div class="app-preferences-form__format">
      <app-checkbox
        label-font="sans"
        label="資料包含姓名和金額"
        note="（取消勾選只支援純金額）"
        :note-below="stacked"
        :model-value="preferences.includesNames"
        @update:model-value="setIncludesNames"
      />
      <app-button
        class="app-preferences-form__sample"
        variant="surface"
        size="sm"
        icon="↓"
        label="CSV 範例"
        @click="onSampleClick"
      />
    </div>

    <!-- Denominations -->
    <h3 class="app-preferences-form__title">面額設定</h3>
    <div class="app-preferences-form__groups">
      <section
        v-for="group in groups"
        :key="group.title"
        class="app-preferences-form__group"
        :aria-label="group.title"
      >
        <div class="app-preferences-form__group-head">
          <span class="app-preferences-form__group-title">{{ group.title }}</span>
          <app-checkbox
            size="sm"
            label-font="sans"
            label="全選"
            :model-value="group.isAllOn"
            @update:model-value="(enabled: boolean) => setDenominationGroup(group.values, enabled)"
          />
        </div>
        <app-checkbox
          v-for="value in group.values"
          :key="value"
          :label="formatDenominationLabel(value)"
          :note="value === RECOMMENDED_DENOMINATION ? '（建議保留）' : ''"
          :model-value="isDenominationEnabled(value)"
          @update:model-value="toggleDenomination(value)"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 偏好設定 form shared by the guest drawer and the member settings page.
 * - Without v-model (member settings page): bound to usePreferences(), every change is saved
 *   right away (the caller shows 「已自動儲存」).
 * - With v-model (guest drawer): edits a draft only; the caller saves it with its 儲存 button.
 * stacked: narrow layout for the guest drawer — CSV 範例 under the checkbox, groups one per row.
 */
import { computed } from 'vue';
import { usePreferences } from '~/composables/usePreferences';
import { createCsvBlob, downloadBlob } from '~/utils/download';
import {
  BILL_DENOMINATIONS,
  buildSampleCsv,
  COIN_DENOMINATIONS,
  formatDenominationLabel,
  RECOMMENDED_DENOMINATION,
  SAMPLE_CSV_FILE_NAME,
  withDenominationGroup,
  withDenominationToggled,
  withIncludesNames,
  type IPreferences,
} from '~/utils/preferences';

const { stacked = false, modelValue } = defineProps<{
  stacked?: boolean;
  /** Draft to edit instead of the saved preferences */
  modelValue?: IPreferences;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: IPreferences] }>();

const live = usePreferences();

const preferences = computed<IPreferences>(() => modelValue ?? live.preferences.value);

// Draft → emit the new draft; live → save right away. Unchanged results are ignored.
const apply = (next: IPreferences) => {
  if (next === preferences.value) return;
  if (modelValue) emit('update:modelValue', next);
  else live.savePreferences(next);
};

const setIncludesNames = (includesNames: boolean) => apply(withIncludesNames(preferences.value, includesNames));
const toggleDenomination = (value: number) => apply(withDenominationToggled(preferences.value, value));
const setDenominationGroup = (values: readonly number[], enabled: boolean) =>
  apply(withDenominationGroup(preferences.value, values, enabled));
const isDenominationEnabled = (value: number) => preferences.value.denominations.includes(value);

const groups = computed(() =>
  [
    { title: '紙鈔', values: BILL_DENOMINATIONS },
    { title: '硬幣', values: COIN_DENOMINATIONS },
  ].map((group) => ({
    ...group,
    isAllOn: group.values.every((value) => preferences.value.denominations.includes(value)),
  })),
);

const onSampleClick = () => {
  const { includesNames } = preferences.value;
  downloadBlob(
    createCsvBlob(buildSampleCsv(includesNames)),
    includesNames ? SAMPLE_CSV_FILE_NAME.names : SAMPLE_CSV_FILE_NAME.amountOnly,
  );
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-preferences-form { @apply flex flex-col gap-4; }

  /* DS soft row, radius 20 */
  .app-preferences-form__format {
    @apply flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-inset bg-soft px-4 py-2;
  }
  .app-preferences-form__format .app-checkbox { @apply flex-wrap gap-y-0; }
  .app-preferences-form__sample { @apply flex-none; }

  .app-preferences-form__title { @apply px-1 text-btn text-ink; }

  /* Two group boxes side by side when there is room */
  .app-preferences-form__groups { @apply grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3; }

  /* DS: 2px soft border, radius 20 */
  .app-preferences-form__group { @apply flex flex-col rounded-inset border-2 border-soft px-4 py-3; }

  /* Guest drawer (DS): checkbox, then CSV 範例 below it; one group per row */
  .app-preferences-form--stacked .app-preferences-form__format { @apply flex-col items-start py-3; }
  .app-preferences-form--stacked .app-preferences-form__groups { @apply grid-cols-1; }
  .app-preferences-form__group-head { @apply flex items-center justify-between gap-2; }
  .app-preferences-form__group-title { @apply text-base font-bold text-ink; }
}
</style>
