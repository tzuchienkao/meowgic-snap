# 資料庫規劃：兌換紀錄（Supabase）

> 狀態：**已建立，首頁、儀表板、紀錄頁都已串接**（見第 8 節）。決定事項見第 6 節；建立用的 SQL 在 `supabase/migrations/`（見第 7 節）。

## 1. 目標

會員每次在首頁計算，就存成一筆「兌換紀錄」，供以下畫面使用：

| 畫面 | 需要的資料 / 操作 |
|---|---|
| 首頁 | 會員按「計算並存檔」時新增一筆紀錄 |
| 儀表板 | 累計兌換總金額、開始累計日期、近 6 個月每月金額、各面額累計數量、最近幾次兌換 |
| 紀錄 | 依查詢區間（近 1 個月 / 近 3 個月 / 近半年）列出紀錄、分頁（每頁 50 筆，最多 500 筆）、改名、這次要準備的現金、匯出這筆 CSV、匯出這個區間 CSV |

訪客的資料不會存到資料庫，維持只在瀏覽器裡。

## 2. 資料表：`public.records`

一筆紀錄 = 一次計算。

| 欄位 | 型別 | 必填 | 預設值 | 限制 | 用途 |
|---|---|---|---|---|---|
| `id` | `uuid` | ✓ | `gen_random_uuid()` | primary key | 紀錄識別 |
| `user_id` | `uuid` | ✓ | `auth.uid()` | 外鍵 → `auth.users.id`，刪除帳號時一起刪除 | 紀錄屬於誰 |
| `name` | `text` | ✓ | — | 1–20 字 | 紀錄名稱，預設「YYYY/MM/DD 兌換」（前端產生，見第 6 節），可在紀錄頁改名 |
| `input_format` | `text` | ✓ | — | `name_amount` 或 `amount` | 貼上的資料格式：`name_amount` 姓名＋金額 / `amount` 純金額 |
| `entry_count` | `integer` | ✓ | — | 1–1000 | 筆數 |
| `total_amount` | `bigint` | ✓ | — | ≥ 0 | 總金額（1,000 筆加總可能超過 `integer` 上限） |
| `denominations` | `integer[]` | ✓ | — | — | 這次啟用的面額，決定 CSV 欄位 |
| `denomination_counts` | `jsonb` | ✓ | — | — | 各面額張數 / 個數，例如 `{"1000": 3, "100": 2}` |
| `rows` | `jsonb` | ✓ | — | — | 每筆明細，例如 `[{"name": "張三", "total": 18500}]`；`amount` 格式沒有姓名，`name` 存解析時給的「第 N 筆」（例如 `"第 3 筆"`），明細和 CSV 直接顯示 |
| `created_at` | `timestamptz` | ✓ | `now()` | — | 計算時間，排序與查詢區間；保存 2 年也以它計算 |
| `updated_at` | `timestamptz` | ✓ | `now()` | 修改時由 trigger 自動更新 | 最後修改時間（例如改名） |

### 為什麼這樣設計

- **明細用 `jsonb` 存在同一筆紀錄裡**：紀錄頁一次讀一筆就能顯示和匯出，寫入也只要一次。缺點是跨紀錄查詢（例如「張三總共領多少」）不方便，目前沒有這個需求。
- **存 `denomination_counts`，不在讀取時重算**：當時啟用的面額可能之後被改掉，存結果才能還原當時的狀況，儀表板也能直接加總。
- **存 `denominations`**：匯出 CSV 時欄位要和當時一致，例如當時沒啟用 NT$2000 就不該出現那一欄。
- **`input_format` 用 `text` + check，不用 boolean**：之後如果多了新的格式（例如「編號＋金額」），只要改 check 加一個值，不用改欄位型別或搬資料；在 Table Editor 也直接看得懂。前端對應字串 enum：

  ```ts
  export enum InputFormat {
    NameAndAmount = 'name_amount',
    AmountOnly = 'amount',
  }
  ```

  前端其他地方（偏好設定、解析器、CSV 匯出）仍用 `includesNames: boolean`，只在存檔和讀取紀錄時轉換一次。
