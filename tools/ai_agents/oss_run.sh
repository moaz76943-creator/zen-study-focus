#!/usr/bin/env bash
set -euo pipefail
# Called from the clean integration checkout; GH_TOKEN is not in the model environment.
case "$AGENT_ROLE" in
  aider)
    set -- tools/i18n/integrator/index.cjs tools/i18n/integrator/cli.cjs tests/i18n/integrator/integrator.test.cjs
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
    --model groq/openai/gpt-oss-120b \
    --message-file "$RUNNER_TEMP/df-oss-task.txt" "$@"
else
  npm install --quiet --global @qwen-code/qwen-code
  mkdir -p "$HOME/.qwen"
  cat > "$HOME/.qwen/settings.json" <<'JSON'
{"modelProviders":{"openai":[{"id":"openai/gpt-oss-120b","envKey":"GROQ_API_KEY","baseUrl":"https://api.groq.com/openai/v1"}]},"security":{"auth":{"selectedType":"openai"}},"model":{"name":"openai/gpt-oss-120b"},"tools":{"eager":[]}}
JSON
  timeout 7m qwen --prompt "$(cat "$RUNNER_TEMP/df-oss-task.txt")" \
    --model openai/gpt-oss-120b --approval-mode auto-edit \
    --max-tool-calls 24 --max-session-turns 16 --max-wall-time 6m --output-format text
fi
