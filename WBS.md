# WBS — 貓咪現金兌換系統 (meowgic-snap)

## 專案技術棧

- 框架：Nuxt 4（app/ 目錄結構）
- CSS：Tailwind CSS v4（@tailwindcss/vite，使用 `@theme {}` 定義 token）
- 字體：Chiron GoRound TC（Google Fonts）
- 後端：Supabase（Auth Magic Link + Postgres + RLS）
- 部署：Cloudflare Pages（Nitro preset: cloudflare-pages）
- 套件管理：pnpm

## 格式說明

每個工作項目的規劃格式如下（可通用於所有工作項目）：

```
[類別] 工作項目名稱

Token / Interface 定義（CSS variable 結構或 TypeScript interface）
Template（HTML 結構，元件適用）
Script（props / emits / 邏輯，元件適用）
Style（CSS variables 使用方式）
Usage（使用範例）
File（檔案位置）
狀態
```

> **設計規範類**（Token）不需 Template / Script，只需 Token 結構 + File。

---

## 基礎建設

### 1. 設計規範（Design Spec）

> **Tailwind CSS v4 整合說明**
> - 需要 Tailwind utility class 的 token（顏色、字型、間距等）定義在 `@theme {}` 內。
> - 元件層級的動態 token（如 `--button-bg-color`）定義在 `:root` / `[data-theme]`，不放進 `@theme`。
> - Dark mode 用 `[data-theme="dark"]` attribute 切換，並在 Tailwind 設定 `@custom-variant`。

#### 1.1 [設計規範] Design Token — 色彩

Token 結構：
```css
/* app/assets/styles/tokens/color.css */

/* ── Light mode（橘白貓，預設）── */
:root {
  --color-bg:        #FFF4EA;   /* 柔底 soft */
  --color-surface:   #FFFFFF;   /* 卡片 surface */
  --color-accent:    #F08A4B;   /* 重點色 橘貓 */
  --color-accent-text: #E0733A; /* 重點文字（僅大字 18px+）*/
  --color-peach:     #FFD9C2;   /* 肉球 / 有數量 */
  --color-ink:       #3A2A22;   /* 主文字 / 強按鈕 / 總額卡 */
  --color-muted:     #735D50;   /* 次要文字 */
  --color-line:      #F3DCC8;   /* 框線 */
  --color-bill-chip: #FFE1CF;   /* 紙鈔數量 badge */
  --color-coin-chip: #F6EDE6;   /* 硬幣數量 badge */
  --color-warning-bg:   #FFE9E2;
  --color-warning-text: #9A3412;
  --color-danger:    #C2410C;   /* 危險按鈕 */
}

/* ── Dark mode（黑貓，登入後可切換）── */
[data-theme="dark"] {
  --color-bg:        #1C1B1F;
  --color-surface:   #2A2830;
  --color-accent:    #F2C14E;   /* 貓眼 */
  --color-accent-text: #F2C14E;
  --color-peach:     #3E3A44;   /* 兼作框線 */
  --color-ink:       #F3EEE8;
  --color-muted:     #ABA3A0;
  --color-line:      #3E3A44;
  --color-bill-chip: #4A4234;
  --color-coin-chip: #36333C;
  --color-warning-bg:   #3A2626;
  --color-warning-text: #F5B8A0;
  --color-danger:    #C2410C;
}

/* ── Tailwind v4 @theme（產生 utility class）── */
/* 放在 main.css 的 @theme {} 內 */
/*
@theme {
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-accent: var(--color-accent);
  --color-ink: var(--color-ink);
  --color-muted: var(--color-muted);
  --color-danger: var(--color-danger);
}
*/
```

Usage（Tailwind utility）:
```html
<div class="bg-primary text-primary-text">...</div>
```

Usage（CSS variable，元件 style）:
```css
.button-variant--filled.button-type--primary {
  --button-bg-color: var(--color-primary);
  --button-color: var(--color-primary-text);
}
```

File: `app/assets/styles/tokens/color.css`
狀態：⬜ 待實作

---

#### 1.2 [設計規範] Design Token — 字型

