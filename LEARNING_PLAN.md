# 14-Day 實作導向學習計畫 — Nuxt 4 + Supabase

專案：貓咪現金兌換系統（以現有設計稿與規格為準）

目標
- 在兩週（14 天）內以實作為導向，完成一個可部署的 Nuxt 4 專案並串接 Supabase（Auth + Postgres + RLS），實作專案主要功能：使用者登入（Magic Link）、上傳/解析 CSV 或手動輸入、記錄每次兌換（redemptions）、並在主功能頁查看/篩選/匯出紀錄。

總時長
- 2 週，共 14 天；每日約 3.5 小時（共約 48 小時）。

每日任務與可驗收產出（對應貓咪現金兌換系統）

Day 1 — 環境與 Scaffold
- 任務：建立 Nuxt 4 專案（TypeScript）、初始化 repo、.env.example。
- 命令（範例）：
  - npx nuxi@latest init <project>
  - pnpm install
  - pnpm dev
- 可驗收：可啟動的骨架，pnpm dev 可運作，首頁呈現專案 logo/簡介頁。

Day 2 — Nuxt 核心概念
- 任務：熟悉 routes、layouts、components、SSR 與 Nitro 執行模型（Nuxt 4）。
- 可驗收：建立主功能頁路由（例如 / 或 /app）並在 dev 中可切換多個範例頁面。

Day 3 — Plugins & runtimeConfig
- 任務：實作 Supabase client plugin（plugins/supabase.client.ts）並使用 runtimeConfig 注入金鑰。
- 可驗收：在任意元件或 composable 中能透過 useNuxtApp() 取得 supabase 實例並呼叫 supabase.auth.getSession()。

Day 4 — Supabase 起步
- 任務：在 Supabase Console 建專案、建立 redemptions table（schema 見設計稿）、取得 SUPABASE_URL / SUPABASE_ANON_KEY / SERVICE_ROLE_KEY（僅 server）。
- 可驗收：提供 SQL schema 檔與 RLS policy 草案，並能用 supabase SQL editor 建表成功。

Day 5 — Auth 實作（Mail + Magic Link / Passwordless）
- 任務：依專案現有流程實作 Supabase passwordless 登入（magic link）。實作 /login 頁面與 callback 處理。登入成功後自動導向「主功能頁」而非一般 Dashboard。
- 可驗收：使用者輸入 email 收到 magic link；點擊後回到應用並建立有效 session，且被導向主功能頁（/ 或 /app），可直接使用換匯/兌換功能。

Day 6 — Composables 基礎（業務邏輯封裝）
- 任務：將專案現有 CSV 解析與面額拆解邏輯封裝為 composable（/composables/useMoneySnap.ts），保留現行規格與輸入格式。
- 可驗收：在主功能頁調用 composable 即可對上傳的 CSV 或文字欄位產生解析結果，並顯示拆解後的面額明細與總額。

Day 7 — 整合測試
- 任務：整合 UI、composable，建立簡單單元/整合測試（Vitest / Playwright）。
- 可驗收：至少一個自動化測試通過，並能在 UI 完成從上傳到解析的流程。

Day 8 — 提交流程（儲存兌換紀錄）
- 任務：實作 /redemptions/new 表單、前端驗證與 payload 準備（依設計稿欄位）。
- 可驗收：表單能產生符合 schema 的 JSON 並在 UI 顯示預覽；能提交至 server 或直接由 client 呼叫 supabase.from('redemptions').insert(...)（視 RLS 設定）。

Day 9 — Server-side endpoint（選用）
- 任務：如需 server-side 驗證或特殊流程，實作 Nitro server route（server/api/redemptions.post.ts）使用 SERVICE_ROLE_KEY 做安全寫入與額外驗證。
- 可驗收：API 能收到 payload 並在 Supabase 中建立記錄，且 API 僅在 server 可讀 service key。

Day 10 — RLS 與安全檢查
- 任務：檢驗 RLS policy、檢查是否有敏感金鑰暴露、進行基本威脅檢查（確認只能存取自己的紀錄）。
- 可驗收：列出已套用政策、檢查結果文件，並在 dev 模式下確認 unauthenticated 或不同 user 無法讀/寫他人 redemptions。

Day 11 — 部署準備
- 任務：整理 env、Secrets、build scripts、Vercel/部署設定或 Dockerfile 說明（以現有 Dockerfile 為基礎）。
- 可驗收：.env.example、部署步驟與 CI/CD 指南草稿。

Day 12 — 部署驗證
- 任務：部署至 Vercel（或透過 Docker build）並驗證 SSR 與 API；在 production 環境測試 Magic Link 與提交流程。
- 可驗收：production URL 上可完成登入並送出 redemptions。

Day 13 — 列表、分頁與匯出
- 任務：實作主功能頁的 redemptions 列表與篩選、分頁、CSV 匯出功能，並加入使用者權限檢查。
- 可驗收：使用者可在主功能頁篩選紀錄、分頁正常工作，並能匯出 CSV。

Day 14 — 收尾與文件
- 任務：撰寫 README、學習筆記、部署與運維建議、後續改進項目清單。
- 可驗收：完備的 README、操作手冊與學習報告（可供分享）。

開發與常用命令（容器或本機）

- 本機（若安裝 Node/PNPM）：
  - Node 22, pnpm@8（示例）:
    nvm install 22 && nvm use 22
    npm i -g pnpm@8
  - scaffold Nuxt 4：
    npx nuxi@latest init <project>
  - 安裝依賴與啟動：
    pnpm install
    pnpm dev
  - build / preview：
    pnpm build
    pnpm preview --hostname 0.0.0.0 --port 3000

- 在 Docker 容器內（若在容器管理 pnpm）：
  - 在容器中升級/安裝依賴與啟動（範例）：
    docker run --rm -it -v "$PWD":/workspace -w /workspace --user "$(id -u):$(id -g)" node:22-bullseye-slim bash -c "npm i -g pnpm@8 --silent && pnpm install && pnpm dev"
  - 若要 build 並以 Dockerfile 跑 production：
    docker build -t meowgic-snap:latest .
    docker run --rm -p 3000:3000 --env-file .env meowgic-snap:latest

安全與最佳實務提示
- 永遠不要在 client-side 暴露 SERVICE_ROLE_KEY。僅在 server-side（Nitro routes / CI / Docker runtime secrets）使用。
- 設定 RLS policy，確保使用者只能操作自己的 redemptions。
- .env.example 不應包含實際密鑰。

驗收標準（Summary）
- 使用者可透過 Magic Link 登入並被導向「主功能頁」，可直接使用兌換功能。
- 能在主功能頁上上傳/解析 CSV（或手動輸入），並建立 redemptions 記錄。
- 列表頁支援篩選、分頁與 CSV 匯出。
- 部署後 production URL 可正常使用（登入、提交、查詢）。

參考與資源
- Nuxt 官方：https://nuxt.com
- Supabase Docs：https://supabase.com/docs

---
Generated for: 貓咪現金兌換系統
