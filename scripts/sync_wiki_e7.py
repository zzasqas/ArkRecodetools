"""從 Ark Re:Code Wiki 的 Members/Infotable 重建 assets/char-wiki-data.json。

用法：
    python scripts/sync_wiki_e7.py            # 重建並印出與舊檔的差異
    python scripts/sync_wiki_e7.py --dry-run  # 只印差異，不寫檔

為什麼要有這支：原本的 char-wiki-data.json 是一次性手動爬的，
Release 欄是 "?" 的列被漏掉、導致 Release/E7 兩欄整段往上錯位
（例：H154 Gabriel 被安上了 H156 Urd 的 2025-05-14 + Elena）。
改成腳本後每次重跑都對齊 ID，不會再錯位。

wiki 沒有 E7 那邊的上線日，`e7ReleaseDate` 沿用舊檔以 e7Name 對照帶入
（那是 E7 單位的屬性，跟 ARC 是哪隻角色無關，所以錯位不影響它）。
"""
import argparse, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "char-wiki-data.json"
ALIASES = ROOT / "assets" / "char-name-data.js"
URL = "https://arkrecodewiki.miraheze.org/wiki/Members/Infotable"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"


class FirstTable(HTMLParser):
    """抓第一個 <table> 的所有列。wiki 這頁三個 table 內容重複，取第一個即可。"""

    def __init__(self):
        super().__init__()
        self.done = self.in_table = self.in_cell = False
        self.rows, self.row, self.cell = [], [], []

    def handle_starttag(self, tag, attrs):
        if self.done:
            return
        if tag == "table" and not self.in_table:
            self.in_table = True
        elif self.in_table and tag == "tr":
            self.row = []
        elif self.in_table and tag in ("td", "th"):
            self.in_cell, self.cell = True, []

    def handle_endtag(self, tag):
        if self.done or not self.in_table:
            return
        if tag in ("td", "th") and self.in_cell:
            self.in_cell = False
            self.row.append(" ".join("".join(self.cell).split()))
        elif tag == "tr":
            if self.row:
                self.rows.append(self.row)
        elif tag == "table":
            self.in_table, self.done = False, True

    def handle_data(self, data):
        if self.in_cell:
            self.cell.append(data)


def scrape():
    html = urlopen(Request(URL, headers={"User-Agent": UA}), timeout=60).read().decode("utf-8")
    p = FirstTable()
    p.feed(html)
    if not p.rows:
        sys.exit("找不到表格，wiki 版面可能改了")
    head = p.rows[0]
    col = {name: head.index(name) for name in ("Name", "ID", "Star", "Attribute", "Class", "Release", "E7") if name in head}
    missing = {"Name", "ID", "Attribute", "Class", "Release", "E7"} - set(col)
    if missing:
        sys.exit(f"表頭缺欄位 {missing}，wiki 版面可能改了")

    out = []
    for r in p.rows[1:]:
        if len(r) <= max(col.values()):
            continue
        cid = r[col["ID"]]
        if not re.fullmatch(r"H\d{3}", cid):
            continue
        rel = r[col["Release"]]
        star = r[col["Star"]]
        out.append({
            "id": cid,
            "nameEN": r[col["Name"]],
            "attribute": r[col["Attribute"]],
            "cls": r[col["Class"]],
            "rarity": int(star[0]) if star[:1].isdigit() else 0,
            "releaseDate": "" if rel in ("?", "-") else rel,
            "e7Name": r[col["E7"]],
            "nameCN": "",
            "e7ReleaseDate": "",
        })
    return out


def load_name_cn():
    """從 char-name-data.js 撈 id -> 中文名。那是我們自己維護的母檔，比 wiki 準。"""
    if not ALIASES.exists():
        return {}
    txt = ALIASES.read_text(encoding="utf-8")
    return {cid: cn for cn, cid in re.findall(r"name:\s*'([^']*)'[^}]*?id:\s*'(H\d{3})'", txt)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    new = scrape()
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    old_by_id = {x["id"]: x for x in old}
    e7_dates = {x["e7Name"]: x["e7ReleaseDate"] for x in old if x.get("e7Name") and x.get("e7ReleaseDate")}
    name_cn = load_name_cn()

    for rec in new:
        rec["e7ReleaseDate"] = e7_dates.get(rec["e7Name"], "")
        rec["nameCN"] = name_cn.get(rec["id"]) or old_by_id.get(rec["id"], {}).get("nameCN", "")

    changed = [(r["id"], r["nameEN"], old_by_id[r["id"]].get("e7Name", ""), r["e7Name"])
               for r in new
               if r["id"] in old_by_id and old_by_id[r["id"]].get("e7Name", "") != r["e7Name"]]
    added = [r for r in new if r["id"] not in old_by_id]
    dropped = [x for x in old if x["id"] not in {r["id"] for r in new}]

    print(f"wiki {len(new)} 筆 / 舊檔 {len(old)} 筆")
    print(f"e7Name 有變動 {len(changed)} 筆：")
    for cid, en, o, n in changed:
        print(f"  {cid} {en}: {o or '(空)'} -> {n or '(空)'}")
    print(f"新增 {len(added)} 筆：{', '.join(r['id'] for r in added) or '無'}")
    print(f"舊檔有、wiki 沒有 {len(dropped)} 筆：{', '.join(x['id'] for x in dropped) or '無'}")

    if args.dry_run:
        print("\n--dry-run，未寫檔")
        return
    OUT.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n已寫入 {OUT}")


if __name__ == "__main__":
    main()
