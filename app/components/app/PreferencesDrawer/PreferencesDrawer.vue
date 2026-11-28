<template>
  <!-- Fixed tab on the left edge (guests only; members use the settings page) -->
  <button
    type="button"
    class="app-preferences-tab"
    aria-label="開啟偏好設定"
    :aria-expanded="isOpen"
    @click="open"
  >
    <span class="app-preferences-tab__label">偏好設定</span>
    <span aria-hidden="true">ฅ</span>
  </button>

  <!-- Scrim fades, panel slides in from the left edge (two Transitions: each animates its own root) -->
  <Transition name="app-preferences-scrim">
    <div v-if="isOpen" class="app-preferences-drawer__scrim" @click="close" />
  </Transition>
  <Transition name="app-preferences-panel">
    <aside
      v-if="isOpen"
      :ref="onPanelRef"
      class="app-preferences-drawer__panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="app-preferences-drawer__head">
        <h2 :id="titleId" class="app-preferences-drawer__title">偏好設定</h2>
        <app-icon-button label="關閉偏好設定" glyph="×" tone="soft" @click="close" />
      </div>
      <div class="app-preferences-drawer__body">
        <app-preferences-form v-model="draft" stacked />
      </div>
      <div class="app-preferences-drawer__foot">
        <app-button variant="primary" full label="喵不負責存檔(=ΦωΦ=)" :disabled="!isDirty" @click="save" />
        <span class="text-xs text-muted">設定只存在這個瀏覽器喵（登入就幫你記住）</span>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
/**
 * Guest 偏好設定 (design system: 會員系統 guest mode). A dark tab fixed to the left edge opens a
 * floating panel from the left over a warm scrim; Esc, the scrim and × close it, and focus
 * returns to the tab.
 * Changes are made on a draft (copied from the saved preferences when the drawer opens) and
 * only applied by the save button 「喵不負責存檔」 (disabled while nothing changed); closing
 * without saving discards them. Guests' preferences are saved in this browser only, as the
 * note under the button says.
 *
 * Motion is CSS only (the base styles turn transitions off for prefers-reduced-motion):
 * - The tab sits 4px past the left edge and slides out 4px on hover / focus, like a drawer handle.
 * - The panel slides in from the left and back out; the scrim fades. On close Vue unsets the
 *   panel's function ref right away (before the leave animation), so focus goes back at once.
 */
import { computed, ref, useId } from 'vue';
import { useFocusTrap } from '~/composables/useFocusTrap';
import { usePreferences } from '~/composables/usePreferences';
import { PREFERENCES_SAVED_MESSAGE } from '~/constants/user';
import { arePreferencesEqual, clonePreferences, type IPreferences } from '~/utils/preferences';

const isOpen = ref(false);
const titleId = useId();

const { preferences, savePreferences } = usePreferences();
const { showToast } = useToast();

// Draft edited in the drawer; undefined until the drawer is opened
const draft = ref<IPreferences>();
const isDirty = computed(() => !!draft.value && !arePreferencesEqual(draft.value, preferences.value));

const open = () => {
  draft.value = clonePreferences(preferences.value);
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const save = () => {
  if (!draft.value || !isDirty.value) return;
  savePreferences(draft.value);
  showToast(PREFERENCES_SAVED_MESSAGE);
  close();
};

const { onPanelRef, onKeydown } = useFocusTrap(close);
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  /* Edge tab (DS 36 → hover 40): 40px wide (20 line + 12 + 8) with 4px hidden past the edge;
     the whole tab slides 4px right on hover / keyboard focus */
  .app-preferences-tab {
    @apply fixed -left-1 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 rounded-r-inset bg-strong py-4 pl-3 pr-2 text-strong-text cursor-pointer;
    @apply transition-transform duration-(--ms-dur-fast) ease-ms hover:translate-x-1 focus-visible:translate-x-1;
  }
  .app-preferences-tab__label {
    @apply text-body-md leading-5 tracking-widest;
    writing-mode: vertical-rl;
  }

  .app-preferences-drawer__scrim { @apply fixed inset-0 z-40 bg-scrim; }

  /* <Transition> classes */
  .app-preferences-scrim-enter-active,
  .app-preferences-scrim-leave-active { @apply transition-opacity duration-(--ms-dur-theme) ease-ms; }
  .app-preferences-scrim-enter-from,
  .app-preferences-scrim-leave-to { @apply opacity-0; }

  .app-preferences-panel-enter-active,
  .app-preferences-panel-leave-active { @apply transition-[translate,opacity] duration-(--ms-dur-theme) ease-ms; }
  /* Fully off-screen: its own width plus the 12px gap */
  .app-preferences-panel-enter-from,
  .app-preferences-panel-leave-to { @apply -translate-x-[calc(100%+--spacing(3))] opacity-0; }

  /* Floating panel: 12px from the edges, 340px wide (never wider than the screen minus 60px) */
  .app-preferences-drawer__panel {
    @apply fixed top-3 bottom-3 left-3 z-41 flex w-85 max-w-[calc(100vw-60px)] flex-col overflow-hidden rounded-card bg-surface text-ink outline-none;
  }

  /* DS padding 22 / 20 / 10 → 24 / 20 / 8 */
  .app-preferences-drawer__head { @apply flex items-center justify-between px-5 pt-6 pb-2; }
  .app-preferences-drawer__title { @apply text-xl; }

  .app-preferences-drawer__body { @apply flex-1 overflow-y-auto px-5 pb-4; }

  /* Footer: save button and the browser-only note */
  .app-preferences-drawer__foot { @apply p-4 text-center; }
}
</style>
