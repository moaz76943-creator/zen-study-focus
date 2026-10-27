#!/data/data/com.termux/files/usr/bin/bash
# Verified Room6 scoped recovery. Does NOT kill tmux sessions or remove worktrees.
set -Eeuo pipefail
ROOT="$HOME/dfroom6"
BASE='https://raw.githubusercontent.com/moaz76943-creator/zen-study-focus/support/room6-hybrid-opencode-20261027/tools/termux_room6'
for tool in curl base64 gzip sha256sum node git gh tmux opencode; do
  command -v "$tool" >/dev/null || { echo "MISSING_TOOL $tool"; exit 1; }
done
if [[ ! -s "$ROOT/tasks.json" ]]; then
  echo 'MISSING_TASKS: Install Room6 normally first; saved work was not touched.'
  exit 1
fi
mkdir -p "$ROOT"
tmpdir="$(mktemp -d "$ROOT/.repair-verify.XXXXXX")"
tmp="$tmpdir/repair.mjs"
trap 'rm -f "$tmp"; rmdir "$tmpdir" 2>/dev/null || true' EXIT
curl --retry 3 --retry-delay 2 -fsSL "$BASE/repair_v1.mjs.gz.b64" | base64 -d | gzip -d > "$tmp"
printf '%s  %s\n' \
  '91d35d05822e2723ef0c94dbb5ea5fde7355ac7042239c122397c47be506c871' "$tmp" | sha256sum -c -
node --check "$tmp"
# Do not overwrite existing rescue scripts unless the newly downloaded one passes its manifest contract.
node "$tmp" selftest
mv "$tmp" "$ROOT/repair.mjs"
rmdir "$tmpdir"
trap - EXIT
node "$ROOT/repair.mjs" start
node "$ROOT/repair.mjs" status
echo 'READY: Recovery will run in separate tmux lanes after original Room6 workers exit.'
echo 'Nothing deleted, no original worker interrupted, human/Codex GitHub operations unaffected.'
