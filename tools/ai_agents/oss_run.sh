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
else
  npm install --quiet --global @qwen-code/qwen-code
  mkdir -p "$HOME/.qwen"
  cat > "$HOME/.qwen/settings.json" <<'JSON'
{"modelProviders":{"openai":[{"id":"openai/gpt-oss-120b","wireApi":"responses","envKey":"GROQ_API_KEY","baseUrl":"https://api.groq.com/openai/v1"}]},"security":{"auth":{"selectedType":"openai"}},"model":{"name":"openai/gpt-oss-120b"},"tools":{"eager":[]}}
JSON
  # Qwen full default system prompt exceeds Groq Free 8K TPM even with deferred tools.
  # Override it with a short, concrete editing contract; post-run diff guard is authoritative.
  timeout 7m qwen --system-prompt 'You are a precise source repair tool in ephemeral CI. Read the user task, inspect only necessary repository files and edit only explicitly allowed source and focused test files. Do not call shell tools, browse the web, access credentials, create branches, commit or push. Reproduce one bug with a test before applying a minimal fix; otherwise make no changes. Preserve behavior, offline assets, reviewed translations and all v21 data. Do not claim test results; independent CI runs them.' --prompt "$(cat "$RUNNER_TEMP/df-oss-task.txt")" \
    --model openai/gpt-oss-120b --approval-mode auto-edit \
    --max-tool-calls 24 --max-session-turns 16 --max-wall-time 6m --output-format text
fi
