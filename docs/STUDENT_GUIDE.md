# 學員指南：在自己電腦運行交通情報網，並回報問題

這份指南給 AI Trade Training Course 的同學。不需要寫過程式，跟着做就可以。

你會做三件事：

1. 把這個項目下載到自己電腦
2. 在自己電腦運行它，用瀏覽器打開
3. 試用，發現問題或有建議時，在 GitHub 開一個 issue 告訴老師

全程大約 20 分鐘。

## 準備

- 一部 Mac 或 Windows 電腦，最少 **2 GB** 空位
- Google Chrome 瀏覽器
- 一個 GitHub 帳號（只有開 issue 才需要，可以在 <https://github.com/signup> 免費開）

## 第 1 步：安裝 Node.js

Node.js 是運行這個網站需要的程式，只需安裝一次。

1. 打開 <https://nodejs.org/>
2. 下載 **v22** 版本的安裝程式（如首頁不是 v22，按「Download」頁面選 v22）
3. 打開下載的檔案，一直按「繼續」或「Next」完成安裝

## 第 2 步：下載項目

1. 打開 <https://github.com/johnson-greate/hk-traffic-intelligence>
2. 按綠色的 **Code** 按鈕，再按 **Download ZIP**
3. 把下載的 ZIP 檔解壓，會得到一個叫 `hk-traffic-intelligence-main` 的資料夾。建議放在「文件」或桌面

> 已經懂得用 git？也可以 `git clone https://github.com/johnson-greate/hk-traffic-intelligence.git`，效果一樣。

## 第 3 步：在資料夾打開終端機

終端機是一個輸入指令的視窗。你只需要輸入兩行指令。

**Mac**

1. 打開「終端機」（Terminal）：按 `⌘ + 空白鍵`，輸入「終端機」或 `Terminal`，按 Enter
2. 輸入 `cd`，再按一下空白鍵（不要按 Enter）
3. 把 `hk-traffic-intelligence-main` 資料夾**拖入**終端機視窗，然後按 Enter

**Windows**

1. 在檔案總管打開 `hk-traffic-intelligence-main` 資料夾
2. 按一下上方的網址列，輸入 `cmd`，按 Enter

先檢查 Node.js 已安裝好。輸入以下指令，按 Enter：

```
node -v
```

看到 `v22` 開頭的數字（例如 `v22.22.0`）就對了。

## 第 4 步：安裝並運行

輸入以下指令，按 Enter：

```
npm install
```

這一步會下載網站需要的套件，大約 1 至 3 分鐘。看到很多文字和黃色的 `warn` 是正常的。完成後會回到可以輸入的狀態，最後幾行有 `added ... packages`。

然後輸入：

```
npm run dev
```

看到 `✓ Ready` 就成功了。打開 Chrome，前往：

**<http://localhost:4317>**

你應該會看到香港的衛星地圖，上方有紅隧、東隧、西隧的行車時間。

- **終端機視窗不要關閉**，關了網站就會停止
- 想停止網站：在終端機按 `Ctrl + C`
- 下次再用：重複第 3 步，然後只需輸入 `npm run dev`

### 捷徑：請 AI 代勞

如果你在用 AI Agent（例如課堂上的 Agent），可以把以下文字貼給它：

```
請幫我在這部電腦運行 https://github.com/johnson-greate/hk-traffic-intelligence 。
先檢查有沒有安裝 Node.js v22，沒有就告訴我怎樣裝。
然後下載項目、執行 npm install 和 npm run dev，
完成後告訴我要打開哪個網址。每一步先解釋，再執行。
```

AI 說完成之後，**自己打開網址確認**真的看到地圖，才算完成。

## 第 5 步：試用

可以試試這些：

- 按頂部的 **繁 / 简 / EN** 切換語言
- 按頂部的 **起點**，揀一個路口，看三條隧道由那裏出發各要幾多分鐘
- 在右上角的 **AI 簡報** 下面問一條交通問題，例如「羅湖使唔使排隊？」，再按 **根據** 看 AI 用了哪些數據（在自己電腦運行時，需要老師提供的 AI key 才會出現）
- 按下方的圖層按鈕（港鐵、輕鐵、九巴等），開關不同資料
- 按地圖上的點，看看彈出的資料
- 想在手機試：用手機打開網上版 <https://traffic.resource.hk>（電腦上運行的版本只能在同一部電腦打開）

留意任何奇怪的地方：數字不合理、按了沒反應、畫面重疊、文字錯誤、載入很慢等。

## 第 6 步：開 issue 告訴老師

Issue 是 GitHub 上的「問題單」。老師會在上面回覆你。

1. 登入 GitHub，打開 <https://github.com/johnson-greate/hk-traffic-intelligence/issues>
2. 按綠色的 **New issue**
3. 選 **🐛 報告問題**（有東西壞了）或 **💡 建議**（想改善某處）
4. 按表格填寫。**截圖可以直接拖入文字框**
5. 按 **Create**

寫得好的 issue，老師才能找到問題：

| 不夠清楚 | 清楚 |
| --- | --- |
| 「隧道時間壞了」 | 「起點選『東區走廊西行近鯉景灣』後，西隧顯示「無」。我用 Mac + Chrome。附截圖。」 |
| 「很慢」 | 「第一次打開要等大約 30 秒地圖才出現，之後就正常。用 Windows 11 + Chrome。」 |

**之後會怎樣？** 老師回覆或處理好後，GitHub 會寄電郵通知你。Issue 顯示紫色的 **Closed** 代表已處理。

## 常見問題

**輸入 `npm` 或 `node` 後顯示「command not found」或「不是內部或外部命令」**
Node.js 未裝好，或者終端機是在安裝前打開的。重新安裝 Node.js，**關掉終端機再開一個新的**，由第 3 步重新開始。

**`npm install` 出現紅色的 `ERR!`**
把終端機最後約 20 行文字複製下來，開一個「報告問題」issue 貼上。

**顯示 `EADDRINUSE: address already in use 0.0.0.0:4317`**
網站已經在另一個終端機視窗運行緊。找到那個視窗，或者直接打開 <http://localhost:4317>。

**網頁打開了，但地圖一片空白**
地圖需要瀏覽器的顯示卡加速。在 Chrome 打開「設定 → 系統」，確定「使用圖形加速功能」已開啟，重新啟動 Chrome。

**部分圖層有時載入失敗**
資料來自政府和交通機構的公開數據，偶爾會慢或暫停。等一兩分鐘再試；如果一直失敗，開 issue。
