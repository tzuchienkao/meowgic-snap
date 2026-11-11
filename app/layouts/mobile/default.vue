<template>
  <mobile-wrapper>
    <app-header class="z-10">
      <template v-slot:menu>
        <div class="flex">
          <div class="relative">
            <app-button
              class="app-button--rounded-full__menu"
              :class="{ 'is-active': isShowAccountPanel }"
              :label="isShowAccountPanel ? '×' : '☰'"
              @click="onMenuClick"
            >
            </app-button>
            <div
              v-if="isShowAccountPanel"
              class="menu-panel"
            >
              <div class="menu-panel--top">
                <div class="account">
                  <div>喵奴才</div>
                  <div class="text-xs text-muted">meow@mail.com</div>
                </div>
                <app-button
                  class="app-button--rounded-full__theme"
                  :label="currentTheme"
                  @click="onThemeToggle"
                >
                </app-button>
              </div>
              <ul class="grid grid-cols-2 gap-2">
                <li
                  v-for="tab in tabs"
                  :key="tab.name"
                >
                  <app-button
                    class="app-button--rounded"
                    :class="{ 'is-active': tab.isActive }"
                    :label="tab.label"
                    @click="onTabClick(tab)"
                  >
                  </app-button>
                </li>
              </ul>
              <div class="text-warning-text bg-bg dark:text-accent col-span-2 rounded-full text-center p-3">登出</div>
            </div>
          </div>
        </div>
      </template>
    </app-header>
    <main>
      <slot />
    </main>
    <div v-show="isShowAccountPanel" class="mask fixed inset-0 bg-black/50"></div>
  </mobile-wrapper>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useTheme } from "~/composables/useTheme.ts";
import { Themes } from '~/types/theme';
import type { IAppTab } from '~/components/app/Tab/ITab';

const { name } = defineProps(['name'])

const { theme, toggleTheme } = useTheme();

const initTabs = [
  { name: 'index', label: '首頁', isActive: false },
  { name: 'dashboard', label: '儀表板', isActive: false },
  { name: 'logs', label: '紀錄', isActive: false },
  { name: 'settings', label: '設定', isActive: false }
];

const tabs = reactive(initTabs);

const currentTab = ref('index');

const onTabClick = (tab: IAppTab) => {
  tabs.forEach((t: IAppTab) => {
    t.isActive = t.name === tab.name;
  });
  currentTab.value = tab.name;
};

const currentTheme = computed(() => {
  return theme.value === Themes.Dark ? '☀' : '☾';
});

const onThemeToggle = () => {
  toggleTheme();
};

const onMenuClick = () => {
  toggleAccountPanel();
};

const isShowAccountPanel = ref(false);

const toggleAccountPanel = () => {
  isShowAccountPanel.value = !isShowAccountPanel.value;
};

const initPage = () => {
  tabs.forEach((tab: IAppTab) => {
    tab.isActive = tab.name === currentTab.value;
  });
};

initPage();
</script>

<style scoped>
@reference "~/assets/css/main.css";

.app-button--rounded {
  @apply text-center bg-bg text-ink dark:text-accent rounded-md w-full px-4 py-5;
}

[class*=app-button--rounded-full] {
  @apply w-12 h-12 px-0 py-0 text-center bg-ink text-bg dark:bg-accent dark:text-bg;
}

.app-button.app-button--rounded-full__theme,
.app-button.app-button--rounded-full__menu.is-active {
  @apply bg-bg text-ink dark:text-accent;
}

.app-button.app-button--rounded-full__menu.is-active {
  @apply z-2 relative;
}

.app-button--rounded.is-active {
  @apply bg-ink text-bg dark:bg-accent dark:text-bg;
}

.menu-panel {
  @apply z-1 absolute bg-surface rounded-3xl p-5 text-ink shadow-shadow/6 shadow-xl flex flex-col gap-3;
  width: calc(100vw - 16px); /** 16px is the horizontal padding */
  right: -8px;
  top: -8px;
}

.menu-panel--top {
  @apply flex justify-between items-center -mt-3;
  width: calc(100% - 48px); /** 48px is the width of the menu button */
}
</style>