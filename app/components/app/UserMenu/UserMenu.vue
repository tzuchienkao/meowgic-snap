<template>
  <div ref="root" class="app-user-menu" @keydown.esc="close(true)">
    <app-button
      ref="trigger"
      variant="surface"
      size="md"
      :label="userName"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <template #append>
        <span class="app-user-menu__caret" aria-hidden="true">▼</span>
      </template>
    </app-button>

    <div v-if="isOpen" class="app-user-menu__panel" role="menu" :aria-label="`${userName} 的帳號選單`">
      <div class="app-user-menu__account">
        <span class="app-user-menu__name">{{ userName }}</span>
        <span v-if="userEmail" class="app-user-menu__email">{{ userEmail }}</span>
      </div>
      <button type="button" role="menuitem" class="app-user-menu__item" @click="onSettings">修改名稱與設定</button>
      <button type="button" role="menuitem" class="app-user-menu__item app-user-menu__item--danger" @click="onLogoutClick">登出</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Header user menu (design system ui_kits/web/header.jsx): name pill ▼ that opens a
 * floating panel with the account, 修改名稱與設定 and 登出.
 * Closes on outside click, Esc (focus returns to the trigger) and after choosing an item.
 */
import { onBeforeUnmount, ref } from 'vue';
import { useUserAccount } from '~/composables/useUserAccount';

const { userName, userEmail, goToSettings, onLogout } = useUserAccount();

const isOpen = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<{ $el: HTMLElement } | null>(null);

// The outside-click listener exists only while the menu is open: added in open(), removed in close().
const onDocumentPointerDown = (event: PointerEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) close();
};

const open = () => {
  isOpen.value = true;
  document.addEventListener('pointerdown', onDocumentPointerDown);
};

const close = (returnFocus = false) => {
  if (!isOpen.value) return;
  isOpen.value = false;
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  if (returnFocus) trigger.value?.$el?.focus();
};

const toggle = () => {
  if (isOpen.value) close();
  else open();
};

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown));

const onSettings = () => {
  close();
  goToSettings();
};

const onLogoutClick = () => {
  close();
  onLogout();
};
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-user-menu { @apply relative; }
  .app-user-menu__caret { @apply text-xs text-muted; }

  /* DS: 220px wide, radius 22 → 24, padding 8, 8px below the 44px trigger, menu shadow */
  .app-user-menu__panel {
    @apply absolute right-0 top-full z-30 mt-2 flex w-55 flex-col rounded-3xl bg-surface p-2 text-ink shadow-menu;
  }

  /* DS padding 10px 12px → 8px 12px */
  .app-user-menu__account { @apply flex flex-col px-3 py-2; }
  .app-user-menu__name { @apply text-btn; }
  .app-user-menu__email { @apply text-xs text-muted; }

  /* 44px items: 14px text (20px line) + 12px ×2 */
  .app-user-menu__item {
    @apply rounded-menu-item px-3 py-3 text-left text-body-sm leading-5 text-ink cursor-pointer hover:bg-hover-tint;
  }
  .app-user-menu__item--danger { @apply text-warn-text; }
}
</style>
