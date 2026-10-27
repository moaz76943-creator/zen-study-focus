#!/data/data/com.termux/files/usr/bin/bash
# Deep Focus Room5: finish the ONLY missing jobs, without overwriting partial files.
set -Eeuo pipefail
ROOT="$HOME/dfroom5"
V3="$HOME/df-room5-v3.sh"
REPO="moaz76943-creator/zen-study-focus"
[[ -f "$V3" ]] || { echo "STOP: v3 missing"; exit 1; }
for c in gh git tmux opencode node timeout; do command -v "$c" >/dev/null || { echo "STOP: missing $c"; exit 1; }; done
gh auth status -h github.com >/dev/null 2>&1 || { echo "STOP: GitHub login missing"; exit 1; }
if tmux has-session -t dfroom5-b 2>/dev/null; then
  echo "B_LANE_RUNNING: no second worker started; inspect the existing session."
  bash "$V3" status
  exit 0
fi
mkdir -p "$ROOT/logs"
for id in B03 B08; do
  lower="$(printf "%s" "$id" | tr "[:upper:]" "[:lower:]")"
  branch="agent/room5-$lower-20261027"
  pr="$(gh pr list --repo "$REPO" --head "$branch" --state all --json number --jq ".[0].number // empty")"
  if [[ -n "$pr" ]]; then echo "$id EXISTING_PR #$pr: skip generation"; continue; fi
  work="$ROOT/work/b/$id"
  if [[ ! -d "$work" ]] || ! git -C "$work" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "$id MISSING_WORKTREE: preserve state, skip and report"; continue
  fi
  row="$(grep -m1 -E "^b\|$id\|" "$V3" || true)"
  [[ -n "$row" ]] || { echo "$id MISSING_MANIFEST: no changes"; continue; }
  IFS="|" read -r lane row_id model name spec <<< "$row"
  [[ "$row_id" == "$id" ]] || { echo "$id BAD_MANIFEST: no changes"; continue; }
  echo "$id RESUME_SAVED_FILES (no deletion, one model attempt)"
  logfile="$ROOT/logs/$id-targeted-repair.log"
  prompt="Complete the existing interrupted Deep Focus Room5 task $id ($name). Exact task specification: $spec. Work within THIS checkout; preserve all existing partial files, particularly any test already written. Edit ONLY the one new standalone source module and one focused test that the Room5 task specification names. Confirm RED then GREEN with node --test on the focused test. Do not edit other files, git state, Android Native, core app files, credentials, configuration or workflows; no Git/GitHub actions. Use offline deterministic logic and no dependencies. Output a short final summary only. If the task was already implemented, verify its files instead of rewriting."
  if (cd "$work" && timeout 900 opencode run --model "$model" "$prompt" </dev/null) >"$logfile" 2>&1; then
    echo "$id MODEL_RETURNED: review and recover using v3"
  else
    echo "$id MODEL_ERROR: files preserved; inspect $logfile"
  fi
done
echo "=== VALIDATE AND MERGE SAVED WORK ==="
bash "$V3" recover
echo "=== END: PR outcomes ==="
gh pr list --repo "$REPO" --state all --limit 20 --json number,title,state --jq '.[] | select(.title | contains("room5")) | [.number, .state, .title] | @tsv'
echo "NO_OTHER_LANES_STARTED; safe to inspect results."
