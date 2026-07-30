"""
把 rta_raw.json（5月版，欄位完整）的右側資料 merge 進 rta_2026-07-25.json。
匹配 key: name（簡體中文名）
"""
import json, re

RAW  = r"C:\Users\zzasq\ArkRecodetools\research\data\rta_raw.json"
JUL  = r"C:\Users\zzasq\ArkRecodetools\research\data\rta_2026-07-25.json"
OUT  = r"C:\Users\zzasq\ArkRecodetools\research\data\rta_2026-07-25.json"

def clean(v):
    if v is None or str(v).strip() in ("nan", ""):
        return None
    return str(v).strip()

raw = json.load(open(RAW, encoding="utf-8"))
jul = json.load(open(JUL, encoding="utf-8"))

# raw Sheet1: row 0 = 標題, row 1 = header, row 2+ = data
header = raw["Sheet1"][1]
# fixed column indices (verified from header)
C = {
    "name":        4,
    "equip":       14,   # 装备推荐
    "mainStats":   15,   # 项链戒指鞋子主属性
    "substats":    16,   # 有效装备词条
    "panel":       17,   # 面板推荐
    "bond":        18,   # 羁绊推荐
    "team":        19,   # 队友搭配
    "counter":     20,   # 常见反制手段
    "newbieRec":   21,   # 是否推荐萌新练
    "breakthrough":22,   # 角色突破建议
    "potential":   23,   # 潜能建议
    "pveRole":     24,   # PVE作用
    "rtaOrder":    25,   # RTA顺序
    "arenaComment":26,   # 竞技场简评
    "tips":        29,   # Tips
}

def get(row, col):
    v = clean(row[col]) if col < len(row) else None
    return v

# Build name → raw row lookup
raw_lookup = {}
for row in raw["Sheet1"][2:]:
    name = get(row, C["name"])
    if name:
        raw_lookup[name] = row

# Merge
matched, unmatched = 0, []
for entry in jul["rows"]:
    raw_row = raw_lookup.get(entry["name"])
    if raw_row is None:
        unmatched.append(entry["name"])
        continue
    matched += 1
    for key, col in C.items():
        if key == "name":
            continue
        v = get(raw_row, col)
        if v:
            entry[key] = v

# Update metadata
jul["columnsNotCaptured"] = []
jul["columnsCaptured"] += [k for k in C if k not in ("name",) and k not in jul["columnsCaptured"]]

json.dump(jul, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"Merged: {matched} rows  |  No match (new chars): {len(unmatched)}")
if unmatched:
    print("Unmatched:", unmatched)
