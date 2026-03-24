# ArkRecode Tools — 開發者筆記

> 此文件僅供開發參考，不在前台顯示。前台渲染的是 `README.md`。

---

## 專案架構

```
ArkRecodetools/
├── index.html            # 首頁（工具導覽）
├── battle-recorder.html  # 對戰紀錄器（原 index.html）
├── character-db.html     # 角色資料庫
├── equip-optimizer.html  # 配裝計算器
├── chars.csv             # 角色資料
├── build_recom.csv       # 推薦配裝資料
├── README.md             # 使用者說明（前台渲染）
└── dev_note.md           # 本文件（開發者專用）
```

**技術棧：** React 18 UMD + Babel Standalone 7.23.10 + Tailwind CSS CDN  
**部署：** GitHub Pages，push 即部署  
**資料儲存：** 瀏覽器 localStorage，無後端

---

## JSX 開發注意事項

- **Template literal 禁用**：Babel Standalone 與 JSX 反引號不相容，一律改用字串拼接
- `import` 語句不可用，統一以 `const { useState, ... } = React` 取用
- `export default function App()` 必須改為 `function App()`
- `dangerouslySetInnerHTML` 目前用於 ManualPicker 與 ResCard 的顏色渲染，資料來源為自有 CSV，若未來支援使用者匯入第三方資料前應改為 React 元件渲染

詳見：`arkrecode_dev_spec_v2.5.0.docx`、`arkrecode_jsx_history.docx`

---

## 版本對照

| 元件 | JSX 內部版本 | HTML Release 版本 |
|---|---|---|
| 配裝計算器 | v2.x | v1.x |
| 對戰紀錄器 | — | v2.x |
| 角色資料庫 | — | 以日期為準 |

---

## 關鍵公式與計算邏輯

### 速度套裝加成
`速度加成 = base_spd × 0.16`（僅乘以 base_spd，不含 bonus_spd）

### 基礎暴擊
- 全角色通用底層：爆率 15%、爆傷 150%
- 固有加成（innate_cr / innate_cd）從角色技能被動取得，不可混入 base 屬性

### 防禦公式
`傷害減免 = 1 / (DEF / 300 + 1)`

### 傷害指數
`傷害指數 = 攻擊 × (min(爆率, 100%) × (爆傷/100) + (1 - min(爆率, 100%)) × 1)`

---

## chars.csv 格式

```
version:YYYYMMDD
角色本名,星級,屬性,職業,base_atk,base_def,base_hp,base_spd,
bonus_atk,bonus_def,bonus_hp,bonus_spd,innate_cr(整數%),innate_cd(整數%),
innate_hit(整數%),innate_res(整數%),passive說明
```

- 第一行必須是 `version:YYYYMMDD`，日期改變才觸發使用者重新載入
- 角色本名須與 `build_recom.csv` 完全一致（含空格、全形字元）
- innate_cr 填整數（如 `23` 代表 23%），工具內部自動換算為 `(rawCr - 15) / 100`

---

## build_recom.csv 格式

```
version:YYYYMMDD
角色名,方案編號,方案名稱,方案說明,套裝1,套裝2,套裝3,
速度下限,速度上限,爆率下限,爆率上限,爆傷下限,攻擊下限,防禦下限,生命下限,命中下限,抗性下限,
權重_攻擊,權重_爆率,權重_爆傷,權重_命中,權重_抗性,權重_生命,權重_防禦,速度鞋,TAG
```

### 欄位注意事項
- 爆率、爆傷、命中、抗性下限填**整數 %**（85 代表 85%），不是小數
- 攻擊、防禦、生命下限填**固定數值整數**
- 速度鞋：`1` = 建議速度主屬鞋；空白 = 不限
- TAG 以分號分隔

### 有效 TAG 清單
`速度型` / `輸出型(高速)` / `輸出型(低速)` / `坦克型` / `肉輸出` / `控制型` / `解控型` / `拉條型` / `絕對一速` / `對策額外回合` / `對策非攻擊技能`

### 常見錯誤
- ❌ 角色名不一致：Popup 靜默失敗，無錯誤提示
- ❌ % 值填小數（應填整數）
- ❌ 版本日期沒更新（使用者快取不更新）
- ❌ 方案編號重複（後面的覆蓋前面的）

### 範例
```csv
version:20260314
望月,1,一速啟動,速度 245+ 確保先手，搭配魂書燒魂,速度,,,245,,85,,200,,,,,,0.4,0.1,0.3,0,0,0,0,1,絕對一速
艾瑞兒,1,極速坦克,速度優先吸收傷害保護隊伍,復仇,,,180,,,,,,,20000,,,0,0,0,0,0,0.7,0.4,1,肉輸出;坦克型
艾瑞兒,2,純坦肉盾,不需速度時的極致坦度方案,生命,,,,,,,,,1400,26000,,,0,0,0,0,0,1,0.6,0,坦克型
```

---

## localStorage 衝突排查

工具啟動時若角色資料顯示為舊版，優先檢查：
1. `arkrecode_chars_version` 的值是否與 CSV 第一行版本一致
2. `arkrecode_build_recom_data` 快取是否過舊（v1.3.6 起每次都重新 fetch）
3. 開發測試時可在 DevTools Console 執行：
```js
Object.keys(localStorage).filter(k => k.startsWith('arkrecode')).forEach(k => localStorage.removeItem(k))
```

---

## 待辦與規劃

### 近期
- [ ] 對比模式：勾選兩組方案後高亮顯示屬性增減差異
- [ ] 匯出配裝：複製文字摘要至剪貼簿，或下載 JSON
- [ ] index.html 各工具頁加入統一導覽選單（Hamburger）

### 中期
- [ ] TAG 系統頁面：角色培養深度分析
- [ ] dangerouslySetInnerHTML 替換為 React 元件渲染（XSS 防護）
- [ ] 移除 Babel Standalone，改用 Vite 編譯部署

### 長期
- [ ] 套裝小圖示顯示（Emoji 方案或遊戲圖片 Sprite）
- [ ] 社群功能：分享配裝方案、公會統計

---

## 已知 Bug 與解法

| 問題 | 原因 | 解法 |
|---|---|---|
| 白屏 | Babel + JSX 內使用反引號 | 全部改字串拼接 |
| 推薦配裝讀不到 | localStorage 過度快取 | v1.3.6 改為每次 fetch |
| 角色切換設定消失 | `lockRes` 未使用 `res.charName` | 已修正，使用 charName |
| 候選池爆炸 | MAX_POOL_CAP 未設上限 | 硬上限 28，快速模式 14 |
