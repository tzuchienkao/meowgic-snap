<template>
  <nav class="app-pagination" aria-label="分頁">
    <div class="app-pagination__pages">
      <button
        type="button"
        class="app-pagination__step"
        aria-label="上一頁"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        ‹
      </button>
      <button
        v-for="number in pageNumbers"
        :key="number"
        type="button"
        class="app-pagination__page"
        :class="{ 'app-pagination__page--current': number === page }"
        :aria-label="`第 ${number} 頁`"
        :aria-current="number === page ? 'page' : undefined"
        @click="go(number)"
      >
        {{ number }}
      </button>
      <button
        type="button"
        class="app-pagination__step"
        aria-label="下一頁"
        :disabled="page >= pages"
        @click="go(page + 1)"
      >
        ›
      </button>
    </div>
    <span v-if="caption" class="app-pagination__caption">{{ caption }}</span>
  </nav>
</template>

<script setup lang="ts">
/**
 * Design system: Pagination — pager for record lists (50 per page). Shows up to 2 pages on each side
 * of the current one; the current page uses nav-active. Emits `change` with a page clamped to 1…pages
 * (never the current page).
 */
import { computed } from 'vue';

/** Page numbers shown on each side of the current page */
const PAGE_WINDOW = 2;

const { page, pages, caption = '' } = defineProps<{
  /** Current page, 1-based */
  page: number;
  pages: number;
  /** e.g. "第 1–50 筆，共 128 筆" */
  caption?: string;
}>();

const emit = defineEmits<{ change: [page: number] }>();

const pageNumbers = computed(() => {
  const numbers: number[] = [];
  for (let i = Math.max(1, page - PAGE_WINDOW); i <= Math.min(pages, page + PAGE_WINDOW); i++) numbers.push(i);
  return numbers;
});

const go = (target: number) => {
  const next = Math.min(pages, Math.max(1, target));
  if (next !== page) emit('change', next);
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-pagination { @apply flex flex-col items-center gap-2; }
  /* DS gap 6 → 8 */
  .app-pagination__pages { @apply flex flex-wrap justify-center gap-2; }

  /* DS 40×40 round: 8px padding + 24px line = 40 */
  .app-pagination__step,
  .app-pagination__page {
    @apply min-w-10 rounded-full bg-surface px-2 py-2 text-base leading-6 text-ink cursor-pointer;
  }
  .app-pagination__step:disabled { @apply text-faint cursor-default; }
  .app-pagination__page--current { @apply bg-nav-active text-nav-active-text; }

  .app-pagination__caption { @apply text-xs text-muted; }
}
</style>
