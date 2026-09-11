#!/bin/sh
# 提交前擋下不該公開的內容。安裝方式見 CONTRIBUTING.md
# 繞過（確定是誤判）：git commit --no-verify
#
# 專案專屬的關鍵字（上游 repo 名、私有腳本名等）不寫在這裡——
# 放在 local/blocklist.txt，一行一個 grep -E pattern，該檔在 .gitignore 內。

files=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$files" ] && exit 0
fail=0
self='scripts/precommit_guard.sh'

# ── 1. 不該進版控的路徑 ──────────────────────────────────
bad_path=$(printf '%s\n' "$files" | grep -E '^(local/|CLAUDE\.local\.md)|\.(xlsx|jsonl)$|^Equipment_')
if [ -n "$bad_path" ]; then
  echo "✗ 這些路徑不該進公開 repo："; printf '  %s\n' $bad_path; fail=1
fi

# ── 2. 通用敏感樣式 ──────────────────────────────────────
generic='C:\+Users|/mnt/user-data|[0-9a-f]{32}|(token|password|密碼)[[:space:]]*[:=][[:space:]]*.[A-Za-z0-9]'

# ── 3. 專案專屬黑名單（本機檔，缺了也能跑）──────────────
extra=''
if [ -f local/blocklist.txt ]; then
  extra=$(grep -v '^[[:space:]]*#' local/blocklist.txt | grep -v '^[[:space:]]*$' | paste -sd '|' -)
fi
[ -n "$extra" ] && pattern="$generic|$extra" || pattern="$generic"

for f in $files; do
  [ -f "$f" ] || continue
  [ "$f" = "$self" ] && continue
  case "$f" in *.png|*.jpg|*.jpeg|*.webp|*.docx|*.ico) continue;; esac
  hit=$(git show ":$f" 2>/dev/null | grep -n -iE "$pattern" | head -3)
  if [ -n "$hit" ]; then
    echo "✗ $f 含敏感內容："; printf '  %s\n' "$hit"; fail=1
  fi
done

if [ "$fail" = 1 ]; then
  echo ""
  echo "→ 修掉，或改寫到 CLAUDE.local.md（不進版控）。"
  echo "→ 確定是誤判：git commit --no-verify"
  exit 1
fi
exit 0
