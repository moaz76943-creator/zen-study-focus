#!/data/data/com.termux/files/usr/bin/bash
# Download verified Room6 files directly from the repository; never touch other rooms.
set -Eeuo pipefail
ROOT="$HOME/dfroom6"
BASE='https://raw.githubusercontent.com/moaz76943-creator/zen-study-focus/support/room6-hybrid-opencode-20261027/tools/termux_room6'
for c in curl base64 gzip sha256sum node git gh tmux opencode; do
  command -v "$c" >/dev/null || { echo "MISSING_COMMAND: $c"; exit 1; }
done
gh auth status -h github.com >/dev/null 2>&1 || { echo 'GITHUB_LOGIN_REQUIRED: gh auth login'; exit 1; }
mkdir -p "$ROOT"
TMP="$(mktemp -d "$HOME/.dfroom6-verify.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT
for name in runner.mjs tasks.json; do
  curl --retry 2 -fsSLo "$TMP/$name.gz.b64" "$BASE/$name.gz.b64"
  base64 -d < "$TMP/$name.gz.b64" | gzip -d > "$TMP/$name"
done
printf '%s  %s\n' \
'e9ceb0f7f716160e17a0f25c937e4e32e29e4fa788e1b2bf4a7a148e54229730' "$TMP/runner.mjs" \
'1eebfc4c9a214ea98201b25f4307f4c3737ac8cb4e106b63864d45ca6548a443' "$TMP/tasks.json" \
  | sha256sum -c -
node - "$TMP/runner.mjs" <<'NODE'
const fs=require('node:fs');
const name=process.argv[2];let source=fs.readFileSync(name,'utf8');
function patch(before,after){
  if(!source.includes(before))throw Error('Unexpected runner version; refusing unsafe patch');
  source=source.replace(before,after);
}
patch("  const a=run('node',['--check',task.source],{cwd:work,timeout:30000,logfile:log,quiet:true});", "  // Only JavaScript is valid input to node --check; HTML/CSS have focused content tests instead.\n  const a=/\\.(?:mjs|cjs|js)$/.test(task.source) ? run('node',['--check',task.source],{cwd:work,timeout:30000,logfile:log,quiet:true}) : {ok:true};");
patch('    const cmd=`node ${JSON.stringify(me)} run ${lane}`;', '    const cmd=`node ${JSON.stringify(me)} run ${lane} >> ${JSON.stringify(path.join(folders.logs,`lane-${lane}.log`))} 2>&1`;');
fs.writeFileSync(name,source);
NODE
printf '%s  %s\n' '366acd94b41eb918a18f4b7b062c3464032d9791c76ae9248f9b5c3ef90a5143' "$TMP/runner.mjs" | sha256sum -c -
node --check "$TMP/runner.mjs"
# Runner reads manifest beside its script; verify both together before replacement.
(cd "$TMP" && node ./runner.mjs selftest)
mv "$TMP/runner.mjs" "$ROOT/runner.mjs"
mv "$TMP/tasks.json" "$ROOT/tasks.json"
echo 'ROOM6_INSTALLED: three independent lanes, 24 tasks, previous room data unchanged.'
case "${1:-start}" in
  start) node "$ROOT/runner.mjs" start;;
  status) node "$ROOT/runner.mjs" status;;
  install) :;;
  *) echo 'Use: bash install.sh [start|status|install]'; exit 2;;
esac
