# Batch 10 — reproduced Android bootstrap compatibility defect

BASE_SHA: 4d9b80e
Android attempt SHA 27087b3: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39337561427.

The first real CDP action run is not a green E2E result: 1 PASS / 6 FAIL / 13 NOT_TESTED; original UIAutomator remains 20 NOT_TESTED. It exposed a real runtime exception at goals_studio.js line 95 (zero-based stack line 94): rows.replaceChildren is unavailable in the emulator's older WebView. Notes/Tasks/Analytics and the alert picker use the same API, causing advanced installation and dynamic locale rendering to fail. This is app compatibility evidence, not an environment-only dismissal. The failed historical run is retained unchanged. The initial nature selector in the new harness also mismatched the real DOM and was corrected independently; no app assertion was downgraded to hide it.

Added an ES5-compatible, feature-detected ParentNode.replaceChildren shim BEFORE the app scripts. It covers Element and DocumentFragment, preserves existing native implementations, creates text nodes rather than parsing HTML, validates conversion/ancestor errors before moving children, and never reads/writes app data. The full app was reproduced with that API removed: without the shim it reports replaceChildren exceptions and cannot mount task forms; with the shim the real Tasks/Notes UI and Unicode save work without JS errors. This is an Android-identified root cause reproduced in desktop Chromium; a fresh exact-SHA Android run remains mandatory.

Also guarded late duplicate Save callbacks once the editor is closed and prevented overlapping link pickers. Actual desktop callback-after-save verification keeps one record. Missing optional analytics now preserves cached metrics rather than writing a false zero at rollover.

TEST_COMMANDS: node tests/df4_browser/webview_compat.cjs; node --test tests/integration_recovery/webview_compat.test.cjs tests/integration_recovery/missing_analytics_asset.test.cjs; node tests/df4_browser/completion.cjs.
TEST_RESULTS: full-app missing-API compatibility scenario PASS; native-API preservation PASS; optional-asset metric preservation PASS; desktop core flow 24 PASS, zero JS errors. Failing-before reproduction: /workspace/scratch/completion-evidence/webview-compat-before.json. No Android post-fix PASS is asserted here.
ACTUAL_ANDROID_TESTS: historical attempt FAIL / NOT_TESTED as above. New source remains a test candidate, not release approval.
NEXT_BATCH: final exact-SHA source/native build and API30 action rerun; preserve every remaining FAIL/NOT_TESTED and media/language blocker.
