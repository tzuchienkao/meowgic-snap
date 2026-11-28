<template>
  <div class="app-page-header">
    <div class="app-page-header__text">
      <h1 class="app-page-header__title">{{ title }}</h1>
      <p v-if="description" class="app-page-header__description">{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
/**
 * Member page header: title (h1) and a one-line description; `actions` sits at the end of the row
 * (e.g. 紀錄's 匯出這個區間 CSV) and wraps under the text when there's no room.
 */
const { title, description = '' } = defineProps<{
  title: string;
  description?: string;
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-page-header { @apply flex flex-wrap items-end justify-between gap-3; }
  .app-page-header__title { @apply text-ink text-h1; }
  .app-page-header__description { @apply mt-1 text-helper text-muted; }
}
</style>
