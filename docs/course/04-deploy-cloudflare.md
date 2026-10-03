# 第 4 課：部署到 Cloudflare

[← 上一課：先寫測試](03-test-first.md) · [課程目錄](README.md) · [下一課：怎樣向 Claude Code 下指示 →](05-prompting-claude-code.md)

## 目標

- 分清楚兩個本地開發伺服器，知道何時用哪一個
- 明白 [PR #2](https://github.com/johnson-greate/hk-traffic-intelligence/pull/2) 的 Cron 與 D1 如何運作，並在本地觸發 Cron
- 部署到 Cloudflare，避開本項目踩過的每一個坑
- 部署後在線上核實，而不是看到第一個綠色剔號就收工

## 兩個本地開發伺服器

| 指令 | 埠 | 運行環境 | 有 D1 和 Cron 嗎 |
| --- | --- | --- | --- |
| `npm run dev` | 4317 | Node.js（Next.js） | 沒有 |
| `npm run dev:vinext` | 4318 | workerd（Cloudflare 的 Worker 運行環境） | 有，本地模擬 |

一般改 UI 用 `npm run dev` 已足夠。凡是涉及 Cloudflare binding（D1、Cron）的功能，就要用 `npm run dev:vinext`。在 `npm run dev` 下，`/api/history` 會回傳 503，並提示改用 `dev:vinext`，這是刻意設計的。

## Cron 與 D1 如何運作

[`cloudflare.config.ts`](../../cloudflare.config.ts) 宣告了三件事：

```ts
entrypoint: "./src/worker.ts",
triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })],
env: {
  ASSETS: bindings.assets(),
  DB: bindings.d1({ name: "hktraffic-history" }),
},
```

[`src/worker.ts`](../../src/worker.ts) 包住原有的網站 fetch handler，再加一個 `scheduled`。每 5 分鐘：

1. 以內部 request 讀取網站自己的 `/api/traffic` 和 `/api/approaches`，所以快照與地圖顯示的完全一致
2. `buildSnapshot` 組成一行：平均車速、各等級數目、過海時間、約 4,200 段路的車速
3. 以讀數時間 `ts` 為鍵 `INSERT OR IGNORE`，重複讀數會被跳過
4. 刪除 30 日前的數據

分成兩個 commit：[`21df221`](https://github.com/johnson-greate/hk-traffic-intelligence/commit/21df221)（Cron 與存儲）和 [`c144de9`](https://github.com/johnson-greate/hk-traffic-intelligence/commit/c144de9)（`/api/history`）。

## 步驟

### 1. 本地測試 Cron

```bash
npm run dev:vinext
```

另開一個終端機，手動觸發 Cron：

```bash
curl -X POST "http://localhost:4318/cdn-cgi/local/explorer/api/local/scheduled?worker=hktraffic" \
  -H 'Content-Type: application/json' -d '{"cron":"*/5 * * * *"}'
```

然後讀回數據：

```bash
curl "http://localhost:4318/api/history?hours=1"
```

應該見到一行快照。立即再觸發一次，行數不變（重複讀數被跳過）。部署前用 `npm run build:vinext` 確認可以打包。

### 2. 登入

**`wrangler` 和 `cf` 是兩套獨立的登入。** 本項目用 `cf` 部署，所以要：

```bash
npx cf auth login
```

瀏覽器會打開 Cloudflare 的授權頁。注意兩點：

- **只剔選你需要的那一個帳號**，不要選「所有帳號」。授權範圍愈大，令牌外洩時損失愈大。
- 授權後瀏覽器會跳到一個 `localhost` 的 callback 網址，**必須由仍在運行的 `cf auth login` 程序接收**。如果程序已經停止，把 callback 網址複製貼到終端機是沒有用的，要重新執行登入。

`wrangler tail`、`wrangler d1 execute` 這些指令用 `wrangler` 自己的登入（`npx wrangler login`），與 `cf` 無關。

### 3. 準備 workers.dev 子域名

新的 Cloudflare 帳號未必有 workers.dev 子域名。第一次部署前，在 Cloudflare dashboard 的 **Workers & Pages** 註冊一個（本項目是 `johnson-greate`），網站網址就是 `https://<worker 名>.<子域名>.workers.dev`。

### 4. 部署

```bash
git switch main
git pull
CLOUDFLARE_ACCOUNT_ID=<你的帳號 ID> npm run deploy:vinext
```

- 帳號 ID 在 Cloudflare dashboard 可以找到。它不是密碼，但也不要寫進公開 repo，用環境變數傳入。
- D1 database `hktraffic-history` 由第一次部署自動建立，不用先執行 `wrangler d1 create`。PR #2 寫測試計劃時未確定這一點，所以列為「部署時檢查」，部署後才剔選。
- 部署時會印出「Cannot connect to the Docker daemon」。本項目沒有用 container，可以不理。

### 5. 在線上核實

部署成功後，新子域名的 TLS 證書大約要一分鐘才生效。期間打開網站可能出現證書錯誤，等一陣再試，不要急着改設定。

然後逐項核實：

```bash
curl "https://<你的網址>/api/history?hours=1"            # 等 5 至 10 分鐘，應有新行
npx wrangler tail hktraffic --format json                   # 看每次 Cron 的 outcome
npx wrangler d1 execute hktraffic-history --remote \
  --command "SELECT COUNT(*) FROM snapshots"                # 數據行數
```

表名 `snapshots` 定義在 [`history-store.ts`](../../src/lib/history-store.ts) 的 schema。

## 上線後的教訓：Cron 間歇被取消

上線當晚確認寫入了兩行，一切看似正常。翌日早上收尾檢查時，用 `/api/history?hours=48` 數一數：由 22:35 至 10:12 應有約 140 行，實際只有 43 行，中間斷了三段，每段兩至三個鐘。

`wrangler tail` 捕捉到一次失敗：

```text
outcome: canceled   cpuTime: 8 ms   wallTime: 200086 ms
```

CPU 只用了 8 毫秒，卻等了 200 秒才被取消，即是卡在等待 I/O，而不是運算超時。當時的處理方法：

- 先把觀察寫進 [handover](../handover/handover_20261003_1030.md) 和 [ROADMAP](../ROADMAP.md) 的已知問題
- 提出假設（`src/lib/upstream.ts` 的共用 in-flight promise），但**不憑未證實的假設改代碼**
- 下一步是先加每個步驟的計時 log 和 timeout，部署後再觀察，以獨立 PR 修正

這就是「部署成功」與「功能正常運作」的分別。

## 常見錯誤

**以為登入了 `wrangler` 就可以用 `cf` 部署。** 兩者分開，各自登入。

**把 OAuth callback 網址貼到終端機。** 沒有程序在聽就沒有用，重新執行登入。

**OAuth 授權時剔選所有帳號。** 只選需要的那一個。若已經多選，到該帳號的 **My Profile → Access Management → Connected Applications** 撤銷。

**想綁定不在同一帳號的自訂域名。** Worker 和域名必須在同一個 Cloudflare 帳號。本項目原想用另一個帳號下的域名，但在那個帳號只有 DNS 權限，沒有 Workers 權限，部署回傳 403，最後改用 workers.dev 子域名。

**新網址打不開就以為部署失敗。** 先等一分鐘讓 TLS 生效。

**看到第一行數據就宣佈完成。** 隔幾個鐘、隔一晚再數一次行數，對比預期值。

**用 `npm run dev` 測 D1 功能。** 只有 `npm run dev:vinext` 有 binding。

## 練習

1. 執行 `npm run dev:vinext`，手動觸發 Cron 兩次，用 `/api/history` 確認只有一行。
2. 計算：每 5 分鐘一行，24 小時應有幾行？30 日呢？對照 PR #2 描述中的數字。
3. （可選，需要 Cloudflare 帳號）把你的 fork 部署到自己的 workers.dev，一小時後數一數行數，與預期比較，記錄差距。
4. 讀 [`handover_20261003_1030.md`](../handover/handover_20261003_1030.md)，用三句話向同學解釋為何 CPU 8 毫秒卻被取消。

下一課：[怎樣向 Claude Code 下指示](05-prompting-claude-code.md)。