Token 結構：
```css
/* app/assets/styles/tokens/typography.css */

/*
  字體說明：目前使用 Chiron GoRound TC（已設定於 nuxt.config.ts），不更換。
  設計稿字體規格供對照：
  - 大數字/標題/按鈕：Huninn 36–44 / 28 / 18–20 / 15–16px
  - 內文：Noto Sans TC 14–15px / line-height 1.7
  - 輔助說明：Noto Sans TC 12–13px
  - 輸入框資料：IBM Plex Mono 15px
*/

/* ── Tailwind v4 @theme ── */
/*
@theme {
  --font-sans: "Chiron GoRound TC", sans-serif;  ← 已存在
  --text-xs:   0.75rem;    --text-xs--line-height: 1rem;      // 12px
  --text-sm:   0.8125rem;  --text-sm--line-height: 1.375rem;  // 13px
  --text-base: 0.875rem;   --text-base--line-height: 1.7;     // 14px
  --text-btn:  0.9375rem;  --text-btn--line-height: 1.5rem;   // 15px
  --text-lg:   1.125rem;   --text-lg--line-height: 1.75rem;   // 18px
  --text-xl:   1.25rem;    --text-xl--line-height: 1.75rem;   // 20px
  --text-2xl:  1.75rem;    --text-2xl--line-height: 2rem;     // 28px
  --text-3xl:  2.25rem;    --text-3xl--line-height: 2.5rem;   // 36px
  --text-4xl:  2.75rem;    --text-4xl--line-height: 3rem;     // 44px
}
*/

/* ── Semantic typography ── */
:root {
  --font-size-body:       0.875rem;    /* 內文 14px */
  --font-size-sub:        0.8125rem;   /* 輔助說明 13px */
  --font-size-btn:        0.9375rem;   /* 按鈕 15px */
  --font-size-card-title: 1.125rem;    /* 卡片標題 18px */
  --font-size-page-title: 1.75rem;     /* 頁面標題 28px */
  --font-size-big-num:    2.25rem;     /* 大數字 36px */
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-bold:     700;
  --line-height-body:     1.7;
}
```

File: `app/assets/styles/tokens/typography.css`
狀態：⬜ 待實作

---

#### 1.3 [設計規範] Design Token — 間距

Token 結構：
```css
/* app/assets/styles/tokens/spacing.css */

/*
  Tailwind v4 預設已有完整 spacing scale（0.5 / 1 / 2 / 4...）
  只需補充專案自訂的語意間距（元件內部 padding / gap）
*/

/* ── Tailwind v4 @theme（若有自訂間距）── */
/*
@theme {
  --spacing-1: 0.25rem;  // 4px
  --spacing-2: 0.5rem;   // 8px
  --spacing-3: 0.75rem;  // 12px
  --spacing-4: 1rem;     // 16px
  --spacing-6: 1.5rem;   // 24px
  --spacing-8: 2rem;     // 32px
  --spacing-12: 3rem;    // 48px
  --spacing-16: 4rem;    // 64px
}
*/

/* ── Semantic spacing（元件層，依設計稿）── */
:root {
  /* 元件內：8–12px */
  --space-component-inner-sm: 0.5rem;    /* 8px */
  --space-component-inner-md: 0.75rem;   /* 12px */
  /* 卡片內距：20–24px */
  --space-card-padding: 1.25rem;         /* 20px */
  --space-card-padding-lg: 1.5rem;       /* 24px */
  /* 卡片之間：14–20px */
  --space-card-gap: 0.875rem;            /* 14px */
  --space-card-gap-lg: 1.25rem;          /* 20px */
  /* 區塊之間：28px */
  --space-section-gap: 1.75rem;          /* 28px */
  /* 按鈕 */
  --space-button-sm: 0.5rem 1rem;
  --space-button-md: 0 1.5rem;           /* 主要按鈕高 50px 由 height 控制 */
  --height-button-md: 50px;
  --height-touch-min: 44px;
}
```

File: `app/assets/styles/tokens/spacing.css`
狀態：⬜ 待實作

---

#### 1.4 [設計規範] Design Token — 圓角、陰影、邊框

