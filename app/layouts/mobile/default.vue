<template>
  <mobile-wrapper>
    <!-- relative: z-10 needs a position to lift the header (and its ☰ menu) above the page -->
    <app-header class="relative z-10">
      <template v-slot:menu>
        <div class="flex">
          <div class="relative">
            <app-icon-button
              :class="{ 'is-active': isShowAccountPanel }"
              :tone="isShowAccountPanel ? 'soft' : 'strong'"
              :label="isShowAccountPanel ? '關閉選單' : '開啟選單'"
              :glyph="isShowAccountPanel ? '×' : '☰'"
              :aria-expanded="isShowAccountPanel"
              @click="onMenuClick"
            />
            <div
              v-if="isShowAccountPanel"
              class="menu-panel"
            >
              <div class="menu-panel--top">
                <div class="account">
                  <div>{{ userName }}</div>
                  <div v-if="userEmail" class="text-xs text-muted">{{ userEmail }}</div>
                </div>
                <app-icon-button
                  class="text-nav-active"
                  tone="soft"
                  :label="themeToggleLabel"
                  :glyph="currentTheme"
                  @click="onThemeToggle"
                />
              </div>
              <ul class="grid grid-cols-2 gap-2">
                <li
                  v-for="item in navItems"
                  :key="item.name"
                >
                  <app-button
                    variant="secondary"
                    full
                    class="app-button--rounded"
                    :class="{ 'is-active': item.name === currentRouteName }"
                    :aria-current="item.name === currentRouteName ? 'page' : undefined"
                    :label="item.label"
                    @click="onNavigate(item.name)"
                  >
                  </app-button>
                </li>
              </ul>
              <button
                type="button"
                class="text-warning-text bg-bg dark:text-accent col-span-2 rounded-full text-center p-3 w-full cursor-pointer"
                @click="onLogoutClick"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </template>
    </app-header>
    <main>
      <slot />
    </main>
    <footer class="p-4"></footer>
    <div v-show="isShowAccountPanel" class="mask fixed inset-0 bg-scrim"></div>
  </mobile-wrapper>
</template>

<script setup lang="ts">
const {
  navItems,
  currentRouteName,
  onNavigate,
  currentTheme,
  themeToggleLabel,
  onThemeToggle,
  isShowAccountPanel,
  toggleAccountPanel
} = useLayoutMenuState();

const onMenuClick = () => {
  toggleAccountPanel();
};

const { userName, userEmail, onLogout } = useUserAccount();

const onLogoutClick = () => {
  toggleAccountPanel();
  onLogout();
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.app-button--rounded {
  @apply text-center bg-bg text-ink dark:text-accent rounded-md w-full px-4 py-5;
}

.app-icon-button.is-active {
  @apply z-2 relative;
}

.app-button--rounded.is-active {
  @apply bg-ink text-bg dark:bg-accent dark:text-bg;
}

.menu-panel {
  @apply z-1 absolute bg-surface rounded-3xl p-5 text-ink shadow-menu flex flex-col gap-3;
  width: calc(100vw - 16px); /** 16px is the horizontal padding */
  right: -8px;
  top: -8px;
}

.menu-panel--top {
  @apply flex justify-between items-center -mt-3;
  width: calc(100% - 44px); /** 44px is the width of the menu IconButton */
}
</style>