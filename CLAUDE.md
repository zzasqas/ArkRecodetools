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

每次更新工具版本時，需同步修改以下所有位置（以對戰紀錄器 battle-recorder.html 為例）：

| 檔案 | 位置 | 說明 |
|------|------|------|
| `battle-recorder.html` | `<title>` 標籤 | 工具頁面標題 |
| `battle-recorder.html` | `<div class="author-info">` | 右下角版本浮水印 |
| `battle-recorder.html` | `• 版本：v2.x.x` li 項目 | About/說明欄顯示版本 |
| `battle-recorder.html` | `version: '2.x.x'` | 匯出 JSON 版本欄位 |
| `battle-recorder.html` | `exported_by: 'ArkRecode_v2.x.x'` | 匯出安全標記 |
| `battle-recorder.html` | `歡迎使用 ArkRecode v2.x.x` alert | 首次使用歡迎訊息 |
| `battle-recorder.html` | `!['...'].includes(dataVersion)` 陣列 | 舊版升級清除邏輯白名單（加入新版號） |
| `battle-recorder.html` | `dataVersion !== '2.x.x'` | 版本升級偵測條件 |
| `battle-recorder.html` | `localStorage.setItem('arkrecode_dataVersion', '2.x.x')` | localStorage 版本寫入 |
| `battle-recorder.html` | `歡迎首次使用 ArkRecode v2.x.x` console.log | 首次使用 log |
| `battle-recorder.html` | `ArkRecode 對戰紀錄器 v2.x.x` h1 標題 | 頁面內標題 |
| `battle-recorder.html` | `ArkRecode 對戰紀錄器 v2.x.x` footer 文字 | 頁尾版本 |
| `battle-recorder.html` | 版本說明 h2 及 h4 標題 | 更新說明區塊標題 |
| `index.html` | 對應工具卡片的 `<span class="tool-meta">` | 首頁版本標籤 |
| `README.md` | 工具一覽表對應列 | 說明文件版本欄 |
| `README.md` | `## 更新紀錄` 區塊（最上方新增） | 版本更新條目 |

**公會戰紀錄器（guild-battle.html）版本同步位置相同，請比照處理。**

> **快速做法**：在編輯器全域搜尋舊版號（例如 `2.9.0`），逐一替換為新版號，再新增 changelog 條目即可。

### 新增角色更新說明

新角色加入遊戲時，需要更新以下檔案（依重要度排序）：

| 檔案 | 必須更新 | 說明 |
|------|----------|------|
| `assets/char-name-data.js` | ✅ 必須 | 角色本名 + 所有暱稱別名；battle-recorder 與 guild-battle 共用。格式：`{ name: '角色本名', aliases: ['本名', '暱稱1', '暱稱2'] }` |
| `chars.csv` | ✅ 必須（角色資料庫） | 角色基礎數值一行，欄位依序：本名、星級、屬性、職業、基礎攻/防/生/速、攻/防/生/速加成、總攻/防/生/速、爆率、爆傷、命中、抗性、被動類型、被動效果。記得更新第一行版本標頭 `version:YYYYMMDD` |
| `build_recom.csv` | 🔶 建議更新 | 新角色推薦配裝，格式參照現有行 |
| `character-db.html` | ❌ 通常不需改 | UI 自動讀取 chars.csv，無需手動改 HTML |
| `battle-recorder.html` | ❌ 通常不需改 | 別名自動從 char-name-data.js 載入，無需手動改 |
| `guild-battle.html` | ❌ 通常不需改 | 別名自動從 char-name-data.js 載入，無需手動改 |

**流程摘要**：
1. 在 `assets/char-name-data.js` 的「新角色備用區」上方加入新角色條目（本名 + 常用暱稱）
2. 在 `chars.csv` 末行加入角色數值，並更新版本標頭日期
3. 若有推薦配裝資料，一併更新 `build_recom.csv`

> 對戰紀錄器與公會戰紀錄器的角色搜尋均自動更新，不需額外動作。

---

### 雙語內容維護

`index.html` 使用 `data-lang="zh"` / `data-lang="en"` 屬性控制顯示語言。新增或修改文字內容時，中英文版本都需更新，避免遺漏。