Token 結構：
```css
/* app/assets/styles/tokens/shape.css */

/* ── Tailwind v4 @theme ── */
/*
@theme {
  --radius-sm:   0.5rem;    // 8px  勾選框
  --radius-md:   1rem;      // 16px 明細列 / 提示
  --radius-lg:   1.25rem;   // 20px 次卡片 / 紙鈔格
  --radius-xl:   1.75rem;   // 28px 主卡片
  --radius-full: 9999px;    // 全圓 按鈕 / 輸入框 / badge / 硬幣格
}
*/

/* ── Semantic shape（依設計稿）── */
:root {
  --border-width-default: 1px;
  --border-radius-button:     9999px;   /* 全圓 */
  --border-radius-input:      9999px;   /* 全圓 */
  --border-radius-badge:      9999px;   /* 全圓 */
  --border-radius-coin:       50%;      /* 硬幣格圓形 */
  --border-radius-bill:       1.25rem;  /* 20px 紙鈔格 */
  --border-radius-detail-row: 1rem;     /* 16px 明細列 / 提示 */
  --border-radius-card-sub:   1.25rem;  /* 20–24px 次卡片 */
  --border-radius-card-main:  1.75rem;  /* 28px 主卡片 / 貓耳卡片 */

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

File: `app/assets/styles/tokens/shape.css`
狀態：⬜ 待實作

---

#### 1.5 [設計規範] Dark / Light Mode 切換機制

Token 切換策略：
- `[data-theme="dark"]` 掛在 `<html>` tag 上
- Tailwind v4 custom variant 對應 `data-theme`
- `useTheme` composable 負責切換與 localStorage 持久化

```ts
// app/composables/useTheme.ts

export const useTheme = () => {
  const theme = useState<'light' | 'dark'>('theme', () => 'light')

  const setTheme = (value: 'light' | 'dark') => {
    theme.value = value
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', value)
      localStorage.setItem('theme', value)
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  const initTheme = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
      const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setTheme(saved ?? preferred)
    }
  }

  return { theme, setTheme, toggleTheme, initTheme }
}
```

Tailwind v4 dark variant 設定（main.css）：
```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

File:
- `app/composables/useTheme.ts`
- `app/assets/styles/tokens/color.css`（dark mode token）
- `app/assets/css/main.css`（@custom-variant 設定）

狀態：⬜ 待實作

---

### 2. 介面定義（Types / Interfaces）

> **Nuxt 4 說明**：`shared/` 目錄的程式碼同時被 client 與 server 使用，型別定義放在 `shared/types/` 最適合。
> 每個元件對應一個介面檔案，介面與元件為獨立工作項目。

#### 2.1 [介面] ISkin / IIcon（通用）
```ts
// shared/types/common.ts
export interface ISkin { color?: string; bgColor?: string; borderColor?: string }
export interface IIcon { appendSize?: string; appendColor?: string; appendName?: string; prependSize?: string; prependColor?: string; prependName?: string }
```
File: `shared/types/common.ts` ／ 狀態：⬜ 待實作

#### 2.2 [介面] IButton
```ts
// shared/types/button.ts
import type { IIcon } from './common'
export interface IButton extends IIcon {
  size?: 'sm' | 'md'
  variant?: 'filled' | 'outlined' | 'text'
  type?: 'primary' | 'accent' | 'secondary' | 'danger'
  text?: string
  isShowAppendIcon?: boolean
  isShowPrependIcon?: boolean
}
```
File: `shared/types/button.ts` ／ 狀態：✅ 已規劃

#### 2.3 [介面] IBaseIcon
```ts
// shared/types/icon.ts
export interface IBaseIcon { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; color?: string }
```
File: `shared/types/icon.ts` ／ 狀態：⬜ 待實作

#### 2.4 [介面] ITypography
```ts
// shared/types/typography.ts
export interface ITypography {
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'label'
  size?: 'xs' | 'sm' | 'base' | 'btn' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  weight?: 'regular' | 'medium' | 'bold'
}
```
File: `shared/types/typography.ts` ／ 狀態：⬜ 待實作

#### 2.5 [介面] IInput
```ts
// shared/types/input.ts
export interface IInput {
  type?: 'text' | 'email' | 'number'  // 不含 password（Magic Link 登入）
  placeholder?: string; label?: string; size?: 'sm' | 'md'
  isDisabled?: boolean; isError?: boolean; errorMessage?: string
  modelValue?: string | number
}
```
File: `shared/types/input.ts` ／ 狀態：⬜ 待實作

#### 2.6 [介面] ITextarea
```ts
// shared/types/textarea.ts
export interface ITextarea {
  placeholder?: string; label?: string; rows?: number
  isDisabled?: boolean; isError?: boolean; errorMessage?: string
  modelValue?: string
}
```
File: `shared/types/textarea.ts` ／ 狀態：⬜ 待實作

