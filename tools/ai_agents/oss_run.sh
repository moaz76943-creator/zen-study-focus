#!/usr/bin/env bash
set -euo pipefail
# Called from the clean integration checkout; GH_TOKEN is not in the model environment.
case "$AGENT_ROLE" in
  aider)
    set -- tools/daily_maintenance/evidence_integrity_guard.cjs tests/integration_quality/evidence_integrity_guard.test.cjs
    ;;
  qwen)
    set -- tools/i18n/inventory/index.cjs tests/i18n/inventory/inventory.test.cjs
    ;;
  *) echo 'Unknown OSS agent' >&2; exit 1;;
esac
test -n "$GROQ_API_KEY" || { echo 'Missing GROQ_API_KEY'; exit 1; }
test -s "$RUNNER_TEMP/df-oss-task.txt"
for f in "$@"; do test -f "$f" || { echo "Missing allowed file: $f"; exit 1; }; done
if [ "$AGENT_ROLE" = aider ]; then
  python3 -m pip install --quiet --user aider-chat
  export PATH="$HOME/.local/bin:$PATH"
  timeout 7m aider --yes --no-pretty --no-auto-commits --no-dirty-commits \
    --model groq/openai/gpt-oss-120b --map-tokens 0 \
    --message-file "$RUNNER_TEMP/df-oss-task.txt" "$@"
  # Aider one-shot sometimes writes the RED test but stops before fixing the
  # source. Give exactly one bounded follow-up; no unbounded retries.
  if git diff --quiet -- tools/daily_maintenance/evidence_integrity_guard.cjs &&
     ! git diff --quiet -- tests/integration_quality/evidence_integrity_guard.test.cjs; then
    timeout 4m aider --yes --no-pretty --no-auto-commits --no-dirty-commits \
      --model groq/openai/gpt-oss-120b --map-tokens 0 \
      --message 'The new failing test is written. NOW implement the minimal source fix to make it pass, editing only tools/daily_maintenance/evidence_integrity_guard.cjs. Do not edit unrelated files.' "$@"
  fi
else
  npm install --quiet --global @qwen-code/qwen-code
  mkdir -p "$HOME/.qwen"
  cat > "$HOME/.qwen/settings.json" <<'JSON'
{"modelProviders":{"openai":[{"id":"openai/gpt-oss-120b","wireApi":"responses","envKey":"GROQ_API_KEY","baseUrl":"https://api.groq.com/openai/v1"}]},"security":{"auth":{"selectedType":"openai"}},"model":{"name":"openai/gpt-oss-120b"},"tools":{"eager":[]}}
JSON
  # Qwen full default system prompt exceeds Groq Free 8K TPM even with deferred tools.
  # Override it with a short, concrete editing contract; post-run diff guard is authoritative.
  # Qwen Code may grow beyond Groq Free 8k TPM on a later tool turn.
  # Preserve the task and strict staged-diff policy; retry only a confirmed 413.
  set +e
  timeout 7m qwen --system-prompt 'Edit only task-allowed source and test files. No shell, network, secrets, Git commands, or untested claims. Preserve v21 and translations.' --prompt "$(cat "$RUNNER_TEMP/df-oss-task.txt")" \
    --model openai/gpt-oss-120b --approval-mode auto-edit \
    --max-tool-calls 24 --max-session-turns 16 --max-wall-time 6m --output-format text \
    > "$RUNNER_TEMP/df-qwen-output.log" 2>&1
  qwen_status=$?
  set -e
  if [ "$qwen_status" -ne 0 ]; then
    if grep -Fq 'Responses API error 413' "$RUNNER_TEMP/df-qwen-output.log"; then
      echo 'Qwen exceeded Groq free TPM; retrying the same scoped task with Aider'
      # These are ONLY the two agent-owned files in a clean temporary checkout.
      git restore -- "$@"
      python3 -m pip install --quiet --user aider-chat
      export PATH="$HOME/.local/bin:$PATH"
      timeout 7m aider --yes --no-pretty --no-auto-commits --no-dirty-commits \
        --model groq/openai/gpt-oss-120b --map-tokens 0 \
        --message-file "$RUNNER_TEMP/df-oss-task.txt" "$@"
    else
      echo 'Qwen failed for a reason other than Groq 413; refusing automatic retry' >&2
      exit "$qwen_status"
    fi
  else
    echo 'Qwen task execution completed; scoped diff and regression tests run next'
  fi
fi
