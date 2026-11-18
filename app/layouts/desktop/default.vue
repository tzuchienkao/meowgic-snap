<template>
  <desktop-wrapper>
    <app-header class="z-10">
      <template v-slot:menu>
        <app-tabs :tabs="tabs" @tab-click="onTabClick"></app-tabs>
        <div class="flex gap-3">
          <app-button
            class="theme-button"
            :label="currentTheme"
            @click="onThemeToggle"
          >
          </app-button>
          <div class="relative">
            <app-button
              class="dark:text-ink"
              :label="userName"
              @click="toggleAccountPanel"
            >
              <template #append>
                <span class="text-xs text-muted ml-1">▼</span>
              </template>
            </app-button>
            <div
              v-if="isShowAccountPanel && user"
              class="absolute z-1 top-full right-0 bg-surface rounded-3xl p-2 mt-3 min-w-[200px] text-ink shadow-shadow/6 shadow-xl">
              <ul>
                <li class="p-3">
                  <div>{{ userName }}</div>
                  <div class="text-xs text-muted">{{ userEmail }}</div>
                </li>
                <li class="p-3 hover:bg-accent/12 rounded-md">
                  修改名稱與設定
                </li>
                <li
                  class="text-warning-text p-3 hover:bg-accent/12 rounded-md"
                  @click="logout"
                >
                  登出
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </app-header>
    <main>
      <slot />
    </main>
  </desktop-wrapper>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

const { user, logout } = useAuth()

const {
  tabs,
  onTabClick,
  currentTheme,
  onThemeToggle,
  isShowAccountPanel,
  toggleAccountPanel,
} = useLayoutMenuState();

const userName = computed(() => {
  const hasDisplayName = user.value && user.value.display_name;
  if (!user.value || !hasDisplayName) {
    return '喵奴才'
  }
  return user.value.display_name
})

const userEmail = computed(() => {
  if (!user.value) {
    return ''
  }
  return user.value.email
})

</script>

<style scoped>
@reference "~/assets/css/main.css";

.theme-button {
  @apply w-12 h-12 px-0 py-0 text-center;
}
</style>