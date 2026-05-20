#!/usr/bin/env python3
"""
gen_chars_data.py

從根目錄 chars.csv 自動生成 tier-list/chars-data.js。

用法：
    python scripts/gen_chars_data.py
"""

import csv
import re
from datetime import date
from pathlib import Path

REPO_ROOT     = Path(__file__).parent.parent
CHARS_CSV     = REPO_ROOT / "chars.csv"
CHARS_DATA_JS = REPO_ROOT / "tier-list" / "chars-data.js"

# chars.csv 欄位索引（從第 2 行起，0-based）
COL_NAME      = 0
COL_STAR      = 1
COL_ELEMENT   = 2
COL_ROLE      = 3
COL_TOTAL_ATK = 12
COL_TOTAL_DEF = 13
COL_TOTAL_HP  = 14
COL_TOTAL_SPD = 15
COL_CRIT_RATE = 16
COL_CRIT_DMG  = 17


def read_version(csv_path: Path) -> str:
    """讀取 chars.csv 第一行的版本標頭，例如 'version:20260518' → '20260518'"""
    first_line = csv_path.read_text(encoding="utf-8").splitlines()[0]
    m = re.match(r"version:(\d+)", first_line)
    return m.group(1) if m else date.today().strftime("%Y%m%d")


def parse_chars(csv_path: Path) -> list[dict]:
    lines = csv_path.read_text(encoding="utf-8").splitlines()
    reader = csv.reader(lines[2:])  # 跳過版本標頭 + 欄位名稱行
    entries = []
    for row in reader:
        if not row or not row[COL_NAME].strip():
            continue
        entries.append({
            "name":     row[COL_NAME].strip(),
            "star":     int(row[COL_STAR]),
            "element":  row[COL_ELEMENT].strip(),
            "role":     row[COL_ROLE].strip(),
            "totalSpd": int(row[COL_TOTAL_SPD]),
            "totalAtk": int(row[COL_TOTAL_ATK]),
            "totalDef": int(row[COL_TOTAL_DEF]),
            "totalHp":  int(row[COL_TOTAL_HP]),
            "critRate": float(row[COL_CRIT_RATE]),
            "critDmg":  float(row[COL_CRIT_DMG]),
        })
    return entries


def format_entry(e: dict) -> str:
    return (
        f'  {{name:"{e["name"]}",star:{e["star"]},element:"{e["element"]}",'
        f'role:"{e["role"]}",totalSpd:{e["totalSpd"]},totalAtk:{e["totalAtk"]},'
        f'totalDef:{e["totalDef"]},totalHp:{e["totalHp"]},'
        f'critRate:{e["critRate"]},critDmg:{e["critDmg"]}}}'
    )


def main():
    version = read_version(CHARS_CSV)
    entries = parse_chars(CHARS_CSV)

    lines = [
        f"// 自動從 chars.csv 轉換，版本：{version}",
        "// 欄位：name, star, element, role, totalSpd, totalAtk, totalDef, totalHp, critRate, critDmg",
        "window.CHARS_DATA = [",
    ]
    for e in entries:
        lines.append(format_entry(e) + ",")
    lines.append("];\n")

    CHARS_DATA_JS.write_text("\n".join(lines), encoding="utf-8")
    print(f"OK: {CHARS_DATA_JS} ({len(entries)} chars, version {version})")


if __name__ == "__main__":
    main()
