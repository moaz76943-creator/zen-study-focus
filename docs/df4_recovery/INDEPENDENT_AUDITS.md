# Independent audit integration and current limits

2026-10-19. PR #29 performance tests (58eed565), #30 Android inventory/runner (cb6b233e), #32 language audit (061e42c3) selectively copied into their isolated tests/tools paths. No prototype or optional performance optimizer wired to runtime.

Commands: node --test --test-reporter=tap tests/language_review/*.test.cjs tests/performance_recovery/*.test.cjs tests/android_e2e_recovery/*.test.cjs; node tools/language_review/audit.cjs --out /workspace/scratch/df4-language-audit; node tests/performance_recovery/asset_audit.cjs; node tests/performance_recovery/benchmarks.cjs 7; node tests/android_e2e_recovery/inventory.cjs; python tests/android_e2e_recovery/run_e2e.py --json /workspace/scratch/df4-tests/android-e2e.json.

23/23 Node checks PASS. Initial imported performance font test expected the old Google Fonts URL to exist: changed it to require ZERO optional remote fonts after reviewed #28 fix. Audit scanner now reads actual integrated Arabic analytics and 20-language picker tables, records actual checkout HEAD plus dirty flag, and no longer reports hardcoded old SHA as current. Baseline files remain historical and untouched. Missing explicit source translations: 4,950, down from 5,110 in old catalog accounting (160 fewer missing language/key pairs). This measures source tables, not full rendered screen completeness or translation quality.

Synthetic Node benchmarks ran for 5,000 notes / 1,000 tasks / 10,000 histories; raw results in /workspace/scratch/df4-tests/scale-benchmarks.json. These are neither Android memory nor UI performance measurements. Optional optimizer fixtures are not production changes.

Actual Android runner outcome: all 20 scenarios NOT_TESTED, exit 2, no ADB-connected device/emulator. No data clearance or device writes occurred. Static interaction inventory does not prove controls execute.
