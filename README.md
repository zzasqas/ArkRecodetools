# ⚔ ArkRecode Tools

**星陨計劃 (Ark Re:Code)** 公會工具套件，純前端應用部署於 GitHub Pages。

## 📦 工具列表

| 工具 | 檔案 | 說明 |
|------|------|------|
| 📊 對戰記錄器 | `index.html` | 對戰記錄、歷史搜尋、策略推薦、速度計算器 |
| 👤 角色資料庫 | `character-db.html` | 角色搜尋、屬性篩選、中英文切換 |
| ⚙️ 配裝計算器 | `equip-optimizer.html` | AB 雙模式裝備優化，支援鎖定與跨角色分配 |

## 🔗 線上網址

`https://zzasqas.github.io/ArkRecodetools/`

---

## 📋 角色資料更新方式（chars.csv）

`chars.csv` 為配裝計算器的角色資料來源，**不需要使用者手動匯入**，頁面啟動時自動讀取。

### CSV 格式說明

```
version:YYYYMMDD       ← 第一列，版本號（更新日期），用於觸發自動更新
name,star,element,...  ← 標頭列（欄位見下表）
角色名,5,水,重裝,...   ← 資料列
```

| 欄位順序 | 欄位名 | 說明 |
|----------|--------|------|
| 0 | name | 角色名稱 |
| 1 | star | 星級（3/4/5） |
| 2 | element | 屬性（火/水/木/光/暗） |
| 3 | job | 職業（重裝/戰士/術師/先鋒/遊俠/牧師） |
| 4 | base_atk | 基礎攻擊（滿級，不含成長） |
| 5 | base_def | 基礎防禦 |
| 6 | base_hp | 基礎生命 |
| 7 | base_spd | 基礎速度 |
| 8 | bonus_atk | 成長攻擊（等級成長加成） |
| 9 | bonus_def | 成長防禦 |
| 10 | bonus_hp | 成長生命 |
| 11 | bonus_spd | 成長速度 |
| 12–15 | （保留欄位，填 0） | |
| 16 | crit_rate | 最終爆率%（含基礎 15%，如 27 = 含本體 12% 固有爆率） |
| 17 | crit_dmg | 最終爆傷%（含基礎 150%，如 200 = 含本體 50% 固有爆傷） |
| 18 | hit | 命中率%（如 6 = 6%） |
| 19 | res | 抗性%（如 18 = 18%） |
| 20+ | passive | 被動技能說明文字（選填） |

### 新增/更新角色步驟

1. 編輯 `chars.csv`，在第一列更新版本號（如 `version:20260401`）
2. 新增或修改角色資料列
3. Push 到 GitHub
4. 使用者**下次開啟頁面時**自動偵測版本更新並靜默更新角色資料

> 版本號相同時從瀏覽器 localStorage 快取讀取，不重新下載。

---

## 🛠 本地開發

直接用瀏覽器開啟 HTML 檔案即可，無需 build 步驟。

若需要測試 CSV 自動載入功能，需透過本機 HTTP server（避免 `fetch` 的 CORS 限制）：

```bash
# Python
python -m http.server 8080

# 或 Node.js
npx serve .
```

然後開啟 `http://localhost:8080/equip-optimizer.html`

---

*作者：米格歌 (zzasqas) · ArkRecode Guild Tools*
