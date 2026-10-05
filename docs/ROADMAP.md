# 改善計劃

目標：令香港智慧城市交通情報網更易用，視覺衝擊力更強，亦作為 AI Trade Training Course 學員練習 Vibe Coding 和 GitHub 操作的教材。

每一項以獨立 branch 開發，經 Pull Request merge 入 `main`。

狀態：✅ 已完成 · ⬜ 未開始

## 第一階段：快速見效

| 狀態 | 項目 | 內容 | 工作量 | PR |
| --- | --- | --- | --- | --- |
| ✅ | 天空霧化 | 地圖傾斜時，地平線以上不再是一片黑，改為深藍至青色的夜空漸變，轉換底圖後仍然保留 | 細 | [#1](https://github.com/johnson-greate/hk-traffic-intelligence/pull/1) |
| ✅ | 過海決策卡 | 按頂部的紅隧、東隧或西隧開啟。揀選起點後，三條隧道由快至慢排列，標示「最快」及「慢 N 分鐘」，並記住所揀起點 | 細 | [#1](https://github.com/johnson-greate/hk-traffic-intelligence/pull/1) |

## 第二階段：基建

| 狀態 | 項目 | 內容 | 工作量 | PR |
| --- | --- | --- | --- | --- |
| ✅ | 快照存儲 | Cloudflare Cron 每 5 分鐘把全城車速、各路段車速和過海時間存入 D1，保留 30 日；`/api/history` 讀取最近 48 小時。2026-10-02 22:35 起在線上累積數據。⚠️ 免費計劃 CPU 上限令 Cron 間歇失敗，數據有斷開，見已知問題 | 中 | [#2](https://github.com/johnson-greate/hk-traffic-intelligence/pull/2) |
| ⬜ | 「比平時」基準 | 以歷史快照計算同一時段的正常值，顯示「比平時慢 40%」。需要先累積一至兩星期數據 | 中 | |
| ⬜ | 24 小時回放 | 時間軸 slider，播放全城交通變化。需要先累積 24 小時數據 | 中至大 | |

## 第三階段：視覺升級

| 狀態 | 項目 | 內容 | 工作量 | PR |
| --- | --- | --- | --- | --- |
| ⬜ | 車流粒子強化 | 代碼已有粒子動畫，可再按探測器車流量調整密度，令擠塞路段一眼看出 | 中 | |
| ⬜ | 雨區雷達疊層 | 疊上天文台雷達圖，配合黃雨、紅雨時看到雨帶與擠塞的關係 | 中 | |
| ✅ | 日夜光影 | 天空顏色按香港的太陽高度轉變：夜（≤ −6°）、黃昏暖色地平線、日間藍天，平滑過渡，每 5 分鐘更新 | 細 | [#4](https://github.com/johnson-greate/hk-traffic-intelligence/pull/4) |
| ⬜ | 大屏／簡報模式 | 全螢幕自動巡航熱點，配字幕，適合展覽、大堂和課堂示範 | 中 |

## 第四階段：易用性

| 狀態 | 項目 | 內容 | 工作量 | PR |
| --- | --- | --- | --- | --- |
| ⬜ | 「我附近」 | GPS 定位，顯示最近港鐵站及巴士站的下一班車 | 中 | |
| ⬜ | 我的常用 | 收藏常用隧道、口岸、巴士站，開啟即見 | 細 | |
| ✅ | 手機版重新排版 | 手機闊度下圖層按鈕收入「圖層」一粒掣，情報面板坐在其上，不再重疊；桌面版不變 | 中 | [#5](https://github.com/johnson-greate/hk-traffic-intelligence/pull/5) |
| ⬜ | 分享連結與 PWA | 位置和圖層寫入 URL；可加到主畫面；八號風球或隧道擠塞時推送通知 | 中 | |

## 教學與工程

| 狀態 | 項目 | 內容 | PR |
| --- | --- | --- | --- |
| ✅ | 老師參考教材 | `docs/teacher/`：五課，由 PR #1、#2 的真實經過寫成（fork、branch／PR、先寫測試、部署、向 Claude Code 下指示） | [#3](https://github.com/johnson-greate/hk-traffic-intelligence/pull/3) |
| ✅ | CI | GitHub Actions `checks`：每個 PR 跑 lint、typecheck、`npm test` | [#6](https://github.com/johnson-greate/hk-traffic-intelligence/pull/6) |
| ✅ | Cron 診斷 | 快照每步計時、60 秒上限，失敗時寫 log；找出斷開原因是免費計劃 CPU 上限 | [#7](https://github.com/johnson-greate/hk-traffic-intelligence/pull/7) |
| ✅ | Lint 忽略打包輸出 | 部署後 `npm run lint` 不再掃 `.cloudflare/` | [#8](https://github.com/johnson-greate/hk-traffic-intelligence/pull/8) |

## 第五階段：AI 功能

| 狀態 | 項目 | 內容 | 工作量 | PR |
| --- | --- | --- | --- | --- |
| ✅ | AI 城市簡報 | 右上角卡片，一至三句講全城交通（繁／簡／英）。DeepSeek 主力、Claude Haiku 4.5 後備；每 15 分鐘一次、全體訪客共用。經 `SELF` binding 讀數據以避開免費計劃子請求上限 | 中 | [#13](https://github.com/johnson-greate/hk-traffic-intelligence/pull/13)、[#14](https://github.com/johnson-greate/hk-traffic-intelligence/pull/14)、[#15](https://github.com/johnson-greate/hk-traffic-intelligence/pull/15)、[#16](https://github.com/johnson-greate/hk-traffic-intelligence/pull/16) |
| ✅ | 自然語言問答 | AI 簡報卡內的「問 AI」：只用即時數據回答，附引用的事實；程式核對引文、Jev（TypeSafe）核對有沒有額外說法；拒答無關或數據沒有的問題 | 大 | [#20](https://github.com/johnson-greate/hk-traffic-intelligence/pull/20) |

## 部署

- 網站：https://traffic.resource.hk（Cloudflare 公司帳號 Brian@greate.com.hk's Account，Workers Paid；後備網址 https://hktraffic.brian-361.workers.dev）
- 部署：`CLOUDFLARE_ACCOUNT_ID=<帳號 ID> npm run deploy:vinext`，需要先 `npx cf auth login`。D1 database 會在第一次部署時自動建立
- 本地測試歷史數據要用 `npm run dev:vinext`（port 4318）
- `main` 受 ruleset `protect-main` 保護：禁止刪除、禁止 force push，PR 須通過 CI `checks` 才可 merge；所有改動（包括文件）都經 PR

## 已知問題

開發過程中發現，未處理：

- 頂部隧道時間顯示的是 8 個起點之中最快的一個，並非用戶所在位置的時間。過海決策卡已提供逐個起點的時間，頂部數字本身未改。
- 開放數據沒有隧道收費金額，所以決策卡未包括收費。如要加入，需要以運輸署公布的分時收費表為準。
- 天空與地面交界是一條硬邊。霧化需要 3D 地形才能柔化，而地圖目前關閉了地形。
- `traffic.resource.hk` 未綁定。`resource.hk` 在另一個 Cloudflare 帳號，該帳號未有 Workers 權限；Worker 與域名須在同一帳號。
- **Cloudflare 免費計劃 CPU 上限（每次 10 ms）不足。** 2026-10-03 用 `wrangler tail` 證實：每次快照 Cron 用 110–210 ms CPU，會間歇以 `exceededCpu` 被停止，數據因此斷開幾個鐘；訪客請求亦一樣，約一小時內有 75 次失敗（九巴、城巴、快拍最多）。決定：暫時維持免費計劃，接受斷續。升級 Workers Paid（US$5／月，CPU 上限 30 秒）即可解決，無需改程式。回放會有空檔，「比平時」需要累積更長時間。
- 英文介面在手機闊度下，頂部語言切換按鈕右邊被裁走少許（原有問題）。
- 免費計劃：交通 JSON 間中喺傳送途中被截斷（`Unterminated string in JSON at position …`），係 CPU 超標被 Cloudflare 停止，非程式錯誤；升級 Workers Paid 可解決（需老闆批）。
- 已向原作者提交 4 個 PR（keithligh/hk-traffic-intelligence #3 至 #6），截至 2026-10-03 晚未有回覆。
