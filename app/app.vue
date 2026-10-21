<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
declare module 'nuxt/app' {
  interface NuxtLayouts {
    'custom': unknown
  }
}
// ---cut---
function enableCustomLayout () {
  setPageLayout('desktop-default')
}
definePageMeta({
  layout: false,
})
const layout = enableCustomLayout()
console.log('layout:', layout)
</script>
