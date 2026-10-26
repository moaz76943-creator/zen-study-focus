#!/usr/bin/env bash
# Safe first-time setup for Deep Focus on Android/Termux.
set -euo pipefail
REPO='moaz76943-creator/zen-study-focus'
WORKFLOW='df_ai_repair_worker.yml'

echo 'Deep Focus — إعداد الوكيل المجاني عبر Termux'
if ! command -v gh >/dev/null 2>&1; then
  echo 'مطلوب GitHub CLI. نفّذ: pkg install gh -y'
  exit 1
fi

if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  echo 'سيفتح GitHub لتسجيل الدخول. إذا ظهرت شفرة، افتح https://github.com/login/device'
  gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow
fi

CURRENT_USER="$(gh api user --jq '.login')"
if [[ "$CURRENT_USER" != 'moaz76943-creator' ]]; then
  echo "الحساب الحالي ($CURRENT_USER) ليس مالك المستودع المتوقع."
  echo 'سجّل الدخول إلى حساب GitHub الصحيح أولاً: gh auth switch'
  exit 1
fi
gh api "repos/$REPO" --jq '.full_name' >/dev/null
echo 'GitHub: تم التحقق من الحساب والمستودع.'

if gh secret list --repo "$REPO" --json name --jq '.[].name' | grep -Fxq GROQ_API_KEY; then
  echo 'GROQ_API_KEY موجود مسبقاً؛ لن أغيّره.'
else
  echo
  echo 'افتح https://console.groq.com/keys وأنشئ مفتاحاً مجانياً، ثم ارجع إلى Termux.'
  echo 'الصق مفتاح Groq عند الطلب واضغط Enter (لن يظهر على الشاشة).'
  GROQ_KEY=''
  IFS= read -r -s -p 'Groq API key: ' GROQ_KEY
  printf '\n'
  if [[ -z "$GROQ_KEY" ]]; then
    echo 'لم تدخل مفتاحاً. توقّف الإعداد دون تفعيل الوكيل.'
    exit 1
  fi
  printf '%s' "$GROQ_KEY" | gh secret set GROQ_API_KEY --repo "$REPO" --app actions
  unset GROQ_KEY
  echo 'تم حفظ المفتاح في GitHub Actions Secrets، وليس في المستودع.'
fi

# Intentionally leave paid/free model consumption OFF during first-time setup.
gh variable set DF_AI_ENABLED --body false --repo "$REPO"
echo 'DF_AI_ENABLED=false: الوكيل معطّل مؤقتاً حتى تجربة آمنة.'

gh workflow run "$WORKFLOW" --repo "$REPO" --ref main -f dry_run=true
echo
echo 'تم إرسال تجربة فحص بدون AI. افتح:'
echo "https://github.com/$REPO/actions/workflows/$WORKFLOW"
echo
echo 'عند ظهور نجاح التجربة أخبر ChatGPT: تم إعداد Termux وGroq.'
echo 'لا تغيّر DF_AI_ENABLED إلى true قبل اختيار Issue آمنة والتحقق من صلاحيات PR.'
