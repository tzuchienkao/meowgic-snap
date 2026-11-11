<template>
  <div class="layout-wrapper">
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
.layout-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}
</style>