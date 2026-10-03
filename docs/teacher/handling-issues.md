# 處理學員的 issue

學員按 [學員指南](../STUDENT_GUIDE.md) 開 issue，表格固定分兩類：**🐛 報告問題**（自動加 `bug` label）和 **💡 建議**（自動加 `enhancement` label）。

## 每次處理的四步

1. **看**：打開 <https://github.com/johnson-greate/hk-traffic-intelligence/issues>，新開的排最前
2. **判斷**：屬於下面哪一種情況
3. **回覆**：在 issue 頁底留言。學員會收到電郵
4. **關閉**：按留言框下的 **Close issue**，揀原因

| 情況 | 做法 | 關閉原因 |
| --- | --- | --- |
| 資料不足 | 留言問清楚，加 `question` label，**不要關** | — |
| 學員操作問題（例如未裝 Node.js） | 留言教他怎樣做 | Close as completed |
| 真的是 bug，已修好 | 修正的 PR 描述寫 `Closes #12`，PR merge 時 issue 會自動關閉 | 自動 |
| 好建議，但暫時不做 | 留言說明，加入 `docs/ROADMAP.md` | Close as not planned |
| 重複 | 留言「同 #8 一樣」，加 `duplicate` label | Close as duplicate（如沒有此選項，揀 not planned） |

## 回覆範本

可以複製再改：

```
多謝回報！我試到同樣問題，已經修正，下次 Download ZIP 或者 git pull 就會有。
```

```
多謝！想再問清楚：你係喺自己電腦運行（localhost:4317）定網上版見到？可唔可以補一張截圖？
```

```
呢個係安裝步驟嘅問題：Node.js 要裝 v22。裝完之後記得關咗終端機再開過，再由學員指南第 3 步開始。
```

```
好建議！暫時未會做，已經記入 ROADMAP，之後有機會再處理。
```

## 請 Claude Code 幫手

在項目資料夾開 Claude Code，可以咁講：

```
睇吓 GitHub 上有咩未處理嘅 issue，逐個話我知內容同你建議點處理。
```

```
幫我修正 issue #12：先喺本地重現，修好之後開 PR，PR 描述寫 Closes #12。
唔好 merge，等我睇過。
```

```
喺 issue #12 留言話佢知已經修正，用廣東話，簡短友善。
```

Claude Code 說已留言或已開 PR 之後，**打開 GitHub 頁面親眼確認**。

## 相關指令（可選）

```bash
gh issue list                         # 列出未關閉的 issue
gh issue view 12                      # 看 issue 內容和留言
gh issue comment 12 --body "多謝！"   # 留言
gh issue close 12 --reason completed  # 關閉（或 --reason "not planned"）
```
