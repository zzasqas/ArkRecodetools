#!/usr/bin/env python3
"""
gen_roster_catalog.py — 產生 roster-catalog.js 給 roster-viewer.html 用

合併兩個來源成一份「完整 id→角色」目錄（roster-viewer 靠 <script> 載，免 fetch、本地也能跑）：
  - assets/char-wiki-data.json（本 repo）：id → nameEN / attribute(元素) / cls(職業) / rarity(星)，236 全有
  - sniffer 的 data/characters.json：id → 中文名（189，補中文名；缺的用 nameEN）

新角色出現時，跟著兩週更新流程跑一次即可（gen_chars_data.py 旁邊順手跑）。
用法：python scripts/gen_roster_catalog.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "assets" / "char-wiki-data.json"
CHARS = Path(r"C:\Users\zzasq\OneDrive\Documents\arkrecode sniffer"
             r"\arkrecode_gvg_sniffer\data\characters.json")
OUT = ROOT / "roster-catalog.js"

ATTR_ZH = {"Flame": "火", "Water": "水", "Nature": "木", "Light": "光", "Dark": "暗"}
CLS_ZH = {"Warrior": "戰士", "Caster": "術師", "Sniper": "狙擊",
          "Vanguard": "先鋒", "Defender": "重裝", "Medic": "醫療"}


def main():
    wiki = json.loads(WIKI.read_text(encoding="utf-8"))
    cn = {}
    if CHARS.exists():
        cn = {c["id"]: c["name"] for c in json.loads(CHARS.read_text(encoding="utf-8"))["characters"]}
    else:
        print(f"⚠️ 找不到 {CHARS}，中文名將全部退回英文名")

    catalog = {}
    for c in wiki:
        cid = c.get("id")
        if not cid or not str(cid).startswith("H"):
            continue
        catalog[cid] = {
            "name": cn.get(cid) or c.get("nameEN") or cid,
            "nameEN": c.get("nameEN", ""),
            "element": ATTR_ZH.get(c.get("attribute"), ""),
            "cls": CLS_ZH.get(c.get("cls"), ""),
            "rarity": c.get("rarity") or 0,
        }

    body = json.dumps(catalog, ensure_ascii=False, indent=0).replace("\n", "")
    zh = sum(1 for v in catalog.values() if v["name"] != v["nameEN"])
    OUT.write_text(
        f"// 自動由 scripts/gen_roster_catalog.py 產生，勿手改\n"
        f"// {len(catalog)} 角色（{zh} 有中文名）；合併 char-wiki-data.json + sniffer characters.json\n"
        f"window.ROSTER_CATALOG = {body};\n",
        encoding="utf-8")
    print(f"已產生 {OUT}：{len(catalog)} 角色，{zh} 有中文名")


if __name__ == "__main__":
    main()
