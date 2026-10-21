# TRACK 07-09 — staged functional integration (2026-10-20)

**This is a DRAFT REVIEW CHECKPOINT, not FINAL_INTEGRATION_SHA.**
Parent canonical PR #73: `a5d557813c4fa9bd0209e1a12d563e84a7064d56`.  
First staging commit: `b27ec88a136e766eb9fffe19c607ca0e8251ab86`.

## Non-conflicting patches staged as exact file blobs

1. PR #74 / TRACK 07-03, head `e8a98d334e694ed3c872d5c2de51d12986bb5a84`:
   - `localization_20_recovery.js`: rejected synchronous persist (strict false) does not publish a locale change.
   - `tests/localization_20/localization_20.test.cjs`: regression and retry.
   - `docs/track07/07-03.md`: original handoff.
2. PR #78 / TRACK 07-02 and 07-05, tested source head `4a067ad69e40ad7445d9240b53287e7c1dd3f212`:
   - `goals_studio.js`: stage next cfg and require a durable ACK before updating active goal preferences.
   - `timer_settings.js`: stage next cfg and require a durable ACK before changing current timer preferences/cycle state.
   - `tests/focus_workflows/test_focus_workflows.cjs`: failed/throwing ACK regression.
   - Exact SHA unit/source CI: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39421921882 ; 586 Node PASS, Python suites PASS. No same-SHA Android E2E yet.

No shared `app.js`, `index.html`, Java, backup/mirror/AtomicFile source, media, locales catalogue data, package/signature or `main` changed. PR #78's dedicated isolated QA workflow is deliberately not imported to keep this review branch minimal. The parent system QA workflow allowlist is changed only to run this checkpoint on a disposable runner.

## Excluded or blocked work
- **P0:** Track 07-00 PR #77 test harness `a8b440ee851fe7fca4d468d325862397f537a8c6` (based on #76); fresh Android API30 run 39420959639 was pending on first inspection. No new storage source patch is required until evidence indicates it. Do not label the P0 fully resolved.
- TRACK 07-01 Tasks/Notes: existing source in canonical PR #73. No verified additional patch integrated in this checkpoint.
- TRACK 07-04 authentic media and rights: NOT_APPROVED; exclude quarantined audio.
- TRACK 07-06 UI: preserve white premium assets; no speculative redesign.
- TRACK 07-08 privacy: PR #71 Gitleaks possible secret remains BLOCKED; no data disclosure.
- 20 language key-pair gaps: 4608 still require source/human language review.
- Android physical-phone and QA acceptance: NOT_TESTED. Independent final release gating remains with TRACK 08.

## Acceptance contract
- Re-run exact-SHA Node and Python/Java/Debug source QA on this branch; code-only fixes on their prior isolated SHAs do not automatically certify this combined source.
- Check no duplicated file owners or cherry-picks; no manual edits to production release, no auto-merge.
- Integrate approved further fixes one at a time only after overlapping file review and independent QA.
- Final integration needs device-native ACK/primary/mirror/journal negative tests, true SAF backup/restore, Notes/Timer, 20-language full parity and original nature audio release clearance.
- **RELEASE_APPROVED=NO.** No merged main or shipping APK from this checkpoint.
