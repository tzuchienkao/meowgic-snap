<template>
  <div class="p-6 text-center text-muted">登入中...</div>
</template>

<script setup lang="ts">
const { initAuth } = useAuth()

onMounted(async () => {
  await initAuth()
  await navigateTo('/')
})
</script>
