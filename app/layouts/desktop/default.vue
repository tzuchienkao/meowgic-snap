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
            <app-button class="dark:text-ink" label="喵奴才" @click="toggleAccountPanel">
              <template #appendIcon>
                <span class="text-xs text-muted">▼</span>
              </template>
            </app-button>
            <div
              v-if="isShowAccountPanel"
              class="absolute top-full right-0 bg-surface rounded-3xl p-2 mt-3 min-w-[200px] text-ink shadow-shadow/6 shadow-xl">
              <ul>
                <li class="p-3">
                  <div>喵奴才</div>
                  <div class="text-xs text-muted">meow@mail.com</div>
                </li>
                <li class="p-3 hover:bg-accent/12 rounded-md">修改名稱與設定</li>
                <li class="text-warning-text p-3 hover:bg-accent/12 rounded-md">登出</li>
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
import { reactive } from 'vue';
import { useTheme } from "~/composables/useTheme.ts";
import { Themes } from '~/types/theme';
import type { IAppTab } from '~/components/app/Tab/ITab';

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

.theme-button {
  @apply w-12 h-12 px-0 py-0 text-center;
}
</style>