#### 2.7 [介面] ISelect
```ts
// shared/types/select.ts
export interface ISelectOption { label: string; value: string | number }
export interface ISelect {
  options: ISelectOption[]; placeholder?: string; label?: string
  size?: 'sm' | 'md'; isDisabled?: boolean; modelValue?: string | number
}
```
File: `shared/types/select.ts` ／ 狀態：⬜ 待實作

#### 2.8 [介面] ICheckbox
```ts
// shared/types/checkbox.ts
export interface ICheckbox { label?: string; isDisabled?: boolean; modelValue?: boolean }
```
File: `shared/types/checkbox.ts` ／ 狀態：⬜ 待實作

#### 2.9 [介面] ICard
```ts
// shared/types/card.ts
export interface ICard {
  variant?: 'main' | 'sub'   // main=28px, sub=20px 圓角
  hasBorder?: boolean; hasShadow?: boolean; padding?: 'sm' | 'md' | 'lg'
}
```
File: `shared/types/card.ts` ／ 狀態：⬜ 待實作

#### 2.10 [介面] IModal
```ts
// shared/types/modal.ts
export interface IModal {
  isOpen: boolean; title?: string; size?: 'sm' | 'md' | 'lg'
  hasCloseButton?: boolean
  role?: 'dialog' | 'alertdialog'  // 無障礙：危險操作用 alertdialog
}
```
File: `shared/types/modal.ts` ／ 狀態：⬜ 待實作

#### 2.11 [介面] IToast
```ts
// shared/types/toast.ts
export interface IToastMessage { type: 'success' | 'warning' | 'error' | 'info'; message: string }
export interface IToast {
  messages: IToastMessage[]  // 錯誤最多顯示 5 行
  duration?: number          // 預設 2000ms（設計稿：2秒後消失）
  isVisible?: boolean
}
```
File: `shared/types/toast.ts` ／ 狀態：⬜ 待實作

#### 2.12 [介面] ILoading
```ts
// shared/types/loading.ts
export interface ILoading { size?: 'sm' | 'md' | 'lg'; overlay?: boolean }
```
File: `shared/types/loading.ts` ／ 狀態：⬜ 待實作

#### 2.13 [介面] ITable
```ts
// shared/types/table.ts
export interface ITableColumn { key: string; label: string; width?: string }
export interface ITable {
  columns: ITableColumn[]; rows: Record<string, unknown>[]
  isLoading?: boolean; emptyText?: string
}
```
File: `shared/types/table.ts` ／ 狀態：⬜ 待實作

#### 2.14 [介面] IPagination
```ts
// shared/types/pagination.ts
export interface IPagination { total: number; perPage: number; currentPage: number }
// emit: page-change(page: number)
```
File: `shared/types/pagination.ts` ／ 狀態：⬜ 待實作

#### 2.15 [介面] ICatEarCard
```ts
// shared/types/cat-ear-card.ts
export interface ICatEarCard {
  variant?: 'input' | 'total' | 'dialog'
  padding?: 'md' | 'lg'
}
// 只用在每頁最主要的 1–2 張卡片（輸入卡、總額卡、彈窗）
```
File: `shared/types/cat-ear-card.ts` ／ 狀態：⬜ 待實作

#### 2.16 [介面] IDenominationCell
```ts
// shared/types/denomination-cell.ts
export interface IDenominationCell {
  denomination: number; count: number
  type: 'bill' | 'coin'
  isHighlight?: boolean  // 數量最多的紙鈔用重點色
}
```
File: `shared/types/denomination-cell.ts` ／ 狀態：⬜ 待實作

#### 2.17 [介面] IDenominationBadge
```ts
// shared/types/denomination-badge.ts
export interface IDenominationItem { denomination: number; count: number; type: 'bill' | 'coin' }
export interface IDenominationBadge { name: string; totalAmount: number; items: IDenominationItem[] }
```
File: `shared/types/denomination-badge.ts` ／ 狀態：⬜ 待實作

---

### 3. 基礎元件（Base Components）

> 每個元件對應 Section 2 的介面工作項目，此區段只記錄元件實作（Template / Style / Usage）。

#### 3.1 [元件] 按鈕（BaseButton）
Interface: `shared/types/button.ts`（見 2.2）

