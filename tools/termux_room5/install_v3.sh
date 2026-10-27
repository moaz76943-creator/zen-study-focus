#!/data/data/com.termux/files/usr/bin/bash
# Deep Focus Room 5: repair premature task-list consumption without touching old worktrees.
set -euo pipefail
old="$HOME/df-room5-v2.sh"
new="$HOME/df-room5-v3.sh"
[[ -f "$old" ]] || { echo 'ERROR: v2 script is missing'; exit 1; }
printf '%s  %s\n' 'c5eb96104f6a25195619781c178ea0b405a04047bc8237acb1d46bfaf8fd48a2' "$old" | sha256sum -c -
node - "$old" "$new" <<'NODE'
'use strict';
const fs = require('fs');
const old = process.argv[2], out = process.argv[3];
let s = fs.readFileSync(old,'utf8');
function edit(before,after) {
  if (!s.includes(before)) throw Error('Unexpected v2 format, refusing partial patch');
  s=s.replace(before,after);
}
edit("tasks(){\n  while IFS='|' read -r l id model name spec; do\n    [[ \"$l\" == \"$1\" ]] || continue\n    if [[ \"$2\" == recover ]] && [[ ! -d \"$ROOT/work/$l/$id\" ]]; then continue; fi\n    process_task \"$l\" \"$id\" \"$model\" \"$name\" \"$spec\"\n  done <<'TASKS'\n", "tasks(){\n  # Read all rows before spawning child CLIs.\n  local -a manifest_rows=()\n  local row l id model name spec\n  mapfile -t manifest_rows <<'TASKS'\n");
edit("\nTASKS\n}\ncommand=", "\nTASKS\n  for row in \"${manifest_rows[@]}\"; do\n    IFS='|' read -r l id model name spec <<< \"$row\"\n    [[ \"$l\" == \"$1\" ]] || continue\n    if [[ \"$2\" == recover ]] && [[ ! -d \"$ROOT/work/$l/$id\" ]]; then continue; fi\n    process_task \"$l\" \"$id\" \"$model\" \"$name\" \"$spec\"\n  done\n}\ncommand=");
edit('timeout 900 opencode run --model "$choice" "$prompt") >', 'timeout 900 opencode run --model "$choice" "$prompt" </dev/null) >');
edit('log "LANE $lane COMPLETE"', 'log "LANE $lane QUEUE_ITERATION_FINISHED (check per-task status)"');
fs.writeFileSync(out,s,{mode:0o700});
console.log('PATCH_APPLIED: v3 preserves original v2 and all existing worktrees');
NODE
bash -n "$new"
printf '%s  %s\n' '37e70f88f0b680c5992aa4640a1dd1bbd98fc75ebd013113d1667ee65cb0932a' "$new" | sha256sum -c -
echo 'READY: bash "$HOME/df-room5-v3.sh" start'