### localStorage 鍵名

各工具的資料存於 `localStorage`，修改鍵名或資料結構時需考慮向下相容，或在版本升級時提供清除舊快取的機制（參考 battle-recorder.html v2.7.0 的升級清除邏輯）。

### CSV 更新

`chars.csv` 更新後需同時更新版本標頭（`version:YYYYMMDD`），以便客戶端判斷是否需要重新載入。

### README.md 同時作為面板內容

`README.md` 會被 `index.html` 動態 fetch 並解析顯示於 README 側邊面板。使用的是簡易自製 Markdown 解析器（支援 h1~h3、粗體、斜體、連結、code、hr、blockquote、清單），不支援表格渲染，勿在 README.md 中使用複雜 Markdown 語法。

### 裝備部位判斷邏輯（equip-optimizer.html）

靈燕外掛匯出的裝備 JSON **不含部位欄位**，部位須由程式推斷。遊戲靜態資料表以 StaticID 直查部位，但該表未隨 JSON 匯出，故採以下三層策略：

#### 第一層：StaticID 末位數字（可信前綴集合）

`RELIABLE_PFX` 列出已知符合「末位數字 1-6 = 部位」慣例的前綴；  
`buildDynReliablePfx()` 在解析時掃描整包 JSON，以武器(1)、頭盔(2)、鎧甲(3) 的固定主屬性作驗證基準，自動偵測新前綴並加入可信集。  
**注意**：鞋子(6) 主屬性並非固定為速度值，攻擊%/生命%/防禦% 均可出現，不得列為驗證基準。

| 末位數字 | 部位 |
|----------|------|
| 1 | 武器 |
| 2 | 頭盔 |
| 3 | 鎧甲 |
| 4 | 項鍊 |
| 5 | 戒指 |
| 6 | 鞋子 |

#### 第二層：特殊前綴對映表（SPECIAL_PFX_SLOT）

部分付費紅色裝備前綴不符合 1-6 慣例（如 E050，整組為飾品類，末位數字無法對應標準部位）。  
此類前綴以 `SPECIAL_PFX_SLOT` 物件記錄主屬性→部位的個別對映，需由玩家回報後手動補入。

#### 第三層：主屬性 Fallback

| 主屬性 | 判斷部位 | 是否唯一 |
|--------|----------|----------|
| AttackValue（攻擊值） | 武器 | ✓ 唯一 |
| HPValue（生命值） | 頭盔 | ✓ 唯一 |
| DefenceValue（防禦值） | 鎧甲 | ✓ 唯一 |
| SpeedValue（速度值） | 鞋子 | ✓ 唯一 |
| CriticalRate / CriticalDamageRate（暴率/暴傷） | 項鍊 | ✓ 項鍊獨有 |
| EffectHitRate / ResistanceRate（命中/抗性） | 戒指 | ✓ 戒指獨有 |
| AttackRate / HPRate / DefenceRate（攻擊%/生命%/防禦%） | 項鍊（fallback） | ✗ 三部位共用，**無法靠主屬性分辨** |

攻擊%/生命%/防禦% 三種主屬性同時可出現於項鍊、戒指、鞋子，Fallback 一律給「項鍊」，對戒指與鞋子而言是錯誤的。唯有靠第一層或第二層才能正確判斷。

#### localStorage 部位 Mapping 持久化

key：`arkrecode_slot_map`，格式 `{StaticID: "部位"}`（例：`{"E0501":"戒指"}`）。

此 key **與裝備資料獨立**，清除裝備（`arkrecode_equips`）時不得一併刪除。
匯入流程：解析時先查此 map → 有記錄直接用 → 無記錄才彈出部位確認 Modal → 確認後寫入此 map。

#### 新增特殊裝備前綴的處理流程

1. 若新前綴有武器/頭盔/鎧甲件 → `buildDynReliablePfx()` 會自動偵測，無需手動處理。
2. 若新前綴只有飾品/鞋子件（無法自動偵測）→ 請玩家對照遊戲確認部位後：
   - 符合 1-6 慣例 → 加入 `RELIABLE_PFX`
   - 不符合慣例 → 加入 `SPECIAL_PFX_SLOT`