Template:
```vue
<button class="button" :class="[`button-size--${size}`, `button-variant--${variant}`, `button-type--${type}`]">
  <template v-if="isShowAppendIcon"><svg class="icon-append" :class="[`icon-append__${appendSize}`, `icon-append--${appendName}`]" /></template>
  {{ text }}
  <template v-if="isShowPrependIcon"><svg class="icon-prepend" :class="[`icon-prepend__${prependSize}`, `icon-prepend--${prependName}`]" /></template>
</button>
```

Style:
```css
.button { color: var(--button-color); background-color: var(--button-bg-color); border-radius: var(--border-radius-button); min-height: var(--height-button-md); }
.button-variant--filled.button-type--primary   { --button-bg-color: var(--color-accent); --button-color: var(--color-ink); }
.button-variant--filled.button-type--accent    { --button-bg-color: var(--color-ink);   --button-color: var(--color-surface); }
.button-variant--filled.button-type--secondary { --button-bg-color: var(--color-surface); --button-color: var(--color-ink); border: 1px solid var(--color-line); }
.button-variant--filled.button-type--danger    { --button-bg-color: var(--color-danger); --button-color: #fff; }
/* TODO: outlined, text variants */
.button-size--sm { min-height: var(--height-touch-min); font-size: var(--font-size-sub); }
```

Usage:
```vue
<BaseButton variant="filled" type="primary" text="ฅ^•ﻌ•^ฅ 計算並存檔" />
<BaseButton variant="filled" type="danger"  text="刪除帳號" size="sm" />
```

File: `app/components/base/BaseButton.vue` ／ 狀態：⬜ 待實作

---

#### 3.2 [元件] 圖示（BaseIcon）
Interface: `shared/types/icon.ts`（見 2.3）

Template:
```vue
<svg class="icon" :class="`icon--${size}`" aria-hidden="true"><use :href="`/icons/sprite.svg#${name}`" /></svg>
```

Style:
```css
.icon { color: inherit; }
.icon--xs { width: 1rem; height: 1rem; }
.icon--sm { width: 1.25rem; height: 1.25rem; }
.icon--md { width: 1.5rem; height: 1.5rem; }
.icon--lg { width: 2rem; height: 2rem; }
```

Usage: `<BaseIcon name="upload" size="md" />`
File: `app/components/base/BaseIcon.vue` ／ 狀態：⬜ 待實作

---

#### 3.3 [元件] 文字（BaseTypography）
Interface: `shared/types/typography.ts`（見 2.4）

Template:
```vue
<component :is="tag" class="typography" :class="[`text-${size}`, `font-${weight}`]"><slot /></component>
```

Usage: `<BaseTypography tag="h1" size="2xl" weight="bold">儀表板</BaseTypography>`
File: `app/components/base/BaseTypography.vue` ／ 狀態：⬜ 待實作

---

#### 3.4 [元件] 輸入框（BaseInput）
Interface: `shared/types/input.ts`（見 2.5）

Template:
```vue
<div class="input-wrapper">
  <label v-if="label" class="input-label">{{ label }}</label>
  <input class="input" :class="{ 'input--error': isError }" :type="type" :placeholder="placeholder" :disabled="isDisabled" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
  <span v-if="isError && errorMessage" class="input-error-message">{{ errorMessage }}</span>
</div>
```

Style:
```css
.input { border-radius: var(--border-radius-input); border: 1px solid var(--color-line); min-height: var(--height-touch-min); background: var(--color-surface); color: var(--color-ink); }
.input--error { border-color: var(--color-danger); }
```

Usage: `<BaseInput v-model="email" type="email" placeholder="example@mail.com" />`
File: `app/components/base/BaseInput.vue` ／ 狀態：⬜ 待實作

---

#### 3.5 [元件] 文字區域（BaseTextarea）
Interface: `shared/types/textarea.ts`（見 2.6）

Template:
```vue
<div class="textarea-wrapper">
  <label v-if="label">{{ label }}</label>
  <textarea class="textarea" :class="{ 'textarea--error': isError }" :placeholder="placeholder" :rows="rows" :disabled="isDisabled" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
  <span v-if="isError && errorMessage">{{ errorMessage }}</span>
</div>
```

Style:
```css
.textarea { border-radius: var(--border-radius-detail-row); border: 1px solid var(--color-line); font-family: 'IBM Plex Mono', monospace; font-size: var(--font-size-btn); background: var(--color-surface); color: var(--color-ink); resize: vertical; }
```

Usage: `<BaseTextarea v-model="inputData" :rows="8" placeholder="喵奴才&#10;18500" />`
File: `app/components/base/BaseTextarea.vue` ／ 狀態：⬜ 待實作

---

#### 3.6 [元件] 下拉選單（BaseSelect）
Interface: `shared/types/select.ts`（見 2.7）

Template:
```vue
<div class="select-wrapper">
  <label v-if="label">{{ label }}</label>
  <select class="select" :disabled="isDisabled" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</div>
