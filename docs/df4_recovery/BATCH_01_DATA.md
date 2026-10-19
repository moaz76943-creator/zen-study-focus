# Batch 1a — verified legacy edits and import validation

Date: 2026-10-19. Base: e6c8a00. Branch: fix/df4-master-recovery-20261019.

Implemented DF4-027/033/034 (partial), DF-064/075/078/119/154 (partial): legacy task/note creation, toggling, deletion, calendar/blur changes and quick capture construct candidates, then publish only after verified persistence. Integrated runtime uses the existing atomic six-packet journal through DF22Integration.write. Failed writes preserve input, modal, records and unknown fields; task dates remain optional. Authored numeric glyphs remain intact. No schema/key/package changes. New backup imports reject numeric-string and duplicate IDs; read-only inspection of existing duplicate records remains non-destructive.

Imported the 10 isolated security tests/docs from PR #27 unchanged for initial reproduction. Initial Node execution: 15/23 passed, 8 failures. Data/import fixes address four of those failures, including the legacy mutation assertion. WebView P0 fixes follow separately. Original lane reports retain their historical authoring status; this report is current execution evidence.

Commands: node --check android/app/src/main/assets/web/app.js; node --test --test-reporter=tap tests/integration_recovery/legacy_edit_durability.test.cjs tests/data_contracts/*.test.cjs tests/integration_quality/*.test.cjs tests/security_recovery/data_resilience.test.cjs tests/security_recovery/legacy_import_contract.test.cjs tests/security_recovery/xss_markdown.test.cjs; node tests/smoke_app.cjs; git diff --check.

Results: 62/62 focused Node tests PASS; smoke PASS; syntax/diff PASS. Fault injection covers nine legacy operations with quota failure, both integrated and standalone acknowledgment paths, input/modal retention and retry. Existing atomic tests use actual journal implementation for interrupted/failing writes. Logs: /workspace/scratch/df4-tests/batch1-data.log.

Baseline: 302/304 Node tests PASS (two pre-existing media provenance failures), 30 Python tests PASS, legacy smoke PASS. No release gate weakened.

Android: NOT_TESTED (no adb/device). Remaining: native boundary, legacy restore crash handling, broader legacy/Studio writers, full-language error messages, hardware durability. No DF task closed, no production approval.
