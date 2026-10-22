# P0 Reset persistence repair — 2026-10-22

RELEASE_APPROVED=NO

Base: PR #176, exact `e2d38913b94a5e6966643b061c31acd8e48cd6a9`.
Branch: `fix/timer-reset-save-failure-20261022`, stacked onto
`fix/timer-toggle-save-failure-20261022`, never main.

Read main rules with `git show origin/main:AGENTS.md`, main specialist/coordination
guides, Issue #13, PR #176 and its CURRENT_CHECKPOINT.md. The maintenance guides
are absent from the application branch, so read them via origin/main. Searched
existing Reset PRs; #128 covers confirmation, #176 explicitly leaves Reset open.

## Reproduction / RED

`node --test --test-name-pattern='P0 Reset' tests/integration_recovery/timer_credit_durability.test.cjs`

Before app change: **4 FAIL / 1 PASS**, see RED.txt. Paused/running × exception/false.
The throw path loses identity, task link, remaining and active time; false returns
successful Reset without durable success. Running Reset also saves Pause and
stops native/interval before discovering reset failure.

## Change

Only resetTimerNow production body changes. Stage one stopped/reset snapshot,
require storeTimerSession() === true, roll back all staged fields and display the
existing localized save error on exception/non-true. Rethrow preserves internal
abort contract. Only after save clear interval, stop Native service and publish
play icon/display. Retain label, total, mode, confirmation and training delegation.
No intermediate persisted Pause. Existing Start/Pause/duration/water fixes retained.

Tests extend the existing integration_recovery file (single existing owner:
product_consistency / qa in origin/main agents.json). No new test directory or
manifest patch, and no repetition of PR #173's independent ownership repair.

## GREEN

Same targeted command: **5 PASS / 0 FAIL**, see GREEN.txt.
Checks preserve entire timer state, stored snapshot, button, scheduled work and
native call sequence after rejection; retry saves once before side effects.
These are actual extracted production functions with a synthetic storage/bridge
fixture, not Android or real disk durability proof.

Focused command (FOCUSED.txt): **48 PASS / 0 FAIL / 0 skipped**:

```sh
timeout 45 node --test --test-reporter=tap tests/integration_recovery/timer_credit_durability.test.cjs tests/track05_timer/*.test.cjs tests/track07_functional/timer_destructive_shortcuts.test.cjs tests/track07_functional/timer_mode_button_safety.test.cjs tests/track07_functional/timer_mode_20_locale_prompt.test.cjs tests/timer_native_bridge/native_timer_contract.test.cjs tests/integration_quality/verified_legacy_save.test.cjs tests/integration_recovery/native_durable_ack.test.cjs
```

`timeout 40 node tests/smoke_app.cjs`: PASS (SMOKE.txt).
`node --check android/app/src/main/assets/web/app.js`: PASS.
`git diff --check`: PASS.

## Review / limitations / rollback

Reviewed diff: only Reset body, focused test fixture/cases and these evidence
files. No v21 writer/schema/data, dictionaries, permissions or feature deletions.
The existing Native bridge exception handling remains; native refusal is not
proven repaired. Auxiliary timer persistence remains outside native six-family
ACK; no new process-death guarantee. Quick-training cancellation persistence is
separate and unchanged; delegation alone is tested.

NOT_TESTED: Android/device/WebView interactions, background/force-stop, real disk
failure/process death, SAF, full heavy suites, APK/AAB, new GitHub Actions results.
No workflow manually dispatched, no build, no merge. Reviewers decide admission.
Rollback: revert this scoped commit on the stacked branch; no migration needed.
