<template>
  <div class="page-settings flex flex-col gap-5">
    <div class="page-settings__header">
      <h1 class="text-ink text-h1">儀表板</h1>
      <p class="text-muted text-helper mt-1">喵奴才，這是你到目前為止的兌換紀錄喵</p>
    </div>
    <div class="page-settings__body">
      <app-cat-ear-card>
        <app-illustration-slot class="not-ready" label="貓咪插畫：還在整理儀表板" radius="card" :stripe="10">
          <p class="not-ready__text">{{ FEATURE_NOT_READY_MESSAGE }}</p>
        </app-illustration-slot>
      </app-cat-ear-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FEATURE_NOT_READY_MESSAGE } from '~/constants/feature';
</script>

<style scoped>
@reference "~/assets/css/main.css";

.not-ready {
  @apply p-6 min-h-70;
}
.not-ready__text {
  @apply text-lg;
}
</style>
