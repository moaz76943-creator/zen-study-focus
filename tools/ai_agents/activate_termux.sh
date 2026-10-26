#!/usr/bin/env bash
# Deep Focus — guarded single-issue pilot activation for Termux.
set -euo pipefail
REPO='moaz76943-creator/zen-study-focus'
WORKFLOW='df_ai_repair_worker.yml'
TARGET='integration/master-qa-verified-v21'
ISSUE=307
ACTIVE=false
abort() { echo "فشل الإعداد: $*" >&2; exit 1; }
# A failed command or rejected first repair disables all future hourly AI usage.
cleanup() {
  if [[ "$ACTIVE" != true ]]; then
    gh variable set DF_AI_ENABLED --body false --repo "$REPO" >/dev/null 2>&1 || true
    echo 'تم إبقاء الوكيل معطلاً: DF_AI_ENABLED=false'
  fi
}
trap 'cleanup' EXIT

command -v gh >/dev/null || abort 'نفذ: pkg install gh -y'
gh auth status --hostname github.com >/dev/null 2>&1 || abort 'سجّل الدخول: gh auth login'
WHO="$(gh api user --jq .login)"
[[ "$WHO" == 'moaz76943-creator' ]] || abort "حساب GitHub الحالي $WHO غير صحيح"
gh api "repos/$REPO" --jq .full_name >/dev/null
[[ "$(gh issue view "$ISSUE" --repo "$REPO" --json state --jq .state)" == 'OPEN' ]] ||
  abort 'المهمة التجريبية مغلقة'
for label in agent-ready agent-safe; do
  gh api "repos/$REPO/issues/$ISSUE" --jq '.labels[].name' | grep -Fxq "$label" ||
    abort "المهمة $ISSUE تفتقد العلامة $label"
done
gh secret list --repo "$REPO" --json name --jq '.[].name' | grep -Fxq GROQ_API_KEY ||
  abort 'لم نجد مفتاح Groq؛ استخدم سكربت الإعداد السابق'
echo '✓ الحساب، المهمة، والمفتاح: OK'

# No model access in the first call: verify issue selection, workflow permissions, runner.
latest_dispatch() {
  gh run list --repo "$REPO" --workflow "$WORKFLOW" --event workflow_dispatch \
    --branch main --limit 1 --json databaseId --jq '.[0].databaseId // 0'
}
dispatch_and_wait() {
  local dry="$1" old run_id n
  old="$(latest_dispatch)"
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref main -f issue_number="$ISSUE" -f dry_run="$dry"
  run_id=0
  for n in {1..25}; do
    run_id="$(latest_dispatch)"
    if [[ "$run_id" != 0 && "$run_id" != "$old" ]]; then break; fi
    sleep 3
  done
  [[ "$run_id" != 0 && "$run_id" != "$old" ]] || abort 'لم يتم العثور على التشغيل الجديد'
  echo "Run: https://github.com/$REPO/actions/runs/$run_id"
  gh run watch "$run_id" --repo "$REPO" --exit-status --interval 5 ||
    abort "فشل اختبار GitHub Actions: $run_id"
  printf '%s' "$run_id"
}
echo 'أرسل تجربة أولى بدون استهلاك AI...'
# Do not capture full watch output as run ID: redirect to file and read last line.
testlog="$(mktemp)"
dispatch_and_wait true | tee "$testlog"
rm -f "$testlog"

# The token must be explicitly allowed to create draft PRs.
allowed="$(gh api "repos/$REPO/actions/permissions/workflow" --jq .can_approve_pull_request_reviews)"
if [[ "$allowed" != true ]]; then
  echo 'ضبط صلاحية GitHub Actions لإنشاء PR. لن يستخدم السكربت الموافقة الآلية.'
  gh api --method PUT "repos/$REPO/actions/permissions/workflow" \
    -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true >/dev/null ||
    abort 'GitHub رفض تعديل صلاحية إنشاء PR'
fi
[[ "$(gh api "repos/$REPO/actions/permissions/workflow" --jq .can_approve_pull_request_reviews)" == true ]] ||
  abort 'صلاحية إنشاء PR ما زالت معطلة'

echo 'تشغيل أول إصلاح صغير باستخدام Groq...'
gh variable set DF_AI_ENABLED --body true --repo "$REPO"
reallog="$(mktemp)"
dispatch_and_wait false | tee "$reallog"
run_id="$(grep -oE 'https://github.com/[^ ]+/actions/runs/[0-9]+' "$reallog" | tail -n 1 | grep -oE '[0-9]+$' || true)"
rm -f "$reallog"
[[ -n "$run_id" ]] || abort 'رقم تشغيل AI غير معروف'
real_step="$(gh run view "$run_id" --repo "$REPO" --json jobs --jq \
  '.jobs[] | select(.name == "repair") | .steps[] | select(.name == "Execute bounded OpenCode pilot and open draft PR") | .conclusion' | tr '[:upper:]' '[:lower:]')"
[[ "$real_step" == success ]] || abort 'لم يثبت نجاح خطوة AI الفعلية'
pr_url="$(gh pr list --repo "$REPO" --state open --base "$TARGET" \
  --head "agent-repair/issue-$ISSUE" --json isDraft,url,baseRefName \
  --jq ".[] | select(.isDraft and .baseRefName == \"$TARGET\") | .url" | head -n1)"
[[ -n "$pr_url" ]] || abort 'لم يتم إنشاء Draft PR موثوق رغم نجاح Action'
ACTIVE=true
echo
echo '✓ عمل الوكيل وفتح PR للمراجعة (دون دمج):'
echo "$pr_url"
echo '✓ تشغيل كل ساعة أصبح مفعّلاً للمهمات الآمنة فقط.'
