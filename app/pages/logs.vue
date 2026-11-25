<template>
  <div class="page-settings flex flex-col gap-5">
    <div class="page-settings__header">
      <h1 class="text-ink text-h1">紀錄</h1>
      <p class="text-muted text-helper mt-1">每一次兌換都幫你記下來了，紀錄保存 2 年</p>
    </div>
    <div class="page-settings__body">
      <app-cat-ear-card>
        <app-illustration-slot class="not-ready" label="貓咪插畫：還在翻紀錄本" radius="card" :stripe="10">
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
