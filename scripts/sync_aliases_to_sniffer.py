#!/usr/bin/env python3
"""
sync_aliases_to_sniffer.py

從 ArkRecodetools/assets/char-name-data.js 同步新角色到
sniffer 的 discord_bot/data/aliases.py。

只新增不存在的角色，不覆蓋已有條目（保留 sniffer 的英文補完別名與
特殊 canonical 設定，例如 '彩伽' vs '河北彩伽'）。

用法：
    python scripts/sync_aliases_to_sniffer.py
    python scripts/sync_aliases_to_sniffer.py --dry-run   # 預覽，不寫檔
"""

import re
import sys
import argparse
from pathlib import Path

# ── 路徑設定 ──────────────────────────────────────────────────────────────────

REPO_ROOT      = Path(__file__).parent.parent
CHAR_DATA_JS   = REPO_ROOT / "assets" / "char-name-data.js"
SNIFFER_ALIASES = Path(
    r"C:\Users\zzasq\OneDrive\Documents\arkrecode sniffer"
    r"\arkrecode_gvg_sniffer\discord_bot\data\aliases.py"
)

# ── 解析 char-name-data.js ────────────────────────────────────────────────────

def parse_char_name_data(js_path: Path) -> list[dict]:
    text = js_path.read_text(encoding="utf-8")
    entries = []
    pattern = re.compile(
        r"\{\s*name:\s*'([^']+)'\s*,\s*id:\s*'([^']+)'\s*,\s*aliases:\s*\[([^\]]*)\]\s*\}",
        re.DOTALL,
    )
    for m in pattern.finditer(text):
        name = m.group(1)
        id_  = m.group(2)
        raw  = m.group(3)
        aliases = re.findall(r"'([^']+)'", raw)
        entries.append({"name": name, "id": id_, "aliases": aliases})
    return entries


# ── 讀取 aliases.py 已有的 canonical names ────────────────────────────────────

def parse_existing_canonicals(py_path: Path) -> set[str]:
    if not py_path.exists():
        return set()
    text = py_path.read_text(encoding="utf-8")
    return set(re.findall(r"^\s*\('([^']+)'", text, re.MULTILINE))


# ── 格式化輸出行 ──────────────────────────────────────────────────────────────

def format_entry(name: str, aliases: list[str]) -> str:
    pad = max(0, 20 - len(name)) * " "
    aliases_str = ", ".join(f"'{a}'" for a in aliases)
    return f"    ('{name}',{pad} [{aliases_str}]),"


# ── 主流程 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="只預覽，不寫入檔案")
    args = parser.parse_args()

    if not CHAR_DATA_JS.exists():
        print(f"❌ 找不到 {CHAR_DATA_JS}", file=sys.stderr)
        sys.exit(1)
    if not SNIFFER_ALIASES.exists():
        print(f"❌ 找不到 {SNIFFER_ALIASES}", file=sys.stderr)
        sys.exit(1)

    entries    = parse_char_name_data(CHAR_DATA_JS)
    existing   = parse_existing_canonicals(SNIFFER_ALIASES)
    new_entries = [e for e in entries if e["name"] not in existing]

    print(f"char-name-data.js：{len(entries)} 個角色")
    print(f"aliases.py 現有：  {len(existing)} 個 canonical")

    if not new_entries:
        print("✅ 沒有需要同步的新角色")
        return

    print(f"\n需要新增（{len(new_entries)} 個）：")
    new_lines = ["\n    # ── 從 char-name-data.js 同步 ──────────────────────────"]
    for e in new_entries:
        line = format_entry(e["name"], e["aliases"])
        print(f"  {line}")
        new_lines.append(line)

    if args.dry_run:
        print("\n（dry-run，未寫入）")
        return

    # 插入到 _ALIAS_MAP_RAW 的最後一個 ] 前
    text = SNIFFER_ALIASES.read_text(encoding="utf-8")
    insert_pos = text.rfind("]")
    if insert_pos == -1:
        print("❌ aliases.py 格式不符，找不到結尾 ]", file=sys.stderr)
        sys.exit(1)

    new_text = text[:insert_pos] + "\n".join(new_lines) + "\n" + text[insert_pos:]
    SNIFFER_ALIASES.write_text(new_text, encoding="utf-8")
    print(f"\n✅ 已寫入 {SNIFFER_ALIASES}")


if __name__ == "__main__":
    main()
