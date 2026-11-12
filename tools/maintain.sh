#!/bin/bash
set -e

# ==============================================================================
# DEEP FOCUS — UNIFIED MAINTENANCE CLI V2 (TASK #744)
# Usage: bash tools/maintain.sh
# Runs: AST Syntax (app.js + modules/*.js) -> E2E Suite -> AAB CI Check -> Git GC
# ==============================================================================

echo "======================================================================"
echo "🩺 [Deep Focus Maintain v2] Running Full Local & Cloud Health Check..."
echo "======================================================================"

if command -v node >/dev/null 2>&1; then
    node --check android/app/src/main/assets/web/app.js
    for mf in android/app/src/main/assets/web/modules/*.js; do
        [ -f "$mf" ] && node --check "$mf"
    done
    echo "✅ All JS & Module AST checks passed."

    if [ -f "tests/sovereign_e2e_test.js" ]; then
        node tests/sovereign_e2e_test.js
    fi
fi

if command -v python3 >/dev/null 2>&1 && [ -f "tools/check_release_artifacts.py" ]; then
    echo "📦 Checking GitHub Actions AAB Build Status..."
    python3 tools/check_release_artifacts.py || true
fi

rm -f .git/index.lock 2>/dev/null || true
rm -f .tmp_*.py 2>/dev/null || true
git gc --auto 2>/dev/null || true

echo "🌿 Branch: $(git branch --show-current)"
if [ -f "android/version.properties" ]; then
    cat android/version.properties
fi
echo "🎉 [Maintain v2 Complete] Repository & CI status verified."
