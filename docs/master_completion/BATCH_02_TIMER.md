# Batch 02 — durable timer completion

BASE_SHA: 0b12c8c
ISSUES_FIXED (source scope): DF-078/112/113/122/154/155, DF4-012/013/018/027/034.

Confirmed failure: creditCompletedSession mutated counters, duplicate-ID ledger, history and training remainder before the durable write. A refused write left a phantom completed ID in memory and made the retry a no-op. Five new contract cases failed before the fix.

Credit is now built on a detached cfg candidate and committed through the existing six-packet integration journal before publishing. The old standalone host also requires verified primary/mirror acknowledgement. Failed credit leaves counters/history/remainder unchanged, keeps the completed session ID and actual elapsed time, and stops phase/training advancement and success events. Play at 00:00 retries the pending completion rather than starting another session. No extra minute, new ID, or duplicate callback credit is added. Existing persisted timer snapshot supports reload reconciliation; no v21 schema/key or native bridge change.

TEST_COMMANDS: node --test tests/integration_recovery/{timer_credit_durability,restore_journal}.test.cjs; node --test tests/focus_workflows/test_focus_workflows.cjs; node tests/smoke_app.cjs.
TEST_RESULTS: 9/9 focused durability/journal PASS, 8/8 focus-workflow PASS, smoke PASS. Real integration fault injection rolls back exact packet bytes on a failed cfg mirror, then retries once preserving unknown fields. Raw failing-before output: /workspace/scratch/completion-evidence/timer-red.log.
ACTUAL_ANDROID_TESTS: NOT_TESTED. Native DND/Bluetooth/process-death acceptance remains unverified.
NEXT_BATCH: review all remaining write entry points, dynamic locale refresh and Android DOM on an exact new test build.

## Incremental checkpoint — CROSS-002 / TIMER-028/029 (2026-10-22 reference)

Timestamp UTC: 2026-10-21T23:30:44Z. Status: CONFIRMED_SOURCE_DEFECT → SOURCE_TESTED; Android NOT_TESTED. RELEASE_APPROVED=NO.

- MAIN_SHA: `a552ec566d9089ff930df224fa80f03a8ef1aa3a`.
- INTEGRATION_SHA / BASE_SHA: `d0116e69e67667b24a1689d621823d9823df2711`, live PR138 still open/unmerged.
- Working branch: `fix/timer-toggle-save-failure-20261022`, isolated worktree. Preserve all other worktrees.
- Previous scoped fix PR175 at `70f944d7460610882f1c4dd592989d5bb4160283` remains separate/unmerged: its source/browser/registry/verify checks finished SUCCESS in runs [39692935259](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39692935259) and [39692935499](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39692935499). Not Android evidence. This branch does not copy its water-counter hunk or checkpoint file.
- PR173 ownership fix remains open at `003461525045200f26a896203da5b18dcdf97959`. Issue69 remains COVERAGE_GAP under the old manifest; no fresh full-cycle claim.

Root cause: Start published `timerRunning`, ID and button before snapshot persistence could throw. Pause cleared the JS interval and changed running/elapsed state before saving, leaving native service running if persistence failed. A false return from the writer was ignored by `storeTimerSession`. These are real production function paths, reproduced with synthetic persistence fault injection; not a claim of reproduced Android hardware failure.

Repair: return the existing writer result from `storeTimerSession`; stage the synchronous Start/Pause state and require successful storage before changing interval, native service or button. Restore original remaining time, target, ID, task and elapsed/resume accounting on failure. Display the existing localized save error and rethrow the original failure, preserving the abort contract for internal mode/reset/training callers. A retry accounts elapsed time once. No schema/key/format, native bridge, permission, signing, audio, or locale-dictionary change.

Files: `android/app/src/main/assets/web/app.js`, existing owned `tests/integration_recovery/timer_credit_durability.test.cjs`, this existing timer evidence document. No new registry or duplicate task ledger.

Evidence:

- RED: final 11-case suite replayed with exact base app in an isolated temporary tree: 5 PASS / 6 FAIL. Four Start/Pause rejection scenarios plus two internal-caller abort checks failed before the repair.
- GREEN: `timeout 30 node --test --test-reporter=tap tests/integration_recovery/timer_credit_durability.test.cjs`: 11 PASS / 0 FAIL. Covers thrown quota-like error and false writer result, unchanged button/interval/native actions, snapshot identity, elapsed time and retry, plus rejected Pause during mode change/Reset.
- Neighbor regression: `timeout 45 node --test --test-reporter=tap tests/integration_quality/*.test.cjs tests/data_contracts/*.test.cjs tests/integration_recovery/timer_credit_durability.test.cjs tests/integration_recovery/native_durable_ack.test.cjs tests/track05_timer/*.test.cjs tests/track07_functional/timer_destructive_shortcuts.test.cjs tests/track07_functional/timer_mode_button_safety.test.cjs tests/track07_functional/timer_mode_20_locale_prompt.test.cjs tests/timer_native_bridge/native_timer_contract.test.cjs`: 83 PASS / 0 FAIL, includes focused 11.
- `timeout 30 node tests/focus_workflows/test_focus_workflows.cjs`: 16 PASS / 0 FAIL.
- `timeout 40 node tests/smoke_app.cjs`: PASS, including source-level 20-locale, focus/training, backup/XSS/audio smoke. JS syntax and diff checks PASS.
- Raw local synthetic logs: `/workspace/scratch/timer-toggle/`; exact commit and draft PR receipt recorded on GitHub after commit.

Limits: auxiliary active-timer snapshots are outside native six-family ACK, as before. This patch does not establish force-stop durability, Android background/locked-screen behavior or all other `storeTimerSession` callers. They remain NOT_TESTED / separate follow-up. Rethrowing is intentional: the failure is visible and internal callers cannot silently proceed. No global exception suppression added. Fresh security scans, human locale review, APK/AAB and device tests NOT_TESTED. No expensive workflow dispatched manually.

MERGED_INTO_STAGING=NO. MERGED_INTO_MAIN=NO. Integration owner must review shared `app.js` hunks against current PR138 and PR175; these touch separate functions. Next exact operation: inspect exact-head focused CI, then schedule synthetic Android Start/Pause write-failure tests with real taps, native/JS agreement and retry. Do not infer those results from this VM test. Preserve PR158's existing paused/duplicate tick guard.
