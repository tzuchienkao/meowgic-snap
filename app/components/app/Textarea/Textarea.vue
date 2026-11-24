<template>
  <textarea
    class="app-textarea"
    :value="modelValue"
    :rows="rows"
    :placeholder="placeholder"
    :readonly="readonly"
    :disabled="disabled"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>

<script setup lang="ts">
/**
 * Design system: Textarea — dashed, 20px-radius field for pasting "姓名,金額" lines;
 * the dashed border turns accent on focus. Read-only (e.g. after calculating) drops the focus
 * highlight and shows muted text with a not-allowed cursor. Pair with a Chip line counter below.
 * Pass an aria-label when there is no visible label.
 */
const {
  modelValue = '',
  rows = 7,
  placeholder = '',
  readonly = false,
  disabled = false
} = defineProps<{
  modelValue?: string;
  rows?: number;
  placeholder?: string;
  readonly?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-textarea {
    @apply block w-full min-h-40 resize-y rounded-inset border-2 border-dashed border-line bg-surface p-4 font-mono text-body-md text-ink outline-none;
    transition: border-color 0.2s;
  }
  .app-textarea:focus { @apply border-accent; }
  /* Read-only (e.g. after calculating): no focus highlight, not-allowed cursor, muted text */
  .app-textarea:read-only,
  .app-textarea:read-only:focus { @apply border-line text-muted cursor-not-allowed; }
  .app-textarea:disabled { @apply bg-soft text-faint cursor-not-allowed; }
}
</style>
