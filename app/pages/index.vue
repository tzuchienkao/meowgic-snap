<template>
  <div class="page-index">
    <div class="page-index__header">
    </div>
    <div class="page-index__body grid grid-cols-2 gap-6">
      <app-cat-card>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1 text-center">
            <p class="text-ink text-lg">現在支援<span class="text-accent-dark">姓名,金額</span>資料</p>
            <p class="text-muted text-base">按照下面提示的格式交出你的資料</p>
          </div>
          <div class="flex flex-col gap-1">
            <p class="text-ink">注意（不要說我沒說）：</p>
          </div>
        </div>
      </app-cat-card>
      <div>
        <app-cat-card
        >
          <div class="flex flex-col gap-4">
            <div class="flex justify-between items-end gap-3">
              <span>總金額</span>
              <p><span class="text-accent-dark text-4xl mr-1">1000</span>元</p>
            </div>
          </div>
        </app-cat-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('');
const loading = ref(false);

const { data } = await useFetch('/api/data')

const { data: posts } = await useAsyncData(
  '_posts',
  () => $fetch('/api/posts'),
  {
    transform: (res) => {
      return res.posts
    }
  }
)
</script>