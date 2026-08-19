# 安全與文件治理變更紀錄

**日期：** 2026-08-19
**範圍：** 匯入資料的呈現方式、Tier List 提交端的輸入驗證與流量控制、使用者與開發者文件的敘事分工。

> 本文件記錄實際完成的變更內容，供日後維護參考。未記錄任何 Token、帳密、Cookie、Session 或 Railway ENV 值。

---

## 1. 匯入與分享資料的處理

### 原則

角色列表檢視器與 RTA 對戰分析會讀取使用者選擇的 JSON；角色列表也可由 `#data=` 分享連結帶入。這些來源一律視為不可信資料，先驗證結構與大小，再以純文字方式呈現。

### Roster Viewer (`roster-viewer.html`)

- JSON 大小上限 512 KB、角色筆數上限 1000 筆，並逐欄驗證型別與數值範圍。
- 相容既有 `owned`、舊 `characters`、字串角色 ID，以及分享連結使用的 `n` 副本數格式。
- 角色 ID 限制為 `H` 加數字；尚未收錄於目錄的新角色仍以純文字 ID 顯示。
- `account`、`source`、`exportedAt` 保留原功能，改以 `textContent` 呈現。
- 角色卡、縮圖 fallback、統計列與提示訊息改由 DOM 節點建立。
- 圖片匯出的檔名會過濾不適合作為檔名的帳號字元。
- 合法檔案中的個別異常角色會被略過並提示數量；整份檔案只有在結構、大小或所有角色 ID 都無效時才拒絕。

### RTA Dashboard (`rta-dashboard.html`)

- 檔案大小上限 15 MB；累積戰績筆數上限 10000 場，於匯入合併後檢查。
- 匯入資料與既有 `rta_logs` 快取都會先正規化：時間、CUID、角色 ID、角色清單、Ban／Pre-ban、玩家名稱與數值欄位。
- 正規化後才合併並寫入 localStorage。
- 玩家選擇器以 DOM 與 `textContent` 建立；逐場明細的玩家名、角色名與 tooltip 內容一律經 HTML escape 後輸出。
- 既有原始戰績檔與 `{ cuid, matchCount, logs }` 匯出格式維持支援。

### CSP

- 兩頁採用 restrictive CSP，`default-src 'none'` 起算，逐項開放實際需要的來源。
- 內嵌程式以 SHA-256 hash 白名單執行，未使用 JavaScript 的 `'unsafe-inline'`。
- Roster Viewer 原本的 inline `onerror` 屬性改為 JavaScript 事件監聽；兩頁皆無 HTML inline event handler。
- Roster Viewer 的 `script-src` 與 `img-src` 額外允許 `file:`，讓頁面可直接以本機檔案開啟。此項對線上版無作用（瀏覽器不允許 https 頁面載入 file: 資源）。

### 行尾與 CSP hash 的關係

CSP hash 比對的是 inline `<script>` 的**原始位元組**，行尾字元（LF／CRLF）也計入。專案新增 `.gitattributes`：

```
*.html text eol=lf
```

確保各平台 checkout 的 HTML 行尾一致，hash 不會因為換行格式而失效。

**維護注意：** 修改這些頁面的 inline `<script>` 後，必須重新計算並更新對應的 CSP hash。

---

## 2. Tier List 提交端 (`server/server.js`)

- `POST /submit` 的 JSON body 上限由 256 KB 調整為 64 KB。
- 每個來源 IP 每分鐘最多 5 次提交；超過回傳 `429` 與 `Retry-After`。
- 限流表有一分鐘 TTL 清理與 key 數量上限，狀態不會無限成長。
- 驗證 `deviceId`、模式、暱稱型別、Tier key 格式、角色名稱長度、每 Tier 與總角色數，以及 `charPlusMinus` 的允許值。
- 重複提交回傳 `409`，格式錯誤回傳 `400`。
- 寫入時只保留 `tierMembers` 與可選的 `charPlusMinus`，其餘 payload 欄位忽略。
- 保留既有「同一 `deviceId + mode + week` 只能提交一次」規則。
- 前端在收到 `429` 時顯示「提交過於頻繁，請稍後再試」，與一般網路錯誤區分。

### 管理下載

`GET /admin/download` 的 URL、`?token=` 驗證方式、回傳內容與篩選參數本次均未變更。回傳內容為已提交投票的時間、週別、模式、暱稱、`deviceId` 與 Tier payload；不包含 Railway ENV、部署檔案、帳密或其他工具的 localStorage 資料。

---

## 3. 文件敘事分工

### 使用者 README (`README.md`)

面向使用者，說明「資料會到哪裡、何時由使用者主動送出」：

- 工具一覽新增 RTA 對戰分析與社群 Tier List。
- 新增 RTA 的本機分析與清除快取說明。
- 新增 Tier List 提交時會送出與不會送出的欄位。
- 將「所有資料都不會上傳」改寫為精確敘事：預設本機、Google Sheet 為使用者選用同步、Tier List 僅在使用者按下提交後送出。
- 提醒角色列表分享連結／圖片可能含帳號名與擷取時間，由使用者自行決定分享對象與內容。

### 開發者維護文件 (`CLAUDE.md`、`tier-list/CLAUDE.md`)

面向維護者，說明「系統邊界與修改責任」：

- 更新專案架構描述，明確標示 Tier List 有既有的 Railway 收集服務。
- 補齊 RTA Dashboard、RTA 擷取腳本、Tier List 與 server 的架構位置。
- 新增匯入資料邊界：所有 JSON、URL fragment、localStorage 舊快取與遊戲 API 回應都須先驗證再儲存或渲染。
- 明確區分 README（使用者資料流）與開發者文件（維護責任），兩者不得矛盾，也不得記載實際的秘密值。
- 補上 CSP hash 的維護提醒。
- `tier-list/CLAUDE.md` 補上提交端的大小、頻率、資料欄位與 HTTP 回應規則。

---

## 4. 驗收結果

以下項目皆已在本機實測通過。

**Roster Viewer**

| 項目 | 結果 |
|---|---|
| 擷取腳本／Chrome 外掛產生的角色 JSON | 通過，重複副本正確聚合 |
| 既有 `#data=` 分享連結 | 通過，載入後 hash 自動清除 |
| 舊 `characters` 格式與字串角色 ID | 通過 |
| 角色頭像載入與 fallback | 通過 |
| 帳號名／角色 ID 含 HTML 字串 | 僅顯示為文字，不產生任何節點 |
| 結構錯誤、非 JSON、筆數超標 | 各自顯示對應的錯誤訊息 |

**RTA Dashboard**

| 項目 | 結果 |
|---|---|
| 1180 場合併紀錄匯入 | 1180/1180，欄位逐項比對無落差 |
| 重複匯入 | 正確去重 |
| 「匯出完整 JSON」往返 | 資料完整 |
| 全部數據（多玩家混合）模式 | 通過 |
| 既有快取重新載入 | 保留原有資料 |
| 玩家名／角色 ID 含 HTML 字串 | 僅顯示為文字，不產生任何節點 |

**Tier List 提交端**

| 項目 | 結果 |
|---|---|
| 合法提交 | `200` |
| 同 `deviceId + mode + week` 重複 | `409` |
| 欄位格式錯誤（空 tierMembers、非字串暱稱、非法 mode、Tier 數超標、跨 Tier 重名） | 各回 `400` |
| 超過 body 上限 | `413` |
| 同一 IP 連續提交 | 前 5 次 `200`，第 6 次起 `429` 並附 `Retry-After` |
| 不同 IP | 各自獨立計算 |
| 前端 429 顯示 | 顯示「提交過於頻繁，請稍後再試」 |
| `/admin/download` | Token 驗證與回傳格式與變更前一致 |

**其他**

- 三個採用 CSP hash 的頁面，宣告值與檔案內容一致。
- 頁面無 HTML inline event handler。
- 變更檔案的秘密值掃描無命中；`git diff --check` 無警告。

---

## 5. 日後修改時的檢查項目

1. 用既有角色擷取 JSON、既有分享連結、既有 RTA 匯出 JSON 各測一次。
2. 用帶 HTML 字串的帳號名／玩家名／角色 ID 測試，確認僅顯示為文字。
3. 修改 inline `<script>` 後，重新計算並更新 CSP hash。
4. 對 `/submit` 送出合法與錯誤格式資料，確認狀態碼與限流行為符合預期。
5. 確認 README 的資料流描述與 `CLAUDE.md` 的架構描述一致。
6. 提交前掃描秘密值並執行 `git diff --check`。