- **`updated_at` 由 trigger 更新**：`default now()` 只在新增時生效，所以用 Supabase 內建的 `moddatetime` 擴充套件，在每次 update 時自動填入當下時間，前端改名時不用自己帶。保存期限仍看 `created_at`，改名不會讓保存期限重新起算。

## 3. 權限（RLS）

前端使用公開的 anon key，因此**一定要開 Row Level Security**，每個會員只能存取自己的紀錄。

| 操作 | 誰可以 | 條件 |
|---|---|---|
| 讀取 select | 登入的會員 | `auth.uid() = user_id`，且 `created_at` 在 2 年內 |
| 新增 insert | 登入的會員 | `auth.uid() = user_id` |
| 修改 update（改名） | 登入的會員 | `auth.uid() = user_id`，且 `created_at` 在 2 年內 |
| 刪除 delete | 登入的會員 | `auth.uid() = user_id` |

訪客（`anon`）沒有任何權限。

RLS 決定能動哪幾列，欄位權限決定能動哪些欄位（[`20261128000000_harden_records.sql`](../supabase/migrations/20261128000000_harden_records.sql)）：

- 修改只開放 `name`（前端只有改名），不能改金額、明細或 `created_at`。
- 新增不能指定 `id`、`user_id`、`created_at`、`updated_at`，一律用預設值，所以無法把日期改到未來來躲過 2 年的保存期限。
- `denominations` 最多 10 種；`rows` 必須是陣列、筆數介於 1 和 `entry_count` 之間，且大小有上限，避免有人繞過前端直接呼叫 API 塞入大量資料。

「2 年內」寫在 RLS 裡，而不是只寫在前端的查詢條件：這樣不管從哪裡查（包括直接呼叫 Supabase API），都拿不到超過 2 年的紀錄，前端也不會因為漏寫條件而顯示出來。

## 4. 常用查詢與索引

| 查詢 | 用在 |
|---|---|
| 自己的紀錄，依 `created_at` 新到舊，前 5 筆 | 儀表板「最近幾次兌換」 |
| 自己的紀錄，`created_at` 在某區間內，分頁 | 紀錄頁 |
| 全部紀錄的 `total_amount` 加總、最早的 `created_at` | 儀表板累計總額、開始累計日期 |
| 近 6 個月依月份加總 `total_amount`（以台灣時間 `Asia/Taipei` 分月） | 儀表板每月金額趨勢 |
| 全部紀錄的 `denomination_counts` 依面額加總 | 儀表板各面額累計 |

- 索引：`(user_id, created_at desc)`，涵蓋以上所有「某人、依時間」的查詢。
- 儀表板的彙總做成 SQL 函式 `get_dashboard_summary()`（RPC，以呼叫者身分執行，仍受 RLS 保護），一次回傳 `IDashboardData` 需要的全部資料，前端只要呼叫一次。格式見 `app/types/dashboard.ts`。沒有紀錄時 `startedAt` 為 `null`、總額 0、清單為空，近 6 個月仍各回傳 0。只有登入的會員能呼叫。

## 5. 保存期限與個資

- **保存 2 年：排程刪除 + 查詢時過濾**，兩層一起用：
  - **pg_cron 排程**：每天台灣時間 03:00 刪除 `created_at` 超過 2 年的紀錄，讓資料真的消失。這解決兩個問題：資料只增不減會吃掉 Supabase 免費方案的 500 MB 儲存空間（每筆紀錄含 `rows`，1,000 筆明細約幾十 KB）；以及畫面寫「保存 2 年」但個資其實一直留著（個資法要求期限屆滿時刪除，外洩時影響範圍也較小）。
  - **RLS 過濾**（見第 3 節）：排程一天只跑一次，剛滿 2 年、還沒被刪的紀錄也不會被讀到。
  - 排程以資料庫管理者身分執行，不受 RLS 限制，所以能刪到所有人的舊紀錄。
  - 免費方案的專案**一週沒有使用會被暫停**，暫停期間排程不會執行；恢復後下一次執行就會把累積的舊紀錄一起刪掉，RLS 也會先擋住，不影響使用。
