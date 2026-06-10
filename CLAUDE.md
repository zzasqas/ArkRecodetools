# CLAUDE.md — ArkRecodetools 專案指引

本檔案供 Claude Code 於協作開發時參考，描述專案架構、技術限制與開發注意事項。

---

## ⚠️ 近期變更（委託協作者更新，2026-05）

對戰紀錄器（`battle-recorder.html`）已英文化並調整角色資料架構，重點如下：

1. **battle-recorder 全面支援中／英切換**（i18n 透過 React Context；沿用右上角既有 EN 鈕／`arkrecode-lang` 事件）。
2. **角色英文名改由 `assets/char-name-data.js` 提供**：該檔每筆已新增 `nameEN` 欄位（由角色別稱試算表同步，共 102 角色）；battle-recorder 啟動時從這裡動態建立「中文正式名 → 英文名」對照。
   - ⚠️ **新增角色時，`char-name-data.js` 也必須填 `nameEN`**，否則該角色在 battle-recorder 英文模式會顯示中文（已同步修正下方「新增角色更新說明」步驟 1）。
   - 註：`character-db.html` CHARACTER_DATA 仍各自保有 `nameEN`（兩處尚未統一），請保持兩邊英文名一致。
3. **別稱儲存改為「疊加式」**：使用者自訂別稱／自訂角色改存新 key `arkrecode_userAliases`（結構 `{ extras: { 正式名: [別稱...] }, customs: [{ name, aliases }] }`），疊加於母檔之上、**不再整份取代**。舊 key `arkrecode_characterAliases` 會在載入時自動遷移一次；載入時並會自動濾除「名稱其實是母檔角色正式名／別稱」的雜訊自訂條目。
4. **英文輸入辨識**：`Utils.convertAlias` 也比對 `nameEN`，輸入英文名會收斂回中文正式名再儲存（儲存值一律維持中文 canonical，確保跨語言一致、不破壞既有紀錄）。角色輸入框自動完成清單已加入英文名。
5. CSV 匯出在英文模式輸出英文（角色名／勝負／排位）；`battle-recorder.html` 載入 `char-name-data.js` 已加 `?v=` 破除快取——**日後更新 `char-name-data.js` 請同步調高該版號**。
6. **角色別稱設定（Character Alias Settings）加入搜尋框**：可依中文名／英文名／暱稱即時過濾母檔角色（角色達 102 個，方便尋找要新增別稱的對象）。
7. 版本號未升（沿用 v2.9.1），待原作者依既有慣例統一升版（見下方「版本號同步」）。

> `character-db.html` 未改動（仍 64 角色、UI 半英文化）；如需一併英文化或擴充角色另議。

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

---

## 資料架構與維護地圖

### 資料檔案全覽

本專案的角色資料分散在多個檔案，各有不同職責與使用工具。

