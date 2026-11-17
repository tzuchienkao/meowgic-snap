<template>
  <button
    class="app-button transition-[background-color, color]"
    :disabled="disabled"
    @click="onButtonClick"
  >
    {{ label }}
    <slot name="appendIcon"></slot>
  </button>
</template>

<script setup lang="ts">
import type { IAppButton } from './IButton';

const { label, variant, size, disabled } = defineProps({
  label: {
    type: String,
    required: true
  },
  variant: {
    type: String as () => 'primary' | 'secondary' | 'tertiary' | undefined,
    default: 'primary'
  },
  size: {
    type: String as () => 'sm' | 'md' | 'lg' | undefined,
    default: 'md'
  },
  disabled: {
    type: Boolean,
    default: false
  }
}) as IAppButton;

const emit = defineEmits(['click']);

const onButtonClick = () => {
  if (!disabled) {
    emit('click');
  }
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.app-button {
  @apply px-5 py-3 rounded-full bg-surface dark:text-accent cursor-pointer duration-300 flex items-center justify-center;
}
</style>