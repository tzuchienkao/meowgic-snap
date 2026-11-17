<template>
  <div class="app-input">
    <input
      class="app-input__input"
      :class="['app-input__input', {
        'is-readonly': isReadOnly,
        'is-disabled': isDisabled
      }]"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :readonly="isReadOnly"
      @input="onChange"
      @blur="onBlur"
    />
    <div class="app-input__tips">
      <span class="app-input__tips__error" v-show="hasError">
        {{ errorMessage }}
      </span>
      <span class="app-input__tips__counter" v-show="hasCounter">
        {{ modelValue.length }}/{{ maxCounter }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { IInput } from './IInput';

const {
  type,
  modelValue,
  isDisabled,
  isReadOnly,
  placeholder,
  hasError,
  errorMessage,
  hasCounter,
  maxCounter
} = defineProps({
  type: {
    type: String,
    default: 'text'
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  hasError: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  hasCounter: {
    type: Boolean,
    default: false
  },
  maxCounter: {
    type: Number,
    default: 0
  },
  isDisabled: {
    type: Boolean,
    default: false
  },
  isReadOnly: {
    type: Boolean,
    default: false
  }
}) as IInput;

const emit = defineEmits(['update:model-value', 'blur'])

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  target.value = target.value.trim() ? target.value.trim() : target.value
  emit('update:model-value', target.value)
}

const onBlur = () => {
  emit('blur')
}

</script>

<style scoped>
@reference "~/assets/css/main.css";

.app-input {
  @apply flex flex-col gap-1;
}

.app-input__input {
  @apply w-full rounded-full border-2 border-line px-4 py-3 text-ink focus:border-accent focus:outline-none transition-colors duration-200;
}

.app-input__input.is-readonly {
 @apply bg-bg border-bg text-muted;
}

.app-input__input.is-disabled {
 @apply text-muted cursor-not-allowed;
}

.app-input__tips {
  @apply text-muted text-xs;
}

.app-input__tips__counter {
  @apply text-muted text-xs float-right;
}
</style>