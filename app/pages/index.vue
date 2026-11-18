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
          <div class="current-settings">
            <app-button
              class="text-xs rounded-full text-muted bg-bg"
              label="目前設定：姓名,金額 · 10 種面額"
            >
              <template #append>
                <span>到設定修改 ›</span>
              </template>
            </app-button>
          </div>
          <div class="instruction">
            <div class="instruction--notice">
              <p class="text-ink font-bold">注意（不要說我沒說）：</p>
              <ul>
                <li class="my-1">
                  <p>每一行只能有一筆姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）。例如：張三,18500。</p>
                </li>
                <li class="my-1">
                  <p>每次最多可貼入 1000 筆。</p>
                </li>
                <li class="my-1">
                  <p>每筆金額之整數部分上限為 999,999。</p>
                </li>
                <li class="my-1">
                  <p>姓名可重複多筆，系統會自動加總。</p>
                </li>
              </ul>
            </div>
            <div class="instruction--tips">
              <p class="text-ink font-bold">從 CSV 貼上小提示：</p>
              <ul>
                <li class="my-1">
                  <p>CSV 檔案中若金額包含千分位逗號，請用雙引號包住（如："45,800"），避免被誤判為欄位分隔符。</p>
                </li>
                <li class="my-1">
                  <p>支援 Excel 直接複製貼上或另存 CSV 上傳（系統將自動過濾引號、貨幣符號與千分位逗號）。</p>
                </li>
              </ul>
            </div>
          </div>
          <div class="money-snap">
            <textarea
              class="money-snap__textarea"
              :placeholder="moneySnap.placeholder"
            ></textarea>
            <div class="money-snap__notices">
              <app-button
                class="text-xs rounded-full text-muted bg-bg"
                label="↑ 匯入 CSV"
              >
              </app-button>
              <span>已貼 4 / 1,000 筆</span>
            </div>
          </div>
          <div class="action-buttons">
            <template v-if="isLogin">
              <app-button
                label="清除資料，算下一筆"
              >
              </app-button>
            </template>
            <template v-else>
              <app-button
                label="清除資料"
              >
              </app-button>
              <app-button
                class="rounded-full text-bg bg-ink"
                label="登入存檔 ฅ^•ﻌ•^ฅ"
              >
              </app-button>
            </template>
          </div>
        </div>
      </app-cat-card>
      <div>
        <app-cat-card
          :bgColor="summaryCard.bgColor"
          :textColor="summaryCard.textColor"
        >
          <div class="summary-card flex flex-col gap-4">
            <div class="flex justify-between items-end gap-3">
              <span>總金額</span>
              <p><span class="text-accent-dark text-4xl mr-1">1000</span>元</p>
            </div>
            <div class="summary-card__meta">
              <span>總筆數：4 筆 · 3 人</span>
              <span>姓名,金額</span>
              <span>計算時間 2026/11/14 00:03:36</span>
            </div>
          </div>
        </app-cat-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const { theme } = useTheme();
const { user } = useAuth();

const isLogin = computed(() => !!user.value);

const summaryCard = computed(() => {
  return {
    bgColor: theme.value === 'light' ? 'ink' : 'surface',
    textColor: theme.value === 'light' ? 'bg' : 'ink'
  }
})

const moneySnap = computed(() => {
  return {
    placeholder: '張三,18500 \n李四,"45,800"\n王五,NT$32,000\n張三,1999'
  }
})

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

<style scoped>
@reference "~/assets/css/main.css";

.current-settings {
  @apply text-center;
}
.current-settings ::v-deep(.app-button) {
  @apply rounded-full text-muted bg-bg pl-3 pr-1.5 py-3 inline-block;
}
.current-settings ::v-deep(.app-button span) {
  @apply rounded-full text-ink bg-surface ml-2 p-2;
}

.instruction {
  @apply flex flex-col gap-4 text-sm;
}

.instruction ul {
  @apply list-decimal list-outside pl-4 text-accent;
}
.instruction .instruction--tips ul {
  list-style-type: 'ฅ ';
}
.instruction ul li p {
  @apply text-ink;
}

.summary-card__meta {
  @apply flex gap-2;
}
.summary-card__meta span {
  @apply bg-muted dark:bg-bg text-bg dark:text-muted px-3 py-1 rounded-full text-sm;
}

.money-snap {
  @apply flex flex-col gap-2;
}
.money-snap__textarea {
  @apply rounded-2xl border border-line border-dashed border-2 text-ink p-4;
  min-height: 160px;
}
.money-snap__notices {
  @apply flex justify-between items-center;
}
.money-snap__notices ::v-deep(.app-button),
.money-snap__notices span {
  @apply rounded-full bg-bg text-sm;
}
.money-snap__notices ::v-deep(.app-button) {
  @apply text-ink p-3 inline-block;
}
.money-snap__notices span {
  @apply text-muted px-3 py-1;
}

.action-buttons {
  @apply flex grow gap-2;
}
.action-buttons ::v-deep(.app-button) {
  @apply bg-bg dark:text-ink basis-full;
}
.action-buttons ::v-deep(.app-button)~ .app-button {
  @apply bg-ink text-bg hover:bg-[#2a1d17];
 }
</style>