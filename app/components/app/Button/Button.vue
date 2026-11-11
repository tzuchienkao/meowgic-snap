<template>
  <button
    class="app-button px-5 py-3 rounded-full bg-surface dark:text-accent cursor-pointer transition-[background-color, color] duration-300"
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
