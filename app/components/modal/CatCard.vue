<template>
  <div class="modal-cat-card">
    <div>
      <app-cat-card class="relative z-1">
        <div class="flex flex-col gap-5">
          <div class="flex justify-end">
            <app-button
              label="×"
              @click="onCloseClick"
            >
            </app-button>
          </div>
          <slot name="modal-header">
            <div class="modal-header flex flex-col gap-2">
              <div class="modal-header__title">{{ title }}</div>
              <div class="modal-header__description">{{ description }}</div>
            </div>
          </slot>
          <slot name="modal-body">
            <div class="modal-body">
              <div>Modal Body Content</div>
            </div>
          </slot>
          <slot name="modal-footer">
              <div class="modal-footer">
                <div>Modal Footer Content</div>
              </div>
            </slot>
        </div>
      </app-cat-card>
    </div>
    <div class="modal-mask" @click="onMaskClick"></div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close-click']);
const props = defineProps({
  title: {
    type: String,
    default: '',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isStatic: {
    type: Boolean,
    default: false
  }
});

const onCloseClick = () => {
  emit('close-click');
};

const onMaskClick = () => {
  if (!props.isStatic) {
    onCloseClick();
  }
};
</script>

<style scoped>
@reference "~/assets/css/main.css";

.modal-cat-card {
  @apply fixed top-0 left-0 w-full h-full z-2 flex items-center justify-center;
}

.modal-mask {
  @apply absolute top-0 left-0 w-full h-full bg-scrim;
}

::v-deep(.cat-card .cat-body) {
  @apply flex gap-5;
}

.app-button {
  @apply rounded-full bg-bg text-ink w-12 h-12 text-lg;
}
</style>