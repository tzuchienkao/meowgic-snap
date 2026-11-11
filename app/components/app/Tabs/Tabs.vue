<template>
  <ul class="app-tabs flex bg-surface rounded-full p-1 gap-1 relative">
    <li v-for="tab in tabs" :key="tab.name">
      <app-tab :label="tab.label" :is-active="tab.isActive" :name="tab.name" @tab-click="onTabClick"></app-tab>
    </li>
    <li>
      <div class="active-bg"></div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { IAppTab } from '~/components/app/Tab/ITab';
import { Event } from '~/components/app/Tab/Event';

const { tabs } = defineProps({
  tabs: Array
}) as { tabs: IAppTab[] };

const emit = defineEmits([Event.TabClick]);

const onTabClick = (tab: IAppTab) => {
  emit(Event.TabClick, tab);
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.app-tab.is-active {
  anchor-name: --active-tab;
}

.active-bg {
  @apply absolute text-bg bg-ink dark:bg-accent rounded-full z-1;
  position-anchor: --active-tab;
  
  top: anchor(top);
  bottom: anchor(bottom);
  left: anchor(left);
  right: anchor(right);

  transition: 
    left 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    right 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s ease;
}
</style>