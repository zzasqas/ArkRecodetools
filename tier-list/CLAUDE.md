# CLAUDE.md — Tier List 工具指引

本資料夾包含社群 Tier List 編輯器及後端伺服器說明。

---

## 架構概覽

```
tier-list/
├── tier-list.html     # 前端編輯器（React + Babel CDN，純前端）
├── chars-data.js      # 角色資料（element/role/star，供 tier-list.html 讀取）
│                      # ⚠️ 由根目錄 chars.csv 手動生成，不直接維護此檔
└── CLAUDE.md          # 本檔
                       # （tier-list/chars.csv 已刪除，唯一來源是根目錄 ../chars.csv）

assets/
└── official-tierlist.json  # 官方分級快照（由開發者維護，character-db 讀取此檔）

server/
├── server.js          # Express 後端（部署於 Railway）
├── submissions.jsonl  # 社群提交紀錄（JSONL，每行一筆）
└── package.json
```

---

## 前端操作流程

### 社群使用者投票

1. 開啟 `tier-list.html`，左上角填入**作者暱稱**（必填）
2. 從底部「池子」拖曳角色到 S/A/B/C/D Tier 列
3. 點「🗳️ 投票模式」鎖定結構後，點「📤 提交排名」
4. 每個模式**每週限提交一次**，提交後產生分享連結

### 開發者更新官方分級

1. 在 `tier-list.html` 排好各模式的 Tier List
2. 點工具列「**★ 官方匯出**」按鈕（金色）
3. 下載 `official-tierlist.json`，覆蓋到 `assets/` 資料夾
4. commit + push → `character-db.html` 自動讀取並顯示 tier badge

---

## localStorage 鍵名對照

| key | 說明 |
|-----|------|
| `tierlist_author` | 作者暱稱 |
| `tierlist_modes` | 模式清單（JSON 陣列） |
| `tierlist_mode_{id}` | 各模式的 tiersConfig + tierMembers + charNotes |
| `tierlist_hidden` | 隱藏角色集合 |
| `tierlist_keep_noimage` | 無圖但保留顯示的角色 |
| `tierlist_device_id` | 瀏覽器端唯一 UUID（投票身份識別用） |
| `tierlist_submitted` | `{ modeId: { week } }` 本週已提交記錄 |
| `tierlist_vote_mode` | `'1'` = 投票模式開啟 |

---

## official-tierlist.json 格式

```json
{
  "updated": "YYYY-MM-DD",
  "tiersConfig": [
    { "id": "S", "name": "S", "color": "#991b1b", "textColor": "#fca5a5" },
    { "id": "A", "name": "A", "color": "#92400e", "textColor": "#fcd34d" },
    { "id": "B", "name": "B", "color": "#3f6212", "textColor": "#bef264" },
    { "id": "C", "name": "C", "color": "#1e3a5f", "textColor": "#93c5fd" },
    { "id": "D", "name": "D", "color": "#3b0764", "textColor": "#c4b5fd" }
  ],
  "modes": {
    "overall": { "S": ["角色名CN", ...], "A": [...], "B": [], "C": [], "D": [] },
    "gvg":     { "S": [], "A": [], "B": [], "C": [], "D": [] },
    "pvp":     { "S": [], "A": [], "B": [], "C": [], "D": [] },
    "rta":     { "S": [], "A": [], "B": [], "C": [], "D": [] }
  }
}
```

角色名使用 `nameCN`（與 CHARACTER_DATA 對齊）。未列出的角色在 character-db 顯示無 badge。

---

## 後端 Server（Railway）

**URL：** `https://arkrecodetools-production.up.railway.app`

### 環境變數（必填）

| 變數 | 說明 |
|------|------|
| `ADMIN_TOKEN` | 管理員下載 token，**必須設定**，不可留預設值 `changeme` |
| `ALLOWED_ORIGINS` | 逗號分隔的允許 origin，預設 `https://zzasqas.github.io,...` |
| `PORT` | Railway 自動注入，不需手動設定 |

### API 端點

```
POST /submit
  Body: { deviceId, nickname, mode, payload: { tierMembers: { S:[...], A:[...], ... } } }
  限制：同 deviceId + mode + week 只能提交一次

GET /admin/download?token=TOKEN&mode=overall&week=2026-W21
  回傳 JSON 陣列（week 和 mode 為可選篩選）

GET /
  Health check，回傳 { status, total, week, thisWeek }
```

