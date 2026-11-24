<template>
  <div class="p-6 text-center text-muted">登入中...</div>
</template>

<script setup lang="ts">
import { usePreferences } from '~/composables/usePreferences'

const { initAuth } = useAuth()
const { loadPreferences } = usePreferences()

onMounted(async () => {
  await initAuth()
  // Just signed in: load this member's 偏好設定 before showing the app
  await loadPreferences()
  await navigateTo('/')
})
</script>
