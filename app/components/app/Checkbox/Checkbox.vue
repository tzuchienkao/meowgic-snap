<template>
  <button
    type="button"
    role="checkbox"
    class="app-checkbox"
    :class="[`app-checkbox--${size}`, `app-checkbox--${labelFont}`, { 'is-checked': modelValue }]"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="onClick"
  >
    <span class="app-checkbox__box" aria-hidden="true">{{ modelValue ? '✓' : '' }}</span>
    <span v-if="label || $slots.default" class="app-checkbox__label"><slot>{{ label }}</slot></span>
    <span v-if="note" class="app-checkbox__note">{{ note }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * Design system: Checkbox — custom rounded checkbox (role="checkbox"); checked = accent fill
 * with a dark ✓. md 24px box for items · sm 20px box for 全選.
 * labelFont: round = 16px (denominations) · sans = 15px medium (settings rows) — both use the
 * project's single font.
 */
const {
  modelValue = false,
  label = '',
  note = '',
  size = 'md',
  labelFont = 'round',
  disabled = false
} = defineProps<{
  modelValue?: boolean;
  label?: string;
  /** Muted aside after the label, e.g. "（建議保留）" */
  note?: string;
  size?: 'md' | 'sm';
  labelFont?: 'round' | 'sans';
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const onClick = () => {
  if (!disabled) {
    emit('update:modelValue', !modelValue);
  }
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* py-2 keeps the tap target at 40px (24px box + 8px ×2) without a fixed height */
  .app-checkbox { @apply flex items-center py-2 text-left cursor-pointer; }
  .app-checkbox--md { @apply gap-3; }
  .app-checkbox--sm { @apply gap-2; }

  .app-checkbox__box {
    @apply flex flex-none items-center justify-center border-2 border-line-checkbox bg-surface font-bold text-on-accent;
  }
  .app-checkbox--md .app-checkbox__box { @apply w-6 h-6 rounded-checkbox text-body-sm leading-none; }
  .app-checkbox--sm .app-checkbox__box { @apply w-5 h-5 rounded-ear text-xs leading-none; }
  .app-checkbox.is-checked .app-checkbox__box { @apply border-accent bg-accent; }

  .app-checkbox__label { @apply text-ink; }
  .app-checkbox--round .app-checkbox__label { @apply text-btn; }
  .app-checkbox--sans .app-checkbox__label { @apply text-base font-medium; }

  .app-checkbox__note { @apply text-xs text-muted; }

  .app-checkbox:disabled { @apply cursor-not-allowed; }
  .app-checkbox:disabled .app-checkbox__box { @apply bg-soft border-line-checkbox; }
  .app-checkbox:disabled .app-checkbox__label { @apply text-faint; }
}
</style>
