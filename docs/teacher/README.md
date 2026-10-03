# 課程指南：用 Claude Code 和 GitHub 改進一個真實項目

> **老師參考。** 這五課的內容（ruleset、先寫測試、Cloudflare 部署等）超出學員所需。學員請看 [學員指南](../STUDENT_GUIDE.md)；處理學員 issue 的方法見 [handling-issues.md](handling-issues.md)。

這份指南是 AI Trade Training Course 的教材。內容不是虛構的練習，而是這個 repo 實際發生過的事：由 fork 原項目開始，經兩個 Pull Request 加入新功能，再部署到 Cloudflare，最後在上線後發現一個問題。每一課都附上真實的 commit 和 PR 連結，學員可以打開對照。

## 適合誰

- 想學 Vibe Coding，即以自然語言指揮 AI 編程助手（本課程用 Claude Code）完成真實開發工作的學員。
- 未必是全職工程師，但願意在終端機輸入指令，並且想學懂 GitHub 的基本流程：fork、branch、commit、Pull Request、merge。
- 想知道 AI 寫完代碼之後，怎樣**自己核實**它真的做對了。

## 開始之前要準備

| 項目 | 說明 |
| --- | --- |
| GitHub 帳號 | 免費帳號即可 |
| `git` 和 `gh` | `gh` 是 GitHub 官方 CLI，用來 fork、開 PR 和查看 PR |
| Node.js 22 | 本項目的測試直接以 `node` 執行 `.ts` 檔 |
| Claude Code | 在項目資料夾內執行 `claude` |
| Cloudflare 帳號 | 只有第 4 課需要，免費計劃已足夠 |

## 課程目錄

| 課 | 題目 | 你會學到 |
| --- | --- | --- |
| 1 | [Fork 與初始設定](01-fork-and-setup.md) | fork 和 clone 的分別、`origin` 與 `upstream`、MIT 授權責任、用 ruleset 保護 `main` |
| 2 | [Branch、Commit 與 Pull Request](02-branch-commit-pr.md) | 以 [PR #1](https://github.com/johnson-greate/hk-traffic-intelligence/pull/1) 為例，走一次完整流程 |
| 3 | [先寫測試](03-test-first.md) | 過海決策卡如何由一個發現開始，先寫測試再寫實作 |
| 4 | [部署到 Cloudflare](04-deploy-cloudflare.md) | 本地 workerd 與 Node 開發伺服器、Cron 與 D1、部署時踩過的每一個坑 |
| 5 | [怎樣向 Claude Code 下指示](05-prompting-claude-code.md) | 在這個項目中有效的 prompt，以及要警惕的訊號 |

建議按次序讀。第 2 和第 3 課講的是同一個 PR 的兩個角度：第 2 課講流程，第 3 課講代碼。

## 項目背景

本 repo fork 自 Keith Li 的開源項目[香港智慧城市交通情報網](https://github.com/keithligh/hk-traffic-intelligence)（MIT License）。改善計劃見 [`docs/ROADMAP.md`](../ROADMAP.md)，已完成的兩項：

- [PR #1](https://github.com/johnson-greate/hk-traffic-intelligence/pull/1)：天空霧化、過海決策卡
- [PR #2](https://github.com/johnson-greate/hk-traffic-intelligence/pull/2)：每 5 分鐘把全城快照存入 D1，並提供 `/api/history`

## 怎樣配合 Claude Code 使用這份指南

1. 先自己讀一課，理解每一步為何這樣做。
2. 在自己的 fork 開 Claude Code，把該課的「練習」交給它，但**由你決定**每一步：先要它講計劃，你批准後才動手。
3. 它說完成時，用該課教的方法自己核實：看 diff、跑測試、開瀏覽器、查線上數據。
4. 遇到問題，對照該課的「常見錯誤」。

你也可以直接叫 Claude Code 讀這些檔案，例如：

```text
讀 docs/teacher/02-branch-commit-pr.md，然後帶我做練習。每一步先解釋，等我確認才執行。
```

## 一個貫穿全課程的原則

**AI 說「完成」不等於完成。** 本項目上線時第一個 Cron 成功寫入了數據，看似一切正常；翌日早上檢查，才發現 Cron 間歇被取消，數據斷了幾段（見第 4 課）。每一課都會練習同一個習慣：拿證據，不要信總結。
