# Batch 05 — reviewed Control Center v3 delta

BASE_SHA: 844d282
Reviewed independent PR37 head 787195f (live branch has continued since the initial snapshot). Merged into this isolated repair branch with a normal two-parent merge, without overwriting the current Android tree. The reviewed delta contains 17 dashboard/workflow/test/tool files and no Android production assets.

Added: reliable partial/stale GitHub refresh preserving last same-SHA data, explicit local offline snapshot mode, bounded validated design drafts tied to the baseline, working Undo/Redo and reset handling, a portable single-file mobile HTML bundle with hash-based CSP and a static official 161-task ledger clearly marked as stale source evidence. Fixed QA-agent test paths; no automatic release/merge or new broad permissions. Imported snapshots cannot promote untrusted audit/approval claims into verified device QA. Design edits still generate reviewable source requests; they do not claim to modify an installed APK.

TEST_COMMANDS: node --test tests/control_center/*.test.cjs; node tools/control_center/generate_style.cjs --check; node tools/control_center/build_portable.cjs --output dist/deep-focus-control-center-mobile.html; node tools/control_center/build_portable.cjs --check dist/deep-focus-control-center-mobile.html.
TEST_RESULTS: 80/80 Node PASS; approved design CSS parity PASS; portable generation/parity PASS.
ACTUAL_ANDROID_TESTS: NOT_TESTED. Developer HTML desktop validation does not prove native phone touch, app performance, or production readiness.
NEXT_BATCH: source regression and integration evidence, including final SHA APK and unresolved Android/media/language gates.
