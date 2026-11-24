<template>
  <div v-if="open" class="app-dialog">
    <div class="app-dialog__scrim" :class="{ 'app-dialog__scrim--strong': alert }" @click="onScrimClick" />
    <div
      :ref="onPanelRef"
      class="app-dialog__panel"
      :style="{ '--dialog-width': `${width}px` }"
      :role="alert ? 'alertdialog' : 'dialog'"
      aria-modal="true"
      :aria-labelledby="title ? titleId : undefined"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <component
        :is="catEars ? AppCatEarCard : 'div'"
        v-bind="catEars ? { size: 'dialog' } : { class: 'app-dialog__card' }"
      >
        <div class="app-dialog__body">
          <div v-if="closable" class="app-dialog__close">
            <app-icon-button label="關閉" glyph="×" tone="soft" @click="emit('close')" />
          </div>
          <h2 v-if="title" :id="titleId" class="app-dialog__title">{{ title }}</h2>
          <slot />
        </div>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Design system: Dialog — centred modal, 30px radius, warm scrim.
 * - Esc and clicking the scrim emit `close` (scrim click is ignored when `persistent`).
 * - `alert` → role="alertdialog" + stronger scrim, for destructive confirms (刪除 / 停用).
 * - `catEars` → cat ears on top, for 登入 / 註冊.
 * - Focus moves into the dialog on open, Tab stays inside, and focus returns on close.
 * Extra (not in DS): `closable` shows a × IconButton in the top-right corner.
 */
import { useId } from 'vue';
import { useFocusTrap } from '~/composables/useFocusTrap';
import AppCatEarCard from '~/components/app/CatEarCard/CatEarCard.vue';

const {
  open = false,
  title = '',
  alert = false,
  catEars = false,
  persistent = false,
  closable = false,
  width = 420
} = defineProps<{
  open?: boolean;
  title?: string;
  alert?: boolean;
  catEars?: boolean;
  /** Clicking the scrim does not close (Esc and the × still do) */
  persistent?: boolean;
  closable?: boolean;
  /** Max width in px (DS default 420) */
  width?: number;
}>();

const emit = defineEmits<{ close: [] }>();

const titleId = useId();
const { onPanelRef, onKeydown } = useFocusTrap(() => emit('close'));

const onScrimClick = () => {
  if (!persistent) emit('close');
};

</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .app-dialog { @apply fixed inset-0 z-50 flex items-center justify-center p-4; }

  .app-dialog__scrim { @apply absolute inset-0 bg-scrim; }
  .app-dialog__scrim--strong { @apply bg-scrim-strong; }

  /* Tall content (e.g. 偏好設定) scrolls inside the panel instead of overflowing the viewport */
  .app-dialog__panel { @apply relative max-h-full overflow-y-auto outline-none; width: min(var(--dialog-width), 100%); }
  .app-dialog__card { @apply rounded-dialog bg-surface p-6 text-ink; }

  .app-dialog__body { @apply relative flex flex-col gap-4; }
  .app-dialog__close { @apply flex justify-end; }
  .app-dialog__title { @apply text-center text-h2 text-ink; }
}
</style>