---

## 資料分析 Pipeline

### 取得資料

```bash
curl "https://arkrecodetools-production.up.railway.app/admin/download?token=TOKEN&mode=overall" \
  -o submissions_overall.json
```

### ETL：展開為 CSV（每角色一欄）

```python
import json, csv, requests

TIERS  = ["S","A","B","C","D"]
SCORE  = {"S":5,"A":4,"B":3,"C":2,"D":1,"unranked":0}
TOKEN  = "YOUR_TOKEN"
MODE   = "overall"

# 可信用戶加權（key = tierlist_device_id，value = 倍數）
# deviceId 取得方式：DevTools → Application → LocalStorage → tierlist_device_id
WEIGHTS = {
    "uuid-大老甲": 3.0,
    "uuid-大老乙": 2.0,
}

data = requests.get(
    "https://arkrecodetools-production.up.railway.app/admin/download",
    params={"token": TOKEN, "mode": MODE}
).json()

all_chars = sorted({n for row in data for names in row["payload"]["tierMembers"].values() for n in names})

with open(f"submissions_{MODE}.csv", "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["timestamp","nickname","deviceId","week","weight"] + all_chars)
    for row in data:
        char2tier = {n: tid for tid, names in row["payload"]["tierMembers"].items() for n in names}
        w = WEIGHTS.get(row["deviceId"], 1.0)
        writer.writerow([row["timestamp"], row["nickname"], row["deviceId"], row["week"], w]
                        + [char2tier.get(c, "unranked") for c in all_chars])
```

### 統計指標（Google Sheets 公式）

假設資料從第 2 行起，D 欄 = deviceId，E 欄 = weight，F 欄起 = 各角色。

```
# 加權平均分（F欄某角色，陣列公式）
=SUMPRODUCT(E2:E200 * IF(F2:F200="S",5,IF(F2:F200="A",4,IF(F2:F200="B",3,IF(F2:F200="C",2,IF(F2:F200="D",1,0)))))) / SUMPRODUCT(E2:E200)

# 上架率
=COUNTIF(F2:F200,"<>unranked") / COUNTA(F2:F200)

# 共識度（最多人選的 tier / 上架票數）
=MAX(COUNTIF(F2:F200,"S"),COUNTIF(F2:F200,"A"),COUNTIF(F2:F200,"B"),COUNTIF(F2:F200,"C"),COUNTIF(F2:F200,"D")) / COUNTIF(F2:F200,"<>unranked")

# 爭議度（加權分標準差，陣列公式）
=STDEV(IF(F2:F200="S",5,IF(F2:F200="A",4,IF(F2:F200="B",3,IF(F2:F200="C",2,IF(F2:F200="D",1,IF(F2:F200="unranked","")))))))

# 各 Tier 得票分布
=COUNTIF(F2:F200,"S")  ← 分別做 S/A/B/C/D
```

### 跨模式比較

每個 mode 匯出一份 CSV，在第三個 sheet 用 `=綜合!加權分欄 - gvg!加權分欄` 計算差距。差距最大的角色 = 在不同場景評價落差最大。

---

## 注意事項

- `deviceId` 是瀏覽器 localStorage 生成的 UUID，**換裝置或清快取就會改變**。加權名單需定期確認。
- `submissions.jsonl` 在 Railway 重新部署時**不會消失**（持久化在磁碟），但 Railway 免費方案有 volume 限制，建議定期用 `/admin/download` 備份。
- 新增角色後，`chars-data.js` 須與根目錄 `../chars.csv`、`assets/char-name-data.js` 同步更新。

## chars-data.js 更新方式

`tier-list/chars-data.js` 從根目錄 `chars.csv` **自動生成**，請勿手動編輯此檔案。

**新角色加入步驟：**
1. 在根目錄 `chars.csv` 末行加入角色數值（同時更新版本標頭）
2. 執行生成腳本：
   ```bash
   python scripts/gen_chars_data.py
   ```
3. 確認 `tier-list/chars-data.js` 第一行版本號已更新，角色數量正確
