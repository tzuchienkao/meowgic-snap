<template>
  <nav class="app-nav-pills" :aria-label="ariaLabel">
    <NuxtLink
      v-for="item in items"
      :key="item.name"
      :to="{ name: item.name }"
      class="app-nav-pills__item"
      :class="{ 'is-active': item.name === currentName }"
      :aria-current="item.name === currentName ? 'page' : undefined"
      @click="emit('navigate', item)"
    >
      {{ item.label }}
    </NuxtLink>
    <span class="app-nav-pills__indicator" aria-hidden="true" />
  </nav>
</template>

<script setup lang="ts">
/**
 * Design system: NavPills — header page switcher. White capsule, active pill = nav-active
 * (dark ink in light theme, cat-eye yellow in dark theme). Page navigation, not in-page tabs:
 * renders <nav> + links, marks the current page with aria-current, and derives the active
 * item from the current route so browser back/forward stays in sync.
 * The active pill slides between items (0.5s) via CSS anchor positioning, as in the
 * original header tabs.
 */
import { computed } from 'vue';
import type { INavPillItem } from './INavPills';

const { items, ariaLabel } = defineProps<{
  items: readonly INavPillItem[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{ navigate: [item: INavPillItem] }>();

const route = useRoute();
const currentName = computed(() => route.name);
</script>

<style scoped>
@reference "~/assets/css/main.css";

.app-nav-pills {
  @apply relative flex gap-1 bg-surface rounded-full p-1;
}

/* Size comes from padding + font size (4px grid), no fixed height. */
.app-nav-pills__item {
  @apply relative z-2 block px-4 py-2 rounded-full text-ink whitespace-nowrap;
  transition: background-color 0.3s, color 0.3s;
}

.app-nav-pills__item:not(.is-active):hover {
  @apply bg-hover;
}

.app-nav-pills__item.is-active {
  @apply bg-nav-active text-nav-active-text;
  anchor-name: --nav-pills-active;
}

/* Sliding pill behind the active item (same timing as the original header tabs). */
.app-nav-pills__indicator {
  @apply absolute z-1 rounded-full bg-nav-active;
  position-anchor: --nav-pills-active;
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
