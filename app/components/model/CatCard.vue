<template>
  <div class="model-cat-card">
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
          <slot name="model-header">
            <div class="model-header flex flex-col gap-2">
              <div class="model-header__title">{{ title }}</div>
              <div class="model-header__description">{{ description }}</div>
            </div>
          </slot>
          <slot name="model-body">
            <div class="model-body">
              <div>Model Body Content</div>
            </div>
          </slot>
          <slot name="model-footer">
              <div class="model-footer">
                <div>Model Footer Content</div>
              </div>
            </slot>
        </div>
      </app-cat-card>
    </div>
    <div class="model-mask" @click="onMaskClick"></div>
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

.model-cat-card {
  @apply fixed top-0 left-0 w-full h-full z-2 flex items-center justify-center;
}

.model-mask {
  @apply absolute top-0 left-0 w-full h-full bg-black/50;
}

::v-deep(.cat-card .card-body) {
  @apply flex gap-5;
}

.app-button {
  @apply rounded-full bg-bg text-ink w-12 h-12 text-lg;
}
</style>