| 檔案 | 資料內容 | 格式 | 使用工具 | 維護頻率 |
|------|----------|------|----------|----------|
| `assets/char-name-data.js` | 本名 + **nameEN** + id(H###) + 別名 | JS global | battle-recorder, guild-battle, tier-list, **character-db（搜尋）** | 新角色 / 補暱稱（新角色 nameEN 必填）|
| `chars.csv` | 完整數值（攻防生速、爆率爆傷、被動）| CSV 22 欄 | equip-optimizer（fetch）, tier-list/chars-data.js 生成來源 | 新角色 / 版本數值更新 |
| `character-db.html` CHARACTER_DATA | nameCN + nameEN + attribute + job + rarity（別名已移至 char-name-data.js） | JS inline 陣列 | character-db（僅此） | 新角色（必須手動更新） |
| `build_recom.csv` | 推薦套裝、屬性權重、速度門檻 | CSV | character-db（fetch） | 有推薦配裝資料時 |
| `tier-list/chars-data.js` | 角色精簡數值（速度、攻防生、爆率爆傷） | JS global | tier-list（CHARS_DATA） | 從根目錄 chars.csv 手動生成後覆蓋 |
| `assets/official-tierlist.json` | 開發者官方 Tier 分級（S/A/B/C/D × 模式） | JSON | character-db（fetch） | 排好 tier 後用「★ 官方匯出」更新 |

### 已知重複點（每次維護需注意）

**① ~~暱稱重複~~ → 已整合**

character-db.html 現在直接讀 `char-name-data.js`（透過 aliasLookup）。暱稱只需維護 `char-name-data.js` 一份，character-db 自動取用。

**② ~~`tier-list/chars.csv` 冗余~~ → 已刪除**

`tier-list/chars.csv` 已刪除。`tier-list/chars-data.js` 的唯一上游是根目錄 `../chars.csv`，手動同步即可（更新流程見 `tier-list/CLAUDE.md`）。

**③ `character-db.html` CHARACTER_DATA 必須手動更新**

character-db.html **不會**自動讀 chars.csv，所有角色資料（nameCN/EN/attribute/job/rarity）都內嵌在 HTML 的 `CHARACTER_DATA` 陣列中。新角色必須手動加入。

---

### 跨專案同步（ArkRecodetools ↔ arkrecode_gvg_sniffer）

**2026-06-10 起，`assets/char-name-data.js` 是兩個專案共用的角色識別母檔**
（中文名 / nameEN / StaticID / 暱稱，103 條目皆已補齊 id）。
sniffer（`C:\Users\zzasq\OneDrive\Documents\arkrecode sniffer\arkrecode_gvg_sniffer`）
的 ROLE 對照表與 Discord bot 暱稱解析，都從本檔經同步腳本產生的
`data/characters.json` 自動載入，**sniffer 端不再手改任何角色檔案**。

| sniffer 檔案 | 對應 ArkRecodetools 檔案 | 關係 |
|-------------|------------------------|------|
| `data/characters.json` | `assets/char-name-data.js` | 由 sync 腳本產生（只增不刪），sniffer 唯一角色來源 |
| `utils/helper.py` ROLE / `discord_bot/data/aliases.py` | （自動）| 從 characters.json 載入，無需手改 |
| `discord_bot/data/build_recom.csv` | `build_recom.csv` | 格式相同，可直接複製 |

**新角色同步到 sniffer 的步驟（每兩週活動更新時）：**

```bash
# 1. 在本 repo 更新 char-name-data.js（依照正常新增角色 SOP）
#    ⚠️ 必填 id（StaticID，如 'H614'），sniffer 靠它識別角色
#    ID 查詢：https://arkrecodewiki.miraheze.org/wiki/Members/Infotable
#    H1xx~H2xx = 主線；H6xx = vtuber/聯動；H8xx = 熊熊系列

# 2. 在 sniffer repo 執行同步腳本（可先 --dry-run 預覽）
cd "C:\Users\zzasq\OneDrive\Documents\arkrecode sniffer\arkrecode_gvg_sniffer"
python scripts/sync_from_arkrecode.py

# 3. 兩個 repo 各自 commit & push（sniffer push 會觸發 Railway redeploy）
```

> 腳本位於 sniffer private repo（`scripts/sync_from_arkrecode.py`）。
> 完整的兩週更新 Checklist（含 PICKUP、/upload_chars）見 sniffer 的 CLAUDE.md。

**canonical 差異規則：** sniffer 的 `aliases.py` 手工條目永遠優先於 json，
既有的刻意差異（`彩伽` vs `河北彩伽`、`妮諾楷西` vs `妮諾凱西` 等）不受同步影響，
不需要人工處理。新增條目若 name 與 sniffer 慣用名不同，會自動收進 aliases。

### 各欄位的單一來源

| 資料欄位 | 唯一權威來源 | 注意事項 |
|----------|-------------|----------|
| 角色本名（中文） | `chars.csv` 第一欄 | 其他地方的 name 必須與此一致 |
| 角色英文名 | `character-db.html` CHARACTER_DATA.nameEN **＋ `assets/char-name-data.js` nameEN** | 兩處都有、需保持一致；battle-recorder/guild-battle 讀 char-name-data.js，character-db 用自己的 |
| 暱稱/別名 | `assets/char-name-data.js` | character-db 另有一份，需同步 |
| 遊戲 ID（H###） | `assets/char-name-data.js` id 欄 | 僅供參考，工具實際未使用 |
| 戰鬥數值 | `chars.csv`（根目錄） | equip-optimizer 直接讀；tier-list 透過 chars-data.js 讀 |
| 屬性/職業（中文） | `chars.csv`（火/水/木/光/暗、狙擊/術師/…） | |
| 屬性/職業（英文） | `character-db.html` CHARACTER_DATA | fire/water/nature/light/dark |
| 推薦配裝 | `build_recom.csv` | |
| 官方 Tier 評級 | `assets/official-tierlist.json` | 由「★ 官方匯出」按鈕生成 |

---

### 新增角色更新說明

新角色加入遊戲時，依序更新以下檔案：

| 步驟 | 檔案 | 必要 | 說明 |
|------|------|------|------|
| 1 | `assets/char-name-data.js` | ✅ 必須 | 加入 `{ name: '本名', nameEN: '英文名', id: 'H???', aliases: ['本名', '暱稱1', ...] }`。**`nameEN` 與 `id`（StaticID）皆必填**：nameEN 缺漏 battle-recorder 英文模式會顯示中文；id 缺漏 sniffer 同步腳本無法識別角色（ID 查 [wiki](https://arkrecodewiki.miraheze.org/wiki/Members/Infotable)）。更新後建議調高 battle-recorder 載入該檔的 `?v=` 版號 |
| 2 | `chars.csv`（根目錄） | ✅ 必須 | 末行加入數值，更新第一行版本標頭 `version:YYYYMMDD`（詳見下方欄位說明） |
| 3 | `tier-list/chars-data.js` | ✅ 必須 | 執行 `python scripts/gen_chars_data.py` 重新生成（從根目錄 chars.csv 自動轉換） |
| 4 | `character-db.html` CHARACTER_DATA | ✅ 必須 | 陣列末尾加入 `{ id, nameCN, nameEN, aliases, attribute, job, rarity }`。attribute 用英文（fire/water/nature/light/dark），job 用英文（warrior/defender/vanguard/caster/sniper/medic）。**注意：遊戲內「刺客」= vanguard** |
| 5 | `battle-recorder.html` 版本升版 | ✅ 必須 | 全域搜尋舊版號並替換（同時更新版本白名單陣列、dataVersion 比對字串、char-name-data.js `?v=` 版號），詳見上方「版本號同步」表格 |
| 6 | `index.html` / `README.md` | ✅ 必須 | 工具卡片版本標籤與更新紀錄同步升版 |
| 7 | `build_recom.csv` | 🔶 建議 | 有推薦配裝時加入 |
| 8 | `assets/official-tierlist.json` | 🔶 視情況 | 排好 tier 後用「★ 官方匯出」更新 |
| 9 | **sniffer 同步** | ✅ 必須 | 在 sniffer repo 跑 `python scripts/sync_from_arkrecode.py`，再兩個 repo commit & push（詳見上方「跨專案同步」） |

> battle-recorder、guild-battle 只讀 char-name-data.js，步驟 1 完成後自動生效，不需額外動作。

#### `chars.csv` 欄位填寫說明

欄位順序：`角色本名, 星級, 屬性, 職業, 基礎攻擊, 基礎防禦, 基礎生命, 基礎速度, 攻擊加成, 防禦加成, 生命加成, 速度加成, 總攻擊, 總防禦, 總生命, 總速度, 爆擊率(%), 爆擊傷害(%), 狀態命中(%), 狀態抗性(%), 被動加成類型, 被動額外效果`

- **加成欄**：裝備加成（攻/防/血）填實際數值；速度加成一般為 0 或小正整數。
- **總值欄**：= 基礎 + 加成。
- **爆擊率(%)**：填角色**完整解鎖後的固有總爆率**（含基礎 15% + 固有加成 + 潛能加成），例如 `15+12+15=42` 就填 `42.0`。
- **爆擊傷害(%)**：無特殊加成填 `150.0`。
- **被動加成類型**：填潛能解鎖的屬性類型，如 `暴擊率`、`攻擊力%`、`狀態命中` 等；無潛能加成填空。
- **被動額外效果**：填被動技能的附帶效果說明（非潛能），如 `暴擊率 +15%`；無則留空。
- **其他沒提的欄位**：與常態角色相同（加成為 0，抗性為 0）。

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
