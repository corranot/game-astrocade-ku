#!/bin/bash
# Claude Code PreToolUse hook (Bash): before a `git commit`, shrink new or changed QA evidence screenshots
# (tools/evidence-shrink.py) so the git history stops growing by megabytes per playtest run.
# Runs in the commit's own working directory (worktrees included). Never blocks: always exits 0.
INPUT=$(cat)
case "$INPUT" in *'"tool_input"'*[Gg][Ii][Tt]*[Cc][Oo][Mm][Mm][Ii][Tt]*) ;; *) exit 0 ;; esac
command -v python3 >/dev/null 2>&1 || exit 0
DIR=$(printf '%s' "$INPUT" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin); c = d.get("tool_input", {}).get("command", "")
    print(d.get("cwd", "") if "git commit" in c or "git -C" in c else "")
except Exception: print("")' 2>/dev/null)
[ -n "$DIR" ] && cd "$DIR" 2>/dev/null || exit 0
TOP=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$TOP" && [ -f tools/evidence-shrink.py ] && python3 tools/evidence-shrink.py >&2
exit 0