```

Style: `.select { border-radius: var(--border-radius-input); border: 1px solid var(--color-line); min-height: var(--height-touch-min); }`
Usage: `<BaseSelect v-model="mode" :options="modeOptions" />`
File: `app/components/base/BaseSelect.vue` ／ 狀態：⬜ 待實作

---

#### 3.7 [元件] 勾選框（BaseCheckbox）
Interface: `shared/types/checkbox.ts`（見 2.8）

Template:
```vue
<label class="checkbox-wrapper" :class="{ 'checkbox--disabled': isDisabled }">
  <input type="checkbox" class="checkbox" :checked="modelValue" :disabled="isDisabled" @change="$emit('update:modelValue', $event.target.checked)" />
  <span v-if="label">{{ label }}</span>
</label>
```

Style: `.checkbox { border-radius: var(--radius-sm); accent-color: var(--color-accent); width: 1.25rem; height: 1.25rem; }`
Usage: `<BaseCheckbox v-model="hasName" label="貼上資料包含姓名欄位" />`
File: `app/components/base/BaseCheckbox.vue` ／ 狀態：⬜ 待實作

---

#### 3.8 [元件] 卡片（BaseCard）
Interface: `shared/types/card.ts`（見 2.9）

Template:
```vue
<div class="card" :class="[`card-variant--${variant}`, `card-padding--${padding}`, { 'card--border': hasBorder, 'card--shadow': hasShadow }]">
  <slot />
</div>
```

Style:
```css
.card { background-color: var(--color-surface); }
.card-variant--main { border-radius: var(--border-radius-card-main); }
.card-variant--sub  { border-radius: var(--border-radius-card-sub); }
.card--border { border: 1px solid var(--color-line); }
.card-padding--md { padding: var(--space-card-padding); }
```

File: `app/components/base/BaseCard.vue` ／ 狀態：⬜ 待實作

---

#### 3.9 [元件] 對話框（BaseModal）
Interface: `shared/types/modal.ts`（見 2.10）

Template:
```vue
<Teleport to="body">
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal" :class="`modal-size--${size}`" :role="role" aria-modal="true">
      <div class="modal-header">
        <span v-if="title">{{ title }}</span>
        <button v-if="hasCloseButton" aria-label="關閉" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body"><slot /></div>
      <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
    </div>
  </div>
</Teleport>
```

Style: `.modal { background: var(--color-surface); border-radius: var(--border-radius-card-main); box-shadow: var(--shadow-lg); }`
File: `app/components/base/BaseModal.vue` ／ 狀態：⬜ 待實作

---

#### 3.10 [元件] 通知（BaseToast）
Interface: `shared/types/toast.ts`（見 2.11）

Template:
```vue
<Teleport to="body">
  <Transition name="toast">
    <div v-if="isVisible && messages.length" class="toast" :class="`toast-type--${messages[0].type}`"
      :role="['error','warning'].includes(messages[0].type) ? 'alert' : 'status'">
      <p v-for="(msg, i) in messages.slice(0, 5)" :key="i">{{ msg.message }}</p>
    </div>
  </Transition>
</Teleport>
```

Style: `.toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); border-radius: var(--border-radius-card-sub); box-shadow: var(--shadow-lg); }`
Usage: `<BaseToast :messages="[{ type: 'success', message: '領款單已複製，可以貼給銀行了喵' }]" :isVisible="show" @close="show=false" />`
File: `app/components/base/BaseToast.vue` ／ 狀態：⬜ 待實作

---

#### 3.11 [元件] 載入中（BaseLoading）
Interface: `shared/types/loading.ts`（見 2.12）

Template:
```vue
<div :class="['loading-wrapper', { 'loading-wrapper--overlay': overlay }]">
  <svg class="loading-spinner" :class="`loading-spinner--${size}`" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" class="loading-track" stroke-width="3" />
    <circle cx="12" cy="12" r="10" class="loading-arc" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="45" />
  </svg>
