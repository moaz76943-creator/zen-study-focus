#!/data/data/com.termux/files/usr/bin/bash
# Installation uses GitHub raw, no ChatGPT attachments, and never touches Room 6.
set -Eeuo pipefail
ROOT="$HOME/dfcritical7"
BASE='https://raw.githubusercontent.com/moaz76943-creator/zen-study-focus/support/critical-room7-20261027/tools/critical_room7'
for c in curl base64 gzip sha256sum node git gh tmux opencode timeout; do
  command -v "$c" >/dev/null || { echo "MISSING_TOOL: $c"; exit 1; }
done
mkdir -p "$ROOT"
TMP="$(mktemp -d "$ROOT/.install.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
for name in runner.mjs manifest.json; do
  curl --retry 2 -fsSLo "$TMP/$name.gz.b64" "$BASE/$name.gz.b64"
  base64 -d < "$TMP/$name.gz.b64" | gzip -d > "$TMP/$name"
done
printf '%s  %s\n' \
'7975d1f5676271e88b2e23a74eb279b1f95e22f43756829c7ab9a3975ee3e7ff' "$TMP/runner.mjs" \
'ddb949d4aae5adff8cc336f51461dbf2e2b40d28ce17f88822d584faf487e51b' "$TMP/manifest.json" | sha256sum -c -
node --check "$TMP/runner.mjs"
(cd "$TMP" && node runner.mjs selftest)
# Install only after checking BOTH files, preserving any existing saved worktrees.
mv "$TMP/runner.mjs" "$ROOT/runner.mjs"
mv "$TMP/manifest.json" "$ROOT/manifest.json"
echo 'CRITICAL_ROOM7_INSTALLED: previous Room 6 sessions unaffected.'
case "${1:-start}" in
  install) :;;
  start) node "$ROOT/runner.mjs" start;;
  status) node "$ROOT/runner.mjs" status;;
  *) echo 'Usage: bash install.sh [install|start|status]'; exit 2;;
esac
