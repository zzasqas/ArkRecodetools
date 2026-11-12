"""從遊戲 master.db 生成 research/未上市角色清單.md 和 research/未上市角色技能.md。

用法（master.db 取得方式見 CLAUDE.local.md）：
    python scripts/gen_unreleased_list.py <master.db>

「未上市」＝ master.db 有、母檔 assets/char-name-data.js 還沒收、wiki 也沒上市日的五星 H 角色。
看「配套」欄：活動招募/神秘/深淵/支線都有＝接下來幾檔；全空＝還早。
wiki（assets/char-wiki-data.json）只拿來補英文名和 E7 對應；wiki 2026-11 起擋爬蟲（403），
sync_wiki_e7.py 跑不動，所以改用 master.db 當主來源（wiki 本來就是解包它來的）。

技能表只放本機：research/ 在 .gitignore，未上市角色技能是解包資料，不公開。
需要 opencc（pip install opencc-python-reimplemented），簡中→繁中。
"""
import json
import re
import sqlite3
import sys
from datetime import date
from pathlib import Path

from opencc import OpenCC

ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "assets" / "char-wiki-data.json"
NAMES = ROOT / "assets" / "char-name-data.js"
OUT_LIST = ROOT / "research" / "未上市角色清單.md"
OUT_SKILL = ROOT / "research" / "未上市角色技能.md"

ATTR = {"Fire": "火", "Ice": "水", "Earth": "木", "Light": "光", "Dark": "暗"}
CLS = {"Warrior": "戰士", "Defender": "重裝", "Vanguard": "先鋒",
       "Caster": "術師", "Sniper": "狙擊", "Medic": "醫療"}
t2 = OpenCC("s2tw").convert


def clean(s):
    """技能描述的標記：[文字:ID:型別] → 文字；[整句:AWAKEN] → 〔覺醒：整句〕；<br> → 換行符號。"""
    s = s or ""
    for _ in range(3):  # 巢狀最多兩層，由內往外剝
        s = re.sub(r"\[([^\[\]:]*):[^\[\]:]*:(?!AWAKEN\])[^\[\]]*\]", r"\1", s)
    s = re.sub(r"\[:AWAKEN\]", "", s)
    s = re.sub(r"\[([^\[\]]*):AWAKEN\]", r"〔覺醒：\1〕", s)
    return t2(s.replace("<br>", " ／ ").replace("|", "｜"))


def official_name(acts, hid):
    """活動/版控的 Name 欄是官方繁中（例「活動招募-執法者維爾莉特」），有就用它。"""
    for key in (f"AcyivitySummon{hid}", f"MysticSummon{hid}", f"Version_{hid}"):
        if key in acts:
            return re.split(r"[-，,]", acts[key])[-1].strip()
    return None


def main(db_path):
    db = sqlite3.connect(db_path)
    L = dict(db.execute("select Key, Value from CHS"))
    acts = dict(db.execute("select ID, Name from Activity"))
    js = NAMES.read_text(encoding="utf-8")
    wiki = {e["id"]: e for e in json.loads(WIKI.read_text(encoding="utf-8"))}
    roles = db.execute("select ID, NAME, InitStar, Element, Job from Role "
                       "where ID glob 'H[0-9][0-9][0-9]' and IsHero = '1' and InitStar = '5' order by ID").fetchall()
    # 母檔沒收的老角色（H001 等）靠 wiki 的上市日排除；wiki 停在 2026-09，之後上市的都已進母檔
    todo = [r for r in roles if f"id: '{r[0]}'" not in js and not wiki.get(r[0], {}).get("releaseDate")]
    skills = {r[0]: r for r in db.execute(
        "select ID, NAME, Description, SkillType, CoolDown, SoulSkillDescription, ReferanceSkillID from Skill")}

    rows, ready = [], {}
    for hid, nm, star, el, job in todo:
        name = official_name(acts, hid) or t2(L.get(nm, nm))
        mark = lambda p: "✓" if p + hid in acts else ""
        tags = [mark("AcyivitySummon"), mark("MysticSummon"), mark("Fantasy_"), mark("Branch")]
        ready[hid] = sum(map(bool, tags))
        w = wiki.get(hid, {})
        rows.append((hid, name, w.get("nameEN") or "—", ATTR.get(el, el), CLS.get(job, job),
                     *tags, w.get("e7Name") or "—"))
    # 配套越齊越可能先出：排前面
    rows.sort(key=lambda r: (-ready[r[0]], r[0]))

    head = "| ID | 名稱 | 英文名 | 屬性 | 職業 | 活動招募 | 神秘招募 | 深淵 | 支線 | E7 對應 |\n|---|---|---|---|---|---|---|---|---|---|"
    OUT_LIST.write_text(f"""# 未上市角色清單

> 由 `scripts/gen_unreleased_list.py` 從遊戲 master.db 生成（{date.today()}）。**不要手改**，資料變了就重跑腳本。

master.db 有、母檔 `assets/char-name-data.js` 還沒收的五星，共 {len(rows)} 隻。
後四欄是活動配套有沒有建好：四欄都有的通常是接下來幾檔的活動角色；神秘招募＝限定池；全空＝還早（或母檔漏收的老角色）。
名稱有官方繁中就用官方的，沒有的是簡中轉繁，可能跟正式譯名不同。技能見 `未上市角色技能.md`（本機）。

{head}
{chr(10).join("| " + " | ".join(r) + " |" for r in rows)}
""", encoding="utf-8")

    out = [f"# 未上市角色技能\n\n> 由 `scripts/gen_unreleased_list.py` 從 master.db 生成（{date.today()}）。"
           "解包資料，**只放本機不公開**。數字是一級的基礎值，技能升級、覺醒會再加。\n"
           "> 「魂燃」欄＝消耗魂力後的追加效果；冷卻是回合數。順序跟清單一樣，配套齊的在前。\n"]
    for r in rows:
        hid = r[0]
        out.append(f"\n## {hid} {r[1]}（{r[3]}／{r[4]}）\n\n| 技能 | 名稱 | 類型 | 冷卻 | 效果 | 魂燃 |\n|---|---|---|---|---|---|")
        for sid in sorted(k for k in skills if re.fullmatch(hid + r"S\d+", k)):
            _, nm, desc, typ, cd, soul, ref = skills[sid]
            kind = "被動" if typ == "Passive" else (f"追加（{ref[-2:]} 觸發）" if ref else "主動")
            out.append(f"| {sid[len(hid):]} | {clean(L.get(nm, nm))} | {kind} | {cd or '—'} | {clean(L.get(desc, desc)) or '—'} | {clean(L.get(soul, soul)) or '—'} |")
    OUT_SKILL.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"OK: {OUT_LIST.name} {len(rows)} 隻（配套齊 {sum(v >= 3 for v in ready.values())}）、{OUT_SKILL.name}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
