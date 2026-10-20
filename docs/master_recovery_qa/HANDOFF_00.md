# Lane 11 → Integration Leader 00: actionable blockers

Audit source: `28b19a1b4c0e51096303e3c8c30384ab40623457`; ticket: https://github.com/moaz76943-creator/zen-study-focus/issues/13

## P0 — Block release
1. **MEDIA_PROVENANCE:** bundled `.ogg` assets lack a complete individualized license/source/checksum manifest. `docs/MEDIA_LICENSES.md` openly says many files are unaudited; synthesized placeholders were historically present. Do not substitute labels for real recordings. Owner 02/03 + integration 00.
2. **CONFLICT_PR12_LOCALE:** PR #12 deliberately removes `ar/fa/ur` from selection and imposes English, conflicting with DF-043–059. No merge into the 20-language contract. Owner 04 + 00.
3. **ANDROID_DEVICE_QA:** No actual on-device recorded results for mixed audio, one-shot completion alert, real WebView gestures, TalkBack, 20 locales, ASCII SVG digits, or a restored v21 backup. Owner 00 coordinates device run; lane 11 witnesses.
4. **INTEGRATION_E2E:** Existing cross-lane **pure** tests pass at CI integrated SHA but are not an Android user's note→task→timer→analytics event path. Device protocol E2E-01 is outstanding.
5. **CI_SCOPE:** Existing workflow runs `tests/integration_quality/*.test.cjs` but **does not include** `tests/master_recovery_qa/*.test.cjs`. Leader 00 owns workflow amendment, preserving permissions/signing. Run QA explicitly on the exact integrated HEAD and fail build on red tests. Do not weaken provenance checks.

## Evidence already available
- Integrated commit: `28b19a1b4c0e51096303e3c8c30384ab40623457`.
- Existing CI success: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39194321909
- Jobs: syntax+locale, integrated Node tests, Debug APK, unsigned AAB, Python safety regressions all succeeded. Signed release job skipped.
- This branch changes ONLY `tests/master_recovery_qa/**` and `docs/master_recovery_qa/**`. No production files modified.

## Commands for lane 00 (from repository root)
```sh
node --test tests/master_recovery_qa/*.test.cjs
node --test tests/data_contracts/*.test.cjs tests/notes_core/*.test.cjs tests/notes_ui/*.test.cjs tests/tasks_core/*.test.cjs tests/analytics_core/*.test.cjs tests/focus_workflows/*.test.cjs tests/design_quality/*.test.cjs tests/regression_v21/*.test.cjs tests/integration_quality/*.test.cjs
node tests/smoke_app.cjs
node tests/validate_locales.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```
**Expected before media license remediation:** `media_provenance_gate.test.cjs` FAIL by design. Treat it as an actual release blocker, not a noisy test to skip. Repeat full QA after every accepted PR merge. CI pass ≠ production readiness.