</div>
```

Style: `.loading-arc { stroke: var(--color-accent); } .loading-track { stroke: var(--color-line); }`
File: `app/components/base/BaseLoading.vue` ／ 狀態：⬜ 待實作

---

#### 3.12 [元件] 表格（BaseTable）
Interface: `shared/types/table.ts`（見 2.13）

Template:
```vue
<div class="table-wrapper">
  <BaseLoading v-if="isLoading" size="md" :overlay="true" />
  <table class="table">
    <thead><tr><th v-for="col in columns" :key="col.key">{{ col.label }}</th></tr></thead>
    <tbody>
      <tr v-if="!rows.length"><td :colspan="columns.length">{{ emptyText ?? '還沒有兌換紀錄喵' }}</td></tr>
      <tr v-for="(row, i) in rows" :key="i">
        <td v-for="col in columns" :key="col.key"><slot :name="col.key" :row="row">{{ row[col.key] }}</slot></td>
      </tr>
    </tbody>
  </table>
</div>
```

File: `app/components/base/BaseTable.vue` ／ 狀態：⬜ 待實作

---

#### 3.13 [元件] 分頁（BasePagination）
Interface: `shared/types/pagination.ts`（見 2.14）

Template:
```vue
<div class="pagination" role="navigation">
  <button :disabled="currentPage <= 1" @click="$emit('page-change', currentPage - 1)">‹</button>
  <button v-for="page in totalPages" :key="page" :class="{ active: page === currentPage }" :aria-current="page === currentPage ? 'page' : undefined" @click="$emit('page-change', page)">{{ page }}</button>
  <button :disabled="currentPage >= totalPages" @click="$emit('page-change', currentPage + 1)">›</button>
</div>
```

Style: `.pagination button { border-radius: var(--border-radius-badge); min-width: var(--height-touch-min); } .active { background: var(--color-accent); color: var(--color-ink); }`
File: `app/components/base/BasePagination.vue` ／ 狀態：⬜ 待實作

---

#### 3.14 [元件] 貓耳卡片（CatEarCard）
Interface: `shared/types/cat-ear-card.ts`（見 2.15）

Template:
```vue
<div class="cat-ear-card" :class="`cat-ear-card--${variant}`">
  <div class="cat-ear cat-ear--left" />
  <div class="cat-ear cat-ear--right" />
  <div class="cat-ear-card__body" :class="`cat-ear-card-padding--${padding}`"><slot /></div>
</div>
```

Style:
```css
.cat-ear-card { position: relative; background: var(--color-surface); border-radius: var(--border-radius-card-main); box-shadow: var(--shadow-md); }
.cat-ear { position: absolute; top: -12px; width: 28px; height: 28px; background: var(--color-surface); border-radius: 8px; transform: rotate(45deg); }
.cat-ear--left { left: 28px; }
.cat-ear--right { right: 28px; }
```

File: `app/components/CatEarCard.vue` ／ 狀態：⬜ 待實作

---

#### 3.15 [元件] 面額彙總格（DenominationCell）
Interface: `shared/types/denomination-cell.ts`（見 2.16）

Template:
```vue
<div class="denom-cell" :class="[`denom-cell--${type}`, { highlight: isHighlight && count > 0, 'has-count': !isHighlight && count > 0, empty: count === 0 }]">
  <span>NT${{ denomination.toLocaleString() }}</span>
  <span>{{ count }}{{ type === 'bill' ? '張' : '個' }}</span>
</div>
```

Style:
```css
.denom-cell--bill { border-radius: var(--border-radius-bill); }
.denom-cell--coin { border-radius: var(--border-radius-coin); }
.highlight  { background: var(--color-accent); color: var(--color-ink); }
.has-count  { background: var(--color-peach);  color: var(--color-ink); }
.empty      { border: 2px dashed var(--color-line); color: var(--color-muted); }
```

File: `app/components/DenominationCell.vue` ／ 狀態：⬜ 待實作

---

#### 3.16 [元件] 每筆明細 badge（DenominationBadge）
Interface: `shared/types/denomination-badge.ts`（見 2.17）

Template:
```vue
<div class="denom-badge-card">
  <div class="denom-badge-card__header">
    <span>{{ name }}</span>
    <span>{{ totalAmount.toLocaleString() }}</span>
  </div>
  <div class="denom-badge-card__items">
    <span v-for="item in items.filter(i => i.count > 0)" :key="item.denomination"
      class="denom-badge" :class="`denom-badge--${item.type}`">
      NT${{ item.denomination.toLocaleString() }} {{ item.count }}{{ item.type === 'bill' ? '張' : '個' }}
    </span>
  </div>
