<template>
  <div class="cat-card">
    <div class="cat-ears">
      <div class="cat-ear" :class="[`bg-${bgColor}`]"></div>
      <div class="cat-ear" :class="[`bg-${bgColor}`]"></div>
    </div>
    <div class="cat-body" :class="[`bg-${bgColor}`, `text-${textColor}`]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { bgColor, textColor } = defineProps({
  bgColor: {
    type: String,
    default: 'surface'
  },
  textColor: {
    type: String,
    default: 'ink'
  }
})
</script>

<style scoped>
@reference "~/assets/css/main.css";

.cat-ears {
  @apply flex justify-between -mt-2 px-7;
}

.cat-ears .cat-ear {
  @apply w-8 h-8;
  border-radius: 8px;
  transform: rotate(45deg);
  transform-origin: bottom left;
}

.cat-body {
  @apply rounded-xl p-6 relative;
}
</style>