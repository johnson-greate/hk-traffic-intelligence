# 第 3 課：先寫測試

[← 上一課：Branch、Commit 與 Pull Request](02-branch-commit-pr.md) · [課程目錄](README.md) · [下一課：部署到 Cloudflare →](04-deploy-cloudflare.md)

## 目標

- 了解過海決策卡怎樣由一個「發現」開始
- 學會先寫測試，再寫實作
- 知道如何在本 repo 執行測試
- 明白為甚麼純函數最容易測試，以及如何把邏輯從 UI 抽出來

## 故事：頂部的數字有誤導

頂部列顯示紅隧、東隧、西隧的行車時間。開發時對照原始數據，發現每條隧道顯示的是**8 個起點之中最快的一個**，不是你所在位置的時間。例如由堅拿道天橋出發，頂部顯示紅隧 7 分鐘，實際要 13 分鐘。

這是讀代碼和數據時發現的，不是 AI 主動告訴你的。解決方法不是改頂部數字（那是原作者的設計，影響範圍大），而是加一張卡：揀起點，三條隧道由快至慢排列，標出「慢 N 分鐘」。

詳見 [PR #1](https://github.com/johnson-greate/hk-traffic-intelligence/pull/1) 和 commit [`b7f8b09`](https://github.com/johnson-greate/hk-traffic-intelligence/commit/b7f8b09)。

## 步驟

### 1. 先把規則寫成測試

動手寫 UI 之前，先用文字列出排序規則，再寫成 [`src/lib/harbour-choice.test.ts`](../../src/lib/harbour-choice.test.ts)：

| 規則 | 測試內容 |
| --- | --- |
| 由快至慢，附與最快的差距 | 東隧 8、紅隧 25 → `EH 8 +0 最快`、`CH 25 +17` |
| 沒有時間的隧道不列出 | `CH` 的時間是 `null` → 不出現 |
| 非過海路段不列出 | 代號 `XX` → 不出現 |
| 同樣快就一起標為最快 | 東隧 9、西隧 9 → 兩者都是 `fastest` |
| 沒有數據就回傳空列表 | `[]` |
| 記住的起點仍存在就用它 | 存了 `H1` → 用 `H1` |
| 否則揀能到最多隧道的起點 | 存了 `gone` 或沒有存 → 用 `H2` |

其中一段：

```ts
const east = harbourChoice(point("H11", [["CH", 25], ["EH", 8]]))
assert.deepEqual(
  east.map((row) => [row.code, row.minutes, row.delta, row.fastest]),
  [
    ["EH", 8, 0, true],
    ["CH", 25, 17, false],
  ],
)
```

此時 `harbour-choice.ts` 還未存在，執行測試一定失敗。這是正常的：你先確認測試真的會檢查到東西。

### 2. 寫最少的實作令測試通過

[`src/lib/harbour-choice.ts`](../../src/lib/harbour-choice.ts) 只有 36 行，兩個函數：

- `harbourChoice(point)`：由一個起點計出三條隧道的排序
- `pickOrigin(points, saved)`：決定預設起點

兩個都不讀 `localStorage`、不碰畫面、不發網絡請求。輸入相同，輸出就相同。

### 3. UI 只負責顯示

[`ops-hud.tsx`](../../src/components/ops-hud.tsx) 的 `HarbourCard` 讀取起點、呼叫 `harbourChoice`、把結果畫出來，並把所揀起點存入 `localStorage`（key：`harbour-origin`）。排序是否正確，已經由測試保證；UI 部分則在瀏覽器檢查（見第 2 課的 Test plan）。

### 4. 執行測試

本 repo 沒有測試框架，每個測試檔都是普通的 Node 程式，用 `node:assert` 檢查，通過時印出一行 `ok`：

```bash
node src/lib/harbour-choice.test.ts
# harbour choice ok
```

需要 Node.js 22（`node --version` 確認）。執行全部測試：

```bash
for f in src/lib/*.test.ts; do node "$f" || { echo "FAILED: $f"; break; }; done
```

`history-store.test.ts` 會印出 SQLite 的 ExperimentalWarning，可以不理。任何 `assert` 失敗都會令程式以錯誤結束，並顯示預期值與實際值。

再加上型別與 lint 檢查：

```bash
npx tsc --noEmit
npm run lint
```

### 5. 同一方法用在 PR #2

[PR #2](https://github.com/johnson-greate/hk-traffic-intelligence/pull/2) 沿用這個做法：

- [`snapshot.ts`](../../src/lib/snapshot.ts) 的 `buildSnapshot` 和 `observedEpoch` 是純函數，[`snapshot.test.ts`](../../src/lib/snapshot.test.ts) 測試香港時間轉換、四捨五入、缺失數據
- [`history-store.test.ts`](../../src/lib/history-store.test.ts) 用 Node 內置的 `node:sqlite` 跑真的 SQL，測試重複讀數會被跳過、30 日前的數據會被刪除

例如這一行確認運輸署的時間是香港時間（UTC+8），不是 UTC：

```ts
assert.equal(observedEpoch("2026-10-02 19:35:00"), Date.UTC(2026, 9, 2, 11, 35))
```

時區錯誤正是那種「看起來正常、數據悄悄錯了八小時」的 bug。

## 為甚麼純函數容易測試

| 純函數 | 混合了 UI 或 I/O 的函數 |
| --- | --- |
| 給它數據，檢查回傳值 | 要模擬瀏覽器、網絡、資料庫 |
| 幾毫秒跑完 | 慢，而且可能因為網絡而失敗 |
| 結果每次一樣 | 實時數據每分鐘都不同 |

所以寫功能時，先問：**哪部分是規則，哪部分是顯示？** 把規則抽成純函數放進 `src/lib/`，再為它寫測試。

## 常見錯誤

**先寫實作，最後才補測試。** 補寫的測試往往只是把現有輸出抄進去，代碼錯了測試也跟着錯。

**沒看過測試失敗。** 一個從來沒有失敗過的測試，可能根本沒有檢查到東西。

**把排序邏輯寫在 React component 入面。** 這樣就只能靠開瀏覽器人手測試。

**只測正常情況。** `null`、空列表、同分、非預期代號，往往才是線上出錯的地方。

**AI 說「測試通過」就相信。** 自己跑一次，看到 `ok` 才算。

## 練習

1. 執行全部測試，確認每個檔案都印出 `ok`（或沒有錯誤）。
2. 在 `harbour-choice.test.ts` 加一個測試：三條隧道都是 10 分鐘時，三者都應標為最快，並且按 `CH`、`EH`、`WH` 次序排列。先預測結果，再執行。
3. 故意把 `harbour-choice.ts` 的 `a.minutes - b.minutes` 改成 `b.minutes - a.minutes`，執行測試，看錯誤訊息怎樣顯示，然後改回。
4. 叫 Claude Code 為 `pickOrigin` 再加一個邊界情況測試，並要求它**先展示測試失敗**，再修改（如有需要）。

下一課：[部署到 Cloudflare](04-deploy-cloudflare.md)。
