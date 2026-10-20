# Batch 07 — actual rest-phase and unfinished-record exclusion

BASE_SHA: 4576d67
ISSUES_FIXED (source scope): DF-121/122/123/130/134, DF4-018/021/034.

Two new phase-contract tests failed against both existing analytics engines. The older normalizer accepted explicit unfinished/rest records, while the newer normalizer omitted the actual timer phase tokens short and long. These could count rest as focus for imported or legacy history even though the current timer writer avoids emitting such records.

The newer existing read-only normalizer now excludes these actual phases. The older core delegates normalization through it while retaining its public result shape and other reporting/chart features. The shared pure normalizer loads before app bootstrap; legacy graphs, rollover totals, streaks and live goals use its accepted views. Isolated older hosts retain guarded filtering. No history record is deleted, rewritten or renumbered, and absent historical timestamps remain absent. If the optional normalizer fails to load, the legacy app does not invent unvalidated history totals.

TEST_COMMANDS: node --test tests/analytics_core/*.test.cjs tests/analytics_recovery/*.test.cjs; node --test tests/focus_workflows/test_focus_workflows.cjs; node tests/smoke_app.cjs.
TEST_RESULTS: analytics 52/52 PASS, focus workflow 8/8 PASS, smoke PASS. Existing legacy schema/CSV/typed IDs/scale/date tests remain unchanged and pass. Failing-before output: /workspace/scratch/completion-evidence/analytics-phase-red.log.

The broader regression also identified two old language-audit tests that asserted training must remain untranslated outside en/ar. Updated them to REQUIRE all 20 explicit training rows and zero training gaps, while retaining strict assertions that other incomplete catalogs remain visible. Language audit 10/10 PASS; no audit gap was hidden or waived.
ACTUAL_ANDROID_TESTS: NOT_TESTED for these latest source changes.
NEXT_BATCH: integrated regression, final evidence ledger, exact-SHA APK and remaining Android loading evidence.
