# 第 1 課：Fork 與初始設定

[← 課程目錄](README.md) · [下一課：Branch、Commit 與 Pull Request →](02-branch-commit-pr.md)

## 目標

完成這一課後，你會：

- 分清楚 fork 和 clone
- 知道 `origin` 和 `upstream` 各自指向哪裏，以及如何與原項目保持同步
- 知道 fork 一個 MIT 項目要負甚麼責任
- 為 `main` 設定 ruleset，並避開兩個常見的設定錯誤

## Fork 和 clone 有何不同

| | Fork | Clone |
| --- | --- | --- |
| 發生在哪裏 | GitHub 上 | 你的電腦上 |
| 結果 | 你的帳號下多了一個 repo 副本 | 本機多了一個資料夾 |
| 可以 push 嗎 | 可以 push 到你的 fork | 視乎遠端 repo 是否屬於你 |

你沒有原項目的寫入權限，所以要先 fork，在自己的副本上工作。clone 只是把 repo 下載到電腦，兩者通常一起做。

## 步驟

### 1. Fork 並 clone

本項目用 `gh` 一次完成：

```bash
gh repo fork keithligh/hk-traffic-intelligence --clone
cd hk-traffic-intelligence
git remote -v
```

`gh` 會自動設定兩個 remote：

```text
origin    https://github.com/johnson-greate/hk-traffic-intelligence.git
upstream  https://github.com/keithligh/hk-traffic-intelligence
```

- `origin`：你的 fork。你 push 的地方。
- `upstream`：原項目。你只讀取，不 push。

### 2. 清理多餘的 branch

Fork 會把原項目所有 branch 一併複製。本項目 fork 後有 4 條 `cursor/*` branch。刪除前先核實它們已經合併入 `main`：

```bash
git fetch origin
git branch -r --merged origin/main
```

確認列表包括那幾條 branch 後，才刪除：

```bash
git push origin --delete cursor/某條-branch
```

### 3. 與原項目保持同步

原作者之後更新，你可以這樣拉回來：

```bash
git switch main
git fetch upstream
git merge upstream/main
git push origin main
```

亦可以在 GitHub 的 fork 頁面按 **Sync fork**。兩者效果相同。

### 4. 遵守 MIT License

[`LICENSE`](../../LICENSE) 寫着 `Copyright (c) 2026 Keith Li`。MIT 容許你複製、修改和再發布，條件只有一個：**保留版權聲明和授權文字**。

- 不要刪除或修改 `LICENSE`。
- 你新增的代碼可以加上自己的名字，但原有的聲明要留下。
- 原項目 README 亦請求在 fork 時致謝原作者，本項目的 README 保留了這些連結。

### 5. 用 ruleset 保護 `main`

目標：任何人（包括你自己和 Claude Code）都不能刪除 `main` 或 force push 到 `main`。

在 GitHub：**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

1. **Ruleset name**：`protect-main`
2. **Enforcement status**：改為 **Active**
3. **Target branches**：按 **Add target → Include default branch**
4. **Rules**：剔選 **Restrict deletions** 和 **Block force pushes**
5. 按 **Create**

建立後用 CLI 核實：

```bash
gh api repos/<你的帳號>/hk-traffic-intelligence/rulesets
```

確認 `enforcement` 是 `"active"`。再用以下指令看詳細設定，確認 `conditions` 內包括 `~DEFAULT_BRANCH`：

```bash
gh api repos/<你的帳號>/hk-traffic-intelligence/rulesets/<ruleset id>
```

## 常見錯誤

**漏了「Add target → Include default branch」。** 頁面會顯示警告「This ruleset does not target any resources and will not be applied」。規則寫好了，但不作用於任何 branch。本項目第一次建立時正是這樣，後來用 API 補回 target。

**Enforcement 保留了預設的 Disabled。** Ruleset 存在，但完全不生效。新建時預設不一定是 Active，記得改。

**以為 `upstream` 可以 push。** 你沒有原項目的權限。改動永遠 push 到 `origin`，要貢獻給原作者，就由你的 fork 向原項目開 PR。

**刪 branch 前沒有核實。** 先用 `git branch -r --merged` 確認，否則可能刪掉未合併的工作。

**刪除或改寫 LICENSE。** 這是違反授權條款，不是小事。

## 練習

1. Fork 本 repo 到你的帳號並 clone，用 `git remote -v` 確認 `origin` 和 `upstream`。
2. 為你的 fork 建立 `protect-main` ruleset。
3. 用 `gh api` 核實 `enforcement` 是 `active`，並且 target 包括預設 branch。
4. 問 Claude Code：「如果 ruleset 沒有生效，`git push --force origin main` 會造成甚麼後果？」然後用你自己的話寫下答案。

完成後，進入[第 2 課](02-branch-commit-pr.md)。
