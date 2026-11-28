<template>
  <div class="instruction">
    <div class="instruction--notice">
      <p class="text-ink font-bold">注意（不要說我沒說）：</p>
      <ul>
        <li v-if="includesNames" class="my-1">
          <p>每一行只能有一筆姓名,金額（手動輸入用逗號；從試算表複製貼上會自動辨識）。例如：張三,18500。</p>
        </li>
        <li v-else class="my-1">
          <p>每一行只能有一筆金額。例如：18500。</p>
        </li>
        <li class="my-1">
          <p>每次最多可貼入 {{ MAX_ENTRIES }} 筆。</p>
        </li>
        <li class="my-1">
          <p>每筆金額之整數部分上限為 {{ formatNumber(MAX_AMOUNT_PER_ENTRY) }}。</p>
        </li>
        <template v-if="includesNames">
          <li class="my-1">
            <p>姓名可重複多筆，系統會自動加總（每人合計上限同為 {{ formatNumber(MAX_AMOUNT_PER_ENTRY) }}）。</p>
          </li>
          <li class="my-1">
            <p>姓名最多 {{ MAX_NAME_LENGTH }} 字；金額只能是正整數，前後只能加幣別或單位（如 NT$、元）。</p>
          </li>
        </template>
        <li v-else class="my-1">
          <p>金額只能是正整數，前後只能加幣別或單位（如 NT$、元）。</p>
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
</template>

<script setup lang="ts">
/** 首頁: the paste rules for the current data format, and tips for pasting from a CSV */
import { formatNumber } from '~/utils/format';
import { MAX_AMOUNT_PER_ENTRY, MAX_ENTRIES, MAX_NAME_LENGTH } from '~/utils/moneyParser';

const { includesNames } = defineProps<{ includesNames: boolean }>();
</script>

<style>
@reference "~/assets/css/main.css";
/* Declare Tailwind's layer order first: this stylesheet can load before main.css,
   and a layer registered early would otherwise end up below `base` (preflight). */
@layer theme, base, components, utilities;

@layer components {
  .instruction { @apply flex flex-col gap-4 text-helper; }
  .instruction ul { @apply list-decimal list-outside pl-4 text-accent; }
  .instruction .instruction--tips ul { list-style-type: 'ฅ '; }
  .instruction ul li p { @apply text-ink; }
}
</style>
