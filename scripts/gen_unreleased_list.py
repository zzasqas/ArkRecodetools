"""從 assets/char-wiki-data.json 生成 research/未上市角色清單.md。

用法：
    python scripts/gen_unreleased_list.py

為什麼要有這支：wiki 的 Members/Infotable 是解包 MASTER DB 來的，
新角色多半在正式上線前就有 id / 屬性 / 職業（極少數突然出的新角或大版本
更新才會查不到）。所以「下一隻活動角色是誰、什麼屬性職業」不用等上線，
翻這份清單就有——省掉每次開 main.py 攔流量或翻 wiki 網頁。

資料流：wiki（解包 MASTER DB）→ sync_wiki_e7.py → char-wiki-data.json → 本腳本
更新時機：跑完 sync_wiki_e7.py 之後順手跑一次。
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "assets" / "char-wiki-data.json"
NAMES = ROOT / "assets" / "char-name-data.js"
OUT = ROOT / "research" / "未上市角色清單.md"

ATTR = {"Flame": "火", "Water": "水", "Nature": "木", "Light": "光", "Dark": "暗"}
CLS = {"Warrior": "戰士", "Defender": "重裝", "Vanguard": "先鋒",
       "Caster": "術師", "Sniper": "狙擊", "Medic": "醫療"}

wiki = json.loads(WIKI.read_text(encoding="utf-8"))
js = NAMES.read_text(encoding="utf-8")
in_master = {e["id"] for e in wiki if f"id: '{e['id']}'" in js}


def row(e):
    return (f"| {e['id']} | {e['nameEN']} | {ATTR.get(e['attribute'], e['attribute'])} "
            f"| {CLS.get(e['cls'], e['cls'])} | {e['rarity']}★ | {e.get('e7Name') or '—'} |")


unreleased = [e for e in wiki if not e["releaseDate"] and e["attribute"] and e["id"] not in in_master]
unknown = [e for e in wiki if not e["attribute"] and e["id"] not in in_master]
backfill = [e for e in wiki
            if e["releaseDate"] and e["rarity"] == 5 and e["id"] not in in_master]

head = "| ID | 英文名 | 屬性 | 職業 | 星級 | E7 對應 |\n|---|---|---|---|---|---|"
md = f"""# 未上市角色清單

> 由 `scripts/gen_unreleased_list.py` 從 `assets/char-wiki-data.json` 生成（{date.today()}）。
> **不要手改**，資料變了就重跑腳本。

wiki 的 Members/Infotable 是解包 MASTER DB 來的，新角色通常上線前就有 id / 屬性 / 職業。
下一隻活動角色是誰、什麼屬性職業，翻這裡就有，不用開 `main.py` 攔流量。
拿到 id 之後照 sniffer `docs/更新角色SOP.md` 走即可（數值仍要等角色實裝才有）。

母檔 `assets/char-name-data.js` 已收 {len(in_master)} 隻；wiki 共 {len(wiki)} 筆。

## 未上市（wiki 已有屬性職業，共 {len(unreleased)} 隻）

{head}
{chr(10).join(row(e) for e in unreleased)}

## 只有 ID、資料還沒爬到（共 {len(unknown)} 隻）

wiki 那邊也還沒填，這種才需要等實裝或攔流量。

{', '.join(f"`{e['id']}` {e['nameEN']}" for e in unknown)}

## 已上市但母檔未收的五星（共 {len(backfill)} 隻）

「母檔」指 `assets/char-name-data.js`。這些多半 sniffer 的 `data/characters.json`
已經有（那份另有來源），只是本 repo 沒收；補進母檔後 battle-recorder / character-db
才看得到。不影響自動化，哪天要補資料再看這裡。

{head}
{chr(10).join(row(e) for e in sorted(backfill, key=lambda e: e['releaseDate']))}
"""
OUT.write_text(md, encoding="utf-8")
print(f"OK: {OUT}  未上市 {len(unreleased)} / 待爬 {len(unknown)} / 已上市未收五星 {len(backfill)}")
