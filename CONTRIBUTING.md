# 提交規範

這是公開 repo，而且 GitHub Pages 直接把根目錄當靜態檔案送出——
**進了 repo 就等於上線**，沒有「只是放著沒人看」這回事。

## 安裝提交前檢查（每台機器做一次）

```bash
cp scripts/precommit_guard.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

hook 不會跟著 clone 走，換電腦要重跑一次。
檢查用的專案專屬關鍵字放在 `local/blocklist.txt`（不進版控，換電腦要自己補一份）。

## 三條底線

### 1. 不寫上游／關聯專案的識別資訊

私有工具專案的 **repo 名、腳本檔名、目錄結構、本機絕對路徑**一律不出現在
公開檔案裡，程式碼註解與 commit message 都算。

需要交代「這東西從哪來」時，寫功能不寫來源：

| ✗ 不要 | ✓ 改成 |
|---|---|
| `判定規則與 <上游 repo>/scripts/<檔名>.py 同一套` | `判定規則與離線分析腳本的 Python 版同一套` |
| `cd C:\Users\xxx\Documents\<上游 repo>` | `cd "<專案目錄>"`，實際路徑放 `local/_paths.py` |
| `見 <上游 repo> 的 docs/更新角色SOP.md` | `見 CLAUDE.local.md` |

完整對照表在 `CLAUDE.local.md`（不進版控）。

### 2. 不寫「怎麼取得資料」

工具能做什麼可以寫，資料從哪個 API、哪個 handler、用什麼手法取得的不寫。
描述取得手法的動詞（本機 `local/blocklist.txt` 有完整清單）一律不出現在公開檔案。

### 3. 不寫會變成把柄的用途

同一個功能，措辭決定它讀起來像什麼：

功能寫「它做什麼」，不寫「可以拿來幹嘛」——用途的想像留給讀者，別自己寫進去。
灰色地帶的服務只寫「協助代管」，不寫實作方式。

具體的禁用字詞對照表在 `local/blocklist.txt` 與 `CLAUDE.local.md`。

**commit message 改不掉。** 檔案可以下一個 commit 修，message 要改就得重寫整串歷史。
按 Enter 前先問一句：這行被截圖出去，我能接受嗎？

## commit message 格式

```
<type>(<scope>): <一句話，寫做了什麼，不寫為什麼要藏>
```

type：`feat` / `fix` / `data` / `docs` / `chore` / `refactor`

- 不要在 message 裡寫關聯專案名、檔案路徑、帳號、定價、未公開內容。
- 不要寫「暫時屏蔽 X」「移除密碼限制」這種反而在指路的句子——
  寫 `chore: 調整首頁入口`、`refactor: 簡化資料庫載入流程` 就好。

結尾加：

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## 新增檔案時

`.gitignore` **對已經追蹤的檔案完全無效**。規則加晚了就擋不住——
`research/` 底下 8 個檔案就是這樣溜上去的。

所以新檔案的順序是：**先寫 `.gitignore`，再建檔案。**
順序反了就要 `git rm --cached <檔案>` 補救（本機檔案會保留）。

推之前確認一次：

```bash
git ls-files research/ local/    # 應該只列出你確定要公開的
git status --short               # 沒有意外的檔案
```
