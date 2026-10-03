# 第 2 課：Branch、Commit 與 Pull Request

[← 上一課：Fork 與初始設定](01-fork-and-setup.md) · [課程目錄](README.md) · [下一課：先寫測試 →](03-test-first.md)

## 目標

以 [PR #1](https://github.com/johnson-greate/hk-traffic-intelligence/pull/1) 為實例，走一次完整流程：

開 branch → 小 commit → push → 寫 PR 描述（附測試計劃）→ 審閱 Files changed → merge → 刪 branch → 本地 `git pull`

## 為甚麼不直接改 `main`

`main` 是線上版本的來源。直接改，等於未經檢查就上線。每項改動放在獨立 branch，經 PR 合併，你就有一個地方看清楚改了甚麼、為何要改、怎樣測試過。第 1 課的 ruleset 是安全網，這個流程才是日常習慣。

## 步驟

### 1. 開 branch

PR #1 的 branch 叫 `feature/sky-and-harbour-card`：

```bash
git switch main
git pull
git switch -c feature/sky-and-harbour-card
```

命名規則：

- 用前綴表明類型：`feature/`、`fix/`、`docs/`
- 後面用幾個英文字描述內容，以 `-` 分隔
- 一看名字就知道這條 branch 做甚麼。`feature/snapshot-history`（PR #2）也是同樣做法

### 2. 每個 commit 只做一件事

PR #1 包含兩項獨立改動，所以分成兩個 commit：

| Commit | 內容 | 改動檔案 |
| --- | --- | --- |
| [`d6d2dc2`](https://github.com/johnson-greate/hk-traffic-intelligence/commit/d6d2dc2) | 天空霧化 | `city-map.tsx`（+15 行） |
| [`b7f8b09`](https://github.com/johnson-greate/hk-traffic-intelligence/commit/b7f8b09) | 過海決策卡 | `ops-hud.tsx`、`harbour-choice.ts`、`harbour-choice.test.ts`、`i18n.ts` |

好處：審閱的人可以逐個 commit 看；將來發現其中一項有問題，可以只 revert 那一個 commit。

Commit message 的寫法，以 `d6d2dc2` 為例：

```text
Fill the pitched map's empty sky with a night gradient

A pitched camera shows the horizon, and above it the map drew plain
black. A sky in the HUD's cyan now fades from deep navy to a hazy
horizon. setStyle drops the sky, so it is restored with the overlays.
```

- 第一行：做了甚麼，用祈使句，不加句號
- 空一行
- 內文：**為甚麼**要改，以及讀代碼時不易看出的細節（例如 `setStyle` 會清走 sky）

### 3. Push 並開 PR

```bash
git push -u origin feature/sky-and-harbour-card
gh pr create --base main
```

因為是 fork，記得 PR 的目標是**你自己 fork 的 `main`**，不是原項目。開 PR 時留意頁面上方的 base repository。

### 4. 寫 PR 描述

PR #1 的描述分三部分：

**Summary**：每項改動一句，講用戶會看到甚麼分別。

**Why**：為甚麼要做。PR #1 寫明：頂部的隧道時間是 8 個起點中最快的一個，不是你所在位置的時間；由堅拿道天橋出發，頂部顯示紅隧 7 分鐘，實際是 13 分鐘。

**Not included**：刻意沒做的事。PR #1 沒有加入隧道收費，因為開放數據沒有收費金額，寫死一個表會過時。

最後是 **Test plan**，用 checkbox 列出每一項驗證：

```markdown
## Test plan
- [x] `node src/lib/harbour-choice.test.ts` and the existing tests pass
- [x] `tsc --noEmit` and ESLint clean
- [x] Browser check: sky at max pitch, card in 繁 / 简 / EN, origin remembered after reload, no console errors
- [x] 390 px phone width: card sits above the intel panel, no horizontal scroll
```

測試計劃要具體到別人可以照做。「已測試」三個字沒有用；「390 px 手機闊度下卡片在情報面板之上」才可以被核實。最後一項正是在手機闊度下發現卡片被面板遮住，修正後才剔選。

### 5. 審閱 Files changed

在 PR 頁面按 **Files changed**，逐個檔案看：

- 有沒有改了與本 PR 無關的檔案？
- 有沒有遺留的 `console.log`、測試用的假數據、註解掉的代碼？
- 新增的文字有沒有三種語言（繁、簡、英）？PR #1 在 `i18n.ts` 加了 28 行

即使代碼是 Claude Code 寫的，按 merge 的是你，責任也是你的。

### 6. Merge、刪 branch、同步本地

在 PR 頁面按 **Merge pull request**，然後按 **Delete branch**。PR #1 的 merge commit 是 [`22321d3`](https://github.com/johnson-greate/hk-traffic-intelligence/commit/22321d3)。

回到本機：

```bash
git switch main
git pull
git branch -d feature/sky-and-harbour-card
git log --oneline -3
```

`git log` 應該見到 merge commit 在最上面。

## 常見錯誤

**一個 commit 包含所有改動。** 「Update files」這種 commit 無法審閱，也無法單獨撤回。

**PR 開錯目標。** Fork 的 PR 預設可能指向原項目。開之前看清楚 base repository。

**測試計劃只寫「已測試」。** 寫下你實際做了甚麼、看到甚麼結果。

**沒看 Files changed 就 merge。** AI 可能順手改了你沒要求的地方。

**Merge 後忘記 `git pull`。** 本地 `main` 落後，下一條 branch 就會由舊版本開出，之後容易衝突。

**在舊 branch 上繼續開發新功能。** 每項新功能由最新的 `main` 開新 branch。

## 練習

1. 由最新的 `main` 開一條 `docs/your-name-intro` branch。
2. 在 `docs/course/` 新增一個檔案，寫三行自我介紹，commit。
3. 再改一次（例如加一行學習目標），另外 commit。
4. Push 並向**你自己 fork 的 `main`** 開 PR，描述包括 Summary 和 Test plan。
5. 在 Files changed 確認只有一個檔案，merge、刪 branch，本地 `git pull`。
6. 用 `git log --oneline --graph -5` 看看兩個 commit 和 merge commit 的關係。

下一課：[先寫測試](03-test-first.md)，看過海決策卡的代碼是怎樣寫出來的。