- **不是會計憑證**：商業會計法規定會計憑證至少保存 5 年、帳簿和財務報表至少保存 10 年，但這是**使用者自己的公司**要保存的正式紀錄，不是這個工具的責任。這裡的紀錄只是方便回頭查看的計算結果，2 年就夠了。建議在紀錄頁註明「這不是會計憑證，需要留存請匯出 CSV 自行保存」。實際的留存規定請以會計師的意見為準。
- **個資**：`rows` 會存到別人的姓名和金額（例如員工薪資），靠 RLS 保護。會員按「計算並存檔」的地方要加一行說明，例如「計算結果（含姓名與金額）會存在雲端 2 年，只有你看得到」。
- **刪除帳號**：`user_id` 設了 `on delete cascade`，帳號刪除時紀錄會一起刪除。

## 6. 決定事項

- [x] **紀錄名稱的預設值**：「YYYY/MM/DD 兌換」，日期用台灣時間，例如「2026/11/26 兌換」。由前端在存檔時產生，資料庫不設預設值。
- [x] **存每筆明細（`rows`）**：存，並在「計算並存檔」附近加說明提醒（見第 5 節）。
- [x] **分批計算（超過 1,000 筆）**：每一批各存成一筆紀錄。
  - 名稱加上批次：第 1 批「2026/11/26 兌換」，第 2 批起「2026/11/26 兌換 #2」。到第 999 批也只有 18 字，符合 `name` 的 20 字限制。
- [x] **2 年保存的做法**：pg_cron 每天刪除超過 2 年的紀錄，RLS 同時擋住超過 2 年的紀錄（見第 5 節）。

## 7. 建立用 SQL

SQL 存在專案的 `supabase/migrations/`（Supabase CLI 預設讀取的位置；目前沒有用 CLI，檔案作為紀錄，實際貼到 SQL Editor 執行）。檔名前面的時間戳記就是執行順序：

1. [`20261126000000_create_records.sql`](../supabase/migrations/20261126000000_create_records.sql)：資料表、`updated_at` trigger、索引、RLS。
2. [`20261126000100_schedule_delete_old_records.sql`](../supabase/migrations/20261126000100_schedule_delete_old_records.sql)：啟用 `pg_cron`，建立每天刪除超過 2 年紀錄的排程。要在第 1 份之後執行，因為它會刪 `records` 的資料。
3. [`20261127000000_create_dashboard_summary.sql`](../supabase/migrations/20261127000000_create_dashboard_summary.sql)：儀表板彙總函式 `get_dashboard_summary()`。
4. [`20261128000000_harden_records.sql`](../supabase/migrations/20261128000000_harden_records.sql)：欄位權限（修改只能改名、新增不能指定日期）與資料大小限制。

之後要修改資料庫（例如加欄位、改排程時間），不要改已經執行過的檔案，而是新增一份時間戳記更晚的 migration。

## 8. 實作順序

全部已完成：

1. 建立 `records` 資料表、RLS 與排程刪除（本文件第 7 節）。
2. 首頁存檔：新增 `app/utils/records.ts` 的 `insertRecord()`，會員計算成功後呼叫（分批時每一批呼叫一次，名稱加上批次）；「計算並存檔」附近加上存在雲端的說明。
3. 儀表板：執行彙總函式的 migration；`app/utils/records.ts` 新增 `fetchDashboard()`（`supabase.rpc('get_dashboard_summary')`），把 `app/composables/useDashboard.ts` 的假資料換成它的結果（`useAsyncData`，伺服器渲染時就抓好）。沒有紀錄時顯示插畫佔位的空狀態。
4. 紀錄頁：查詢區間、分頁、改名、匯出 CSV，註明「這不是會計憑證」。`app/utils/records.ts` 的 `fetchRecordList()`（目前這一頁的摘要欄位和總筆數）、`fetchRecord()`（整筆紀錄）、`updateRecordName()`、`fetchRangeRecords()`（匯出區間用，不含 `rows`）；列表 `useRecords` 和明細 `useRecordDetail` 各自用 `useAsyncData`，頁面先等列表再等明細。
5. 會員頁的權限：訪客打開儀表板、紀錄、設定頁時導回首頁（`app/middleware/auth.global.ts`）。資料本身仍由 RLS 保護，這只是讓訪客不會看到空的會員頁。
