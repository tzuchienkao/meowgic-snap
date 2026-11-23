<template>
  <div class="layout-desktop-wrapper">
    <component :is="layout">
      <slot />
    </component>
  </div>
</template>

<script setup lang="ts">
const { name } = defineProps(['name'])
const layout = computed(() => `layout-desktop-${name}`)

</script>

<style scoped>
/* 16px side gutters (same as MobileWrapper) so cards never touch the screen edge;
   content-box keeps the content itself at the DS max width of 1200px on wide screens. */
.layout-desktop-wrapper {
  box-sizing: content-box;
  max-width: var(--ms-content-max);
  margin: 0 auto;
  padding: 0 var(--ms-space-4);
}
</style>