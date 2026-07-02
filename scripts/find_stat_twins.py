#!/usr/bin/env python3
"""
find_stat_twins.py

從根目錄 chars.csv 找出「數值完全相同」的角色群組，分「強化前（基礎值）」
與「強化後（總值）」兩種視角，輸出成一個獨立的靜態 HTML 報告
（stat-twins.html，可直接雙擊瀏覽器開啟，內建切換）。

排除三星角色（雜訊太多，暫不分析）。

用法：
    python scripts/find_stat_twins.py

說明文件：見根目錄 STAT_TWINS.md
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
CHARS_CSV = REPO_ROOT / "chars.csv"
OUT_HTML  = REPO_ROOT / "stat-twins.html"

COL_NAME, COL_STAR, COL_ELEMENT, COL_ROLE = 0, 1, 2, 3
COL_BASE_ATK, COL_BASE_DEF, COL_BASE_HP, COL_BASE_SPD = 4, 5, 6, 7
COL_TOTAL_ATK, COL_TOTAL_DEF, COL_TOTAL_HP, COL_TOTAL_SPD = 12, 13, 14, 15

ELEM_CLASS = {"火": "fire", "水": "water", "木": "wood", "光": "light", "暗": "dark"}

# 人工命名的模板花名，key = (星級, 基礎值 tuple)。
# 兩種視角（強化前/強化後）都用「基礎值」當作角色所屬模板的唯一識別，
# 這樣同一批角色在「強化後」被練度拆開成多個小群組時，仍會沿用同一個模板名稱，
# 方便看出「這些角色本來是同一套骨架，只是點數點法不同」。
#
# 新角色若剛好湊出新的共用群組，這裡沒有對應名稱時，會自動 fallback 成
# 「{職業}共用模板」，想要花名的話手動加一行到這個字典即可。
TEMPLATE_LABELS: dict[tuple[int, tuple[int, int, int, int]], str] = {
    (5, (889, 592, 5364, 109)): "主流戰士模板",
    (5, (889, 673, 4879, 111)): "平衡型術師模板",
    (5, (989, 473, 5364, 113)): "脆皮爆發先鋒模板",
    (5, (961, 683, 4152, 106)): "低血高防術師模板",
    (5, (961, 522, 4718, 116)): "均衡先鋒模板",
    (5, (961, 536, 4556, 120)): "極速狙擊模板",
    (5, (816, 620, 5850, 102)): "高血戰士模板",
    (5, (671, 648, 5809, 106)): "肉盾重裝模板",
    (5, (925, 553, 5122, 112)): "標準狙擊模板",
    (5, (1070, 715, 4111, 108)): "高防術師模板",
    (5, (499, 694, 4435, 105)): "高防醫療輔助模板",
    (5, (989, 553, 5364, 109)): "戰士模板B",
    (5, (898, 571, 4879, 114)): "戰狙共用模板",
    (4, (753, 578, 5405, 103)): "4星標準戰士模板",
    (4, (671, 645, 5364, 97)): "4星重裝模板",
    (5, (1025, 652, 4475, 110)): "高爆發術師模板",
    (5, (807, 652, 3950, 105)): "醫療重裝模板",
    (5, (834, 585, 5364, 113)): "火戰士模板",
    (5, (1025, 585, 5122, 105)): "高攻戰士模板",
    (5, (907, 532, 5122, 112)): "先鋒模板B",
    (5, (943, 553, 5122, 115)): "高速戰士模板",
    (5, (499, 694, 4435, 115)): "醫療模板A",
    (5, (689, 690, 5647, 100)): "重裝狙擊模板",
    (5, (971, 582, 5567, 102)): "戰士模板C",
    (5, (735, 613, 5405, 115)): "戰士模板D",
    (5, (762, 634, 5728, 103)): "重裝模板B",
    (5, (471, 736, 4637, 102)): "醫療模板B",
    (5, (862, 511, 4960, 120)): "先鋒模板C",
    (5, (825, 599, 5769, 106)): "高防戰士模板",
    (4, (453, 662, 4152, 103)): "4星醫療模板",
    (4, (907, 462, 5001, 111)): "4星先鋒模板",
    (4, (780, 564, 4960, 106)): "4星狙擊模板",
    (4, (889, 561, 5203, 100)): "4星戰士模板B",
}


def parse_chars(csv_path: Path) -> list[dict]:
    lines = csv_path.read_text(encoding="utf-8").splitlines()
    reader = csv.reader(lines[2:])  # 跳過版本標頭 + 欄位名稱行
    entries = []
    for row in reader:
        if not row or not row[COL_NAME].strip():
            continue
        entries.append({
            "name": row[COL_NAME].strip(),
            "star": int(row[COL_STAR]),
            "element": row[COL_ELEMENT].strip(),
            "role": row[COL_ROLE].strip(),
            "base": (
                int(row[COL_BASE_ATK]), int(row[COL_BASE_DEF]),
                int(row[COL_BASE_HP]), int(row[COL_BASE_SPD]),
            ),
            "total": (
                int(row[COL_TOTAL_ATK]), int(row[COL_TOTAL_DEF]),
                int(row[COL_TOTAL_HP]), int(row[COL_TOTAL_SPD]),
            ),
        })
    return entries


def label_for(star: int, role: str, chars: list[dict]) -> str:
    """依成員的基礎值 family 找花名；成員基礎值不一致（跨模板巧合撞總值）時 fallback。"""
    bases = {c["base"] for c in chars}
    if len(bases) == 1:
        label = TEMPLATE_LABELS.get((star, next(iter(bases))))
        if label:
            return label
    return f"{role}共用模板"


def group_twins(entries: list[dict], stat_key: str) -> list[dict]:
    groups = defaultdict(list)
    for e in entries:
        if e["star"] == 3:
            continue
        groups[(e["star"], e[stat_key])].append(e)

    result = []
    for (star, stat), chars in groups.items():
        if len(chars) < 2:
            continue
        roles = sorted({c["role"] for c in chars})
        role = roles[0] if len(roles) == 1 else "混合"
        atk, defe, hp, spd = stat
        result.append({
            "star": star,
            "role": role,
            "label": label_for(star, role, chars),
            "size": len(chars),
            "statLabel": f"攻{atk}/防{defe}/血{hp}/速{spd}",
            "chars": [
                {"name": c["name"], "element": c["element"], "role": c["role"]}
                for c in sorted(chars, key=lambda c: c["name"])
            ],
        })
    result.sort(key=lambda g: (-g["size"], -g["star"]))
    return result


def render_html(groups_base: list[dict], groups_total: list[dict]) -> str:
    data_json = json.dumps({"base": groups_base, "total": groups_total}, ensure_ascii=False)
    elem_class_json = json.dumps(ELEM_CLASS, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8">
<title>角色數值模板對照表</title>
<style>
:root {{ color-scheme: light dark; }}
body {{ font-family: -apple-system, "Microsoft JhengHei", sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }}
h1 {{ font-size: 20px; font-weight: 600; }}
p.sub {{ color: #888; font-size: 13px; margin-top: -8px; }}
.toolbar {{ display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }}
select {{ font-size: 13px; padding: 4px 8px; }}
.seg {{ display: inline-flex; border: 1px solid #ccc; border-radius: 6px; overflow: hidden; }}
.seg button {{ font-size: 13px; padding: 5px 12px; border: none; background: #fff; cursor: pointer; }}
.seg button.active {{ background: #333; color: #fff; }}
table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
th, td {{ padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }}
tr.sec td {{ font-weight: 600; background: #f0f0f0; color: #555; }}
.nb {{ display: inline-block; min-width: 20px; height: 20px; border-radius: 50%; font-size: 11px; font-weight: 600; text-align: center; line-height: 20px; padding: 0 2px; }}
.n5 {{ background: #f09595; color: #501313; }} .n4 {{ background: #f7c1c1; color: #a32d2d; }}
.n3 {{ background: #fac775; color: #854f0b; }} .n2 {{ background: #c0dd97; color: #3b6d11; }}
.label {{ font-weight: 600; }}
.stat {{ font-family: monospace; color: #666; display: block; margin-top: 2px; font-size: 12px; }}
.c {{ display: inline-block; margin-right: 10px; white-space: nowrap; }}
.dot {{ display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 3px; }}
.fire {{ background: #d85a30; }} .water {{ background: #378add; }} .wood {{ background: #1d9e75; }}
.light {{ background: #ba7517; }} .dark {{ background: #7f77dd; }}
.empty {{ color: #999; padding: 16px 8px; text-align: center; }}
@media (prefers-color-scheme: dark) {{
  body {{ background: #1a1a1a; color: #eee; }}
  th, td {{ border-color: #333; }} tr.sec td {{ background: #2a2a2a; color: #aaa; }}
  .stat {{ color: #999; }} .seg {{ border-color: #444; }} .seg button {{ background: #222; color: #eee; }}
  .seg button.active {{ background: #eee; color: #222; }}
}}
</style></head>
<body>
<h1>角色數值模板對照表</h1>
<p class="sub">數值完全相同的角色群組（不含三星）。由 scripts/find_stat_twins.py 從 chars.csv 產生，重跑腳本可更新。切換「強化前／強化後」可看出調教點數如何拉開原本共用同一套骨架的角色。說明見 STAT_TWINS.md。</p>
<div class="toolbar">
  <div class="seg" id="seg-mode">
    <button data-mode="base" class="active">強化前（基礎值）</button>
    <button data-mode="total">強化後（總值）</button>
  </div>
  <select id="f-star"></select>
  <select id="f-role"></select>
</div>
<table>
<thead><tr><th style="width:40px">人數</th><th style="width:200px">模板名稱</th><th>角色</th></tr></thead>
<tbody id="tbody"></tbody>
</table>
<script>
const DATA = {data_json};
const ELEM_CLASS = {elem_class_json};
let mode = 'base';

function populateFilters() {{
  const groups = DATA[mode];
  const stars = [...new Set(groups.map(g => g.star))].sort((a, b) => b - a);
  const roles = [...new Set(groups.map(g => g.role).filter(r => r !== '混合'))].sort();
  const fStar = document.getElementById('f-star');
  const fRole = document.getElementById('f-role');
  const curStar = fStar.value, curRole = fRole.value;
  fStar.innerHTML = '<option value="">全部星級</option>' + stars.map(s => `<option value="${{s}}">★${{s}}</option>`).join('');
  fRole.innerHTML = '<option value="">全部職業</option>' + roles.map(r => `<option value="${{r}}">${{r}}</option>`).join('') + '<option value="混合">混合職業</option>';
  fStar.value = curStar; fRole.value = curRole;
}}

function render() {{
  const sf = document.getElementById('f-star').value;
  const rf = document.getElementById('f-role').value;
  const groups = DATA[mode].filter(g =>
    (!sf || String(g.star) === sf) && (!rf || g.role === rf)
  );
  let html = '';
  let lastStar = null;
  for (const g of groups) {{
    if (g.star !== lastStar) {{
      html += `<tr class="sec"><td colspan="3">★${{g.star}}</td></tr>`;
      lastStar = g.star;
    }}
    const badgeCls = g.size >= 5 ? 'n5' : g.size >= 4 ? 'n4' : g.size >= 3 ? 'n3' : 'n2';
    const charsHtml = g.chars.map(c =>
      `<span class="c"><span class="dot ${{ELEM_CLASS[c.element] || ''}}"></span>${{c.name}}${{g.role === '混合' ? ' (' + c.role + ')' : ''}}</span>`
    ).join('');
    html += `<tr><td><span class="nb ${{badgeCls}}">${{g.size}}</span></td><td><span class="label">${{g.label}}</span><span class="stat">${{g.statLabel}}</span></td><td>${{charsHtml}}</td></tr>`;
  }}
  document.getElementById('tbody').innerHTML = html || '<tr><td colspan="3" class="empty">無符合結果</td></tr>';
}}

document.getElementById('seg-mode').addEventListener('click', e => {{
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  mode = btn.dataset.mode;
  document.querySelectorAll('#seg-mode button').forEach(b => b.classList.toggle('active', b === btn));
  populateFilters();
  render();
}});
document.getElementById('f-star').addEventListener('change', render);
document.getElementById('f-role').addEventListener('change', render);

populateFilters();
render();
</script>
</body></html>
"""


def main():
    entries = parse_chars(CHARS_CSV)
    groups_base = group_twins(entries, "base")
    groups_total = group_twins(entries, "total")
    OUT_HTML.write_text(render_html(groups_base, groups_total), encoding="utf-8")
    unlabeled = [g for g in groups_base + groups_total if g["label"].endswith("共用模板") and g["label"] not in TEMPLATE_LABELS.values()]
    print(f"OK: {OUT_HTML} (base={len(groups_base)} 組, total={len(groups_total)} 組)")
    if unlabeled:
        print(f"提醒：有 {len(unlabeled)} 組沒有花名，用了 fallback 通用名稱，可手動補進 TEMPLATE_LABELS")


if __name__ == "__main__":
    main()
