<template>
  <label class="app-input" :class="attrs.class">
    <span v-if="label" class="app-input__label">{{ label }}</span>
    <span class="app-input__row">
      <input
        v-bind="inputAttrs"
        class="app-input__field"
        :class="{ 'is-invalid': invalid }"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :readonly="readonly"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-describedby="hint ? hintId : undefined"
        @input="onInput"
        @blur="emit('blur')"
      />
      <slot name="trailing" />
    </span>
    <span v-if="hint || count" class="app-input__meta" :class="{ 'is-invalid': invalid }">
      <span :id="hintId">{{ hint }}</span>
      <span>{{ count }}</span>
    </span>
  </label>
</template>

<script setup lang="ts">
/**
 * Design system: Input — pill text field with a 2px border; accent border on focus,
 * warn colour when invalid; readonly renders a soft, non-editable pill.
 * Height 48px = 16px text (20px line) + 12px padding ×2 + 2px border ×2 (DS 50, 4px grid).
 * Extra attributes (autocomplete, inputmode, name, maxlength…) go to the <input>.
 */
import { computed, useAttrs, useId } from 'vue';

defineOptions({ inheritAttrs: false });

const {
  modelValue = '',
  type = 'text',
  placeholder = '',
  label = '',
  hint = '',
  count = '',
  invalid = false,
  readonly = false,
  disabled = false
} = defineProps<{
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  count?: string;
  invalid?: boolean;
  readonly?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
}>();

const attrs = useAttrs();
const hintId = useId();
const inputAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

// Existing behaviour kept: surrounding spaces are trimmed while typing (whitespace-only input is left as is).
const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  target.value = target.value.trim() ? target.value.trim() : target.value;
  emit('update:modelValue', target.value);
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-input { @apply flex flex-col gap-1; }

  .app-input__label { @apply px-2 text-helper font-medium text-ink-2; }

  .app-input__row { @apply flex gap-2; }

  .app-input__field {
    @apply flex-1 min-w-0 rounded-full border-2 border-line bg-surface px-4 py-3 text-btn leading-5 text-ink outline-none;
    transition: border-color 0.2s;
  }
  .app-input__field:focus { @apply border-accent; }
  .app-input__field.is-invalid { @apply border-warn-text; }
  .app-input__field:read-only { @apply bg-soft border-soft text-muted; }
  .app-input__field:disabled { @apply bg-soft border-soft text-faint cursor-not-allowed; }

  .app-input__meta { @apply flex justify-between gap-2 px-2 text-xs text-muted; }
  .app-input__meta.is-invalid { @apply text-warn-text; }
}
</style>
