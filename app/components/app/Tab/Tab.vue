<template>
  <button
    class="app-tab text-ink bg-transparent rounded-full px-4 py-2 block relative z-2 cursor-pointer transition-[background-color, color] duration-300"
    :class="{ 'is-active': isActive }"
    @click="onTabClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import type { IAppTab } from '~/components/app/Tab/ITab';
import { Event } from '~/components/app/Tab/Event';

const { label, isActive, name } = defineProps({
  label: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    required: true
  },
  name: {
    type: String,
    required: true
  }
}) as IAppTab;

const emit = defineEmits([Event.TabClick]);

const onTabClick = () => {
  emit(Event.TabClick, { name, label, isActive })
}
</script>

<style scoped>
@reference "~/assets/css/main.css";

.is-active {
  @apply text-bg bg-ink dark:bg-accent;
}
</style>