<template>
  <div class="layout-mobile-wrapper">
    <component :is="layout">
      <slot />
    </component>
  </div>
</template>

<script setup lang="ts">
const { name } = defineProps(['name'])
const layout = computed(() => `layout-mobile-${name}`)

</script>

<style scoped>
.layout-mobile-wrapper {
  min-width: 320px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}
</style>