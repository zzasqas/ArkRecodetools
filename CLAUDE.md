# CLAUDE.md — ArkRecodetools 專案指引

本檔案供 Claude Code 於協作開發時參考，描述專案架構、技術限制與開發注意事項。

---

## 專案概覽

**ArkRecodetools** 是《星隕計劃》（Ark Re:Code）的玩家輔助工具集，純前端架構，部署於 GitHub Pages。所有資料存於使用者瀏覽器的 `localStorage`，不依賴任何後端服務。

---

## 專案架構

```
ArkRecodetools/
├── index.html            # 主入口頁，工具導覽、使用說明、README 面板
├── battle-recorder.html  # 對戰紀錄器（v2.7.0）
├── character-db.html     # 角色資料庫（v1.4）
├── equip-optimizer.html  # 配裝計算器（v1.4.0）
├── chars.csv             # 角色基礎數值資料（含版本標頭 version:YYYYMMDD）
├── build_recom.csv       # 推薦配裝資料
├── data/
│   └── community_gvg.json  # 社群 GvG 資料
├── README.md             # 使用者說明文件（同時作為 index.html 的 README 面板內容）
└── CLAUDE.md             # 本檔案
```

---

## 技術架構與限制

### 技術棧

| 技術 | 用途 | 載入方式 |
|------|------|----------|
| React 18 | UI 框架 | CDN（unpkg） |
| Babel Standalone | 瀏覽器端 JSX 轉譯 | CDN（unpkg） |
| Tailwind CSS | 樣式 | CDN |
| 原生 JS | index.html 腳本邏輯 | inline `<script>` |

### 核心限制：純前端，禁止加入後端

- **不可**引入 Node.js、Express、Python Flask/FastAPI 或任何伺服器端邏輯
- **不可**使用需要 build 步驟的打包工具（Webpack、Vite 等），所有 JSX 在瀏覽器端由 Babel 即時轉譯
- **不可**使用需要 `npm install` 的套件（CDN 除外）
- 所有資料持久化必須使用 `localStorage`；唯一允許的外部連線是使用者自行設定的 Google Apps Script URL

### 內容安全政策（CSP）

`battle-recorder.html` 設有嚴格的 CSP，允許的外部來源：
- `https://unpkg.com`（React、Babel）
- `https://cdn.tailwindcss.com`
- `https://script.google.com` / `https://script.googleapis.com`（Google Sheet 同步）
- `https://raw.githubusercontent.com`（CSV 資料載入）

新增外部資源時必須同步更新 CSP meta 標籤。

---

## 各工具功能簡介

### `index.html` — 主入口頁

- 工具導覽卡片（對戰紀錄器、角色資料庫、配裝計算器）
- 使用說明區塊
- 右下角 README 側邊面板（動態 fetch `README.md` 並解析 Markdown）
- 支援中英文切換（`data-lang="zh"` / `data-lang="en"`），語言偏好存於 `localStorage`

**版本標籤維護**：每次工具版本更新時，需同步修改對應工具卡片的 `<span class="tool-meta">` 內容。

### `battle-recorder.html` — 對戰紀錄器

- 記錄 PvP 對戰結果（對手陣容、我方陣容、勝負、備註）
- 角色暱稱系統：支援中英文別名搜尋，別名快取於 `localStorage`
- 策略推薦：根據歷史資料分析常見對手組合
- 速度計算器（預設開啟）
- 可選連接使用者自己的 Google Sheet（透過 Google Apps Script）

### `character-db.html` — 角色資料庫

- 從 GitHub raw 載入 `chars.csv` 與 `build_recom.csv`
- 依屬性（火／水／木／光／暗）與職業篩選角色
- 顯示角色基礎數值、固有爆率爆傷
- 推薦配裝 Popup：點擊角色卡片查看建議套裝與屬性門檻
- 點擊「套用並前往配裝」跳轉配裝計算器並帶入參數

### `equip-optimizer.html` — 配裝計算器

- 匯入裝備 JSON（由靈燕瀏覽器外掛從遊戲匯出）
- A/B 兩種優化模式，依屬性權重篩選裝備組合
- 計算符合條件的最佳 8 組裝備
- 手動配套（ManualPicker）、多角色裝備鎖定（SuperLock）
- 已配裝備可下載匯出，配置快取於 `localStorage`

---

## 資料檔案格式

### `chars.csv`

第一行為版本標頭：`version:YYYYMMDD`
後續每行為一個角色的資料欄位，包含名稱、屬性、職業、基礎數值等。

### `build_recom.csv`

推薦配裝資料，對應角色的套裝建議與屬性權重。

---

## 開發注意事項

### 版本號同步

每次更新工具版本時，需同步修改以下位置：

| 檔案 | 位置 | 說明 |
|------|------|------|
| `battle-recorder.html` | `<title>` 標籤 | 工具頁面標題 |
| `index.html` | 對應工具卡片的 `<span class="tool-meta">` | 首頁版本標籤 |
| `README.md` | 工具一覽表對應列 | 說明文件版本欄 |
| `README.md` | `## 更新紀錄` 區塊（最上方新增） | 版本更新條目 |

### 雙語內容維護

`index.html` 使用 `data-lang="zh"` / `data-lang="en"` 屬性控制顯示語言。新增或修改文字內容時，中英文版本都需更新，避免遺漏。

### localStorage 鍵名

各工具的資料存於 `localStorage`，修改鍵名或資料結構時需考慮向下相容，或在版本升級時提供清除舊快取的機制（參考 battle-recorder.html v2.7.0 的升級清除邏輯）。

### CSV 更新

`chars.csv` 更新後需同時更新版本標頭（`version:YYYYMMDD`），以便客戶端判斷是否需要重新載入。

### README.md 同時作為面板內容

`README.md` 會被 `index.html` 動態 fetch 並解析顯示於 README 側邊面板。使用的是簡易自製 Markdown 解析器（支援 h1~h3、粗體、斜體、連結、code、hr、blockquote、清單），不支援表格渲染，勿在 README.md 中使用複雜 Markdown 語法。