</div>
```

Style:
```css
.denom-badge { border-radius: var(--border-radius-badge); padding: 0.25rem 0.625rem; }
.denom-badge--bill { background: var(--color-bill-chip); }
.denom-badge--coin { background: var(--color-coin-chip); }
```

File: `app/components/DenominationBadge.vue` ／ 狀態：⬜ 待實作

---

### 4. 版面元件（Layout Components）

#### 4.1 [元件] 頁首（AppHeader）
- 已存在：`app/components/AppHeader.vue`
- 待補：dark mode 切換按鈕、登入狀態顯示（已登入顯示 email / 登出）
- 狀態：🔄 進行中

#### 4.2 [元件] 主選單（AppMenu）
- 已存在：`app/components/AppMenu.vue`
- 待補：完整導航連結（兌換計算 / 歷史紀錄 / 設定）
- 狀態：🔄 進行中

#### 4.3 [排版] 桌面版 Default Layout
- 已存在：`app/layouts/desktop/default.vue`
- 待補：dark/light mode `data-theme` 初始化、整合 useTheme
- 狀態：🔄 進行中

---

## 進階開發

### 5. 頁面（Pages）

#### 5.1 [頁面] 登入（/）
- 已存在：`app/pages/index.vue`（Magic Link 初版）
- 待補：套用 BaseInput / BaseButton 元件、UI 完善
- 狀態：🔄 進行中

#### 5.2 [頁面] 設定（/settings）
- 已存在：`app/pages/settings.vue`（空頁面）
- 待規劃：Auth callback 處理、使用者資料顯示
- 狀態：⬜ 待規劃

#### 5.3 [頁面] 主功能（兌換計算，/app 或 /exchange）
- 主要功能：CSV 上傳 / 手動輸入、面額拆解計算、結果顯示、提交儲存
- 狀態：⬜ 待規劃

#### 5.4 [頁面] 兌換紀錄列表（/redemptions）
- 分頁、篩選、CSV 匯出
- 狀態：⬜ 待規劃

#### 5.5 [頁面] 兌換紀錄細節（/redemptions/:id）
- 詳細面額拆解結果、匯出按鈕
- 狀態：⬜ 待規劃

---

### 6. 資料串接（Data / API）

#### 6.1 [API] Supabase Auth — Magic Link
- 已存在：`app/plugins/supabase.client.ts` + `app/pages/index.vue`
- 狀態：✅ 已完成（Day 5）

#### 6.2 [API] Supabase — redemptions CRUD
- 建立 table + RLS（LEARNING_PLAN Day 4）
- composable: `app/composables/useRedemptions.ts`
- 狀態：⬜ 待實作

#### 6.3 [API] CSV 解析 composable
- 已存在：`app/composables/useMoneySnap.ts`
- 狀態：🔄 進行中

---

## 工作項目統計

| 分類 | 項目數 | 狀態 |
|---|---|---|
| 設計規範（Token） | 5 | ⬜ 全部待實作 |
| 介面定義（Interfaces） | 17 | ✅ 1 / ⬜ 16 |
| 基礎元件（Base） | 13 | ⬜ 全部待實作 |
| 專案元件（CatEarCard / DenominationCell / DenominationBadge） | 3 | ⬜ 全部待實作 |
| 版面元件 | 3 | 🔄 全部進行中 |
| 頁面 | 5 | 🔄 2 / ⬜ 3 |
| 資料串接 | 3 | ✅ 1 / 🔄 1 / ⬜ 1 |
| **合計** | **49** | |

圖示說明：✅ 完成 / 🔄 進行中 / ⬜ 待實作

---

## 建議實作順序

```
1.1 → 1.2 → 1.3 → 1.4   (Design Token，先完成整套 token)
       ↓
1.5                       (Dark/Light mode composable)
       ↓
2.1 → 2.2                 (共用 Interface)
       ↓
3.2 → 3.1 → 3.3 → 3.4    (BaseIcon → BaseButton → Typography → Input...)
       ↓
4.1 → 4.2 → 4.3           (版面元件整合 token + base components)
       ↓
5.1 → 5.2 → 5.3 → ...    (頁面套用元件)
       ↓
6.2 → 6.3                 (資料串接)
```

