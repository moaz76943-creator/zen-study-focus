# Batch 00 — protected live baseline

Execution date: 2026-10-19 UTC (owner reference date: 2026-10-20).
BASE_SHA: 465f58be7442648b1b8d084b316770ac2d43c844
BRANCH: fix/master-completion-20261020
Worktree: /workspace/deep-focus-completion

Live GitHub PRs 1–43 inspected; PR43 is merged into PR25's development head, not main. Main remains fab0b8bb82d0031e8de4e54086734be94bb38cc0. Original main and prior DF4 worktree were clean. PR37 has independent dashboard improvements after consolidation; review its delta before integration. PR42's native session-token work is inherited, not copied again. All remote tips retained in BRANCHES.txt; LIVE_PRS.json includes exact head/state/base. Shared app.js/index/integration/notes/analytics/native files remain owned by this isolated completion branch for these changes. No production merge or force push.

Read full Issue13 body and discussion, PR25 body/discussion/changed files, original 161-task matrices, DF4 ledger/baseline/audits, consolidation report, v21 contract, media licenses and QA08 audit. Existing historical reports retain their historical SHAs.

Baseline actual commands:
- node --test <all tests/**/*.test.cjs except explicit media release gate>: 439 PASS, 0 FAIL.
- python3 -m unittest discover -s tests -p 'test_*.py' -v: 31 PASS.
- node tests/validate_locales.cjs: PASS (dictionary shape only).
- node tests/smoke_app.cjs: PASS (simulated host).
- node --test tests/master_recovery_qa/media_provenance_gate.test.cjs: 1 PASS, 2 FAIL (individual media provenance, earth/noise duplicate); remains blocking release.
- node tools/language_review/audit.cjs --out /workspace/scratch/completion-evidence/localization-baseline: fresh report on exact clean baseline; full rendered localization still incomplete.

ACTUAL_ANDROID_TESTS: NOT_TESTED in this batch. No local adb/SDK or owner phone available. Debug-only CI emulator/CDP is a separate path. Previous failed emulator and empty UIAutomator results are not PASS. Installed owner APK/version/signing certificate are unavailable, so its exact source cannot be inferred; bundled historical APK and branch builds differ.

Protected v21 storage/application ID/schema/signing/permissions remain unchanged. Tests use disposable fixtures only.
NEXT_BATCH: reproduce and repair draft durability/close protection, then timer and Android DOM acceptance paths.
