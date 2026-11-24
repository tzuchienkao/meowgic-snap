<template>
  <div class="app-toast" :class="{ 'app-toast--fixed': fixed }" role="status" aria-live="polite">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: Toast — dark pill, bottom-centre when fixed. The caller controls timing
 * (DS: auto-dismiss after 2s, --ms-toast-ms), e.g. "領款單已複製，可以貼給銀行了喵".
 */
const { fixed = false } = defineProps<{
  /** position: fixed, bottom-centre */
  fixed?: boolean;
}>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* DS padding 12px 22px → 12px 24px */
  .app-toast { @apply self-center rounded-full bg-strong px-6 py-3 text-body-md text-strong-text whitespace-nowrap; }
  .app-toast--fixed { @apply fixed bottom-6 left-1/2 z-60 -translate-x-1/2; }
}
</style>
