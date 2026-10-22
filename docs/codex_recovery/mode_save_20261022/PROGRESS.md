# P0 mode/custom session persistence — 2026-10-22

RELEASE_APPROVED=NO

Base exclusively PR #177: `8febb55ceca5623529060d091e506ff02bc3c799`.
Branch: `fix/timer-mode-save-failure-20261022`, targeting PR177 branch
`fix/timer-reset-save-failure-20261022`. No main/integration writes or merges.

Read `git show origin/main:AGENTS.md`, PR177's Reset PROGRESS and inherited
CURRENT_CHECKPOINT. Main coordination/specialist guides and Issue13 already read
in this session. Verified PR177 still open/Draft at exact requested SHA. Searched
open custom/mode PRs: historical #126/#128/#136 cover confirmations/device QA,
not this rejected-save and custom-title snapshot repair. Existing worktree clean
at base. Previous Reset/Start/Pause/water/duration repairs remain unchanged.

## Reproduction and implementation

1. A live or paused session has an ID/task link/elapsed time and label. Reject the
replacement snapshot (throw or false), allowing an intermediate Pause to save.
Old selectTimerMode loses mode/progress/training; live replacement first persists
Pause/stops native. Custom UI can report success after false.
2. Even with successful storage, old custom Save writes old label then changes
memory. Real restoreTimerSession reads the old label.
3. Stage mode, duration, identity, task link, label and external training cancellation
as a single snapshot. Require true; restore all staged fields and existing save
error + throw on failure. Native/interval/UI updates happen after persistence.
Wrapper propagates result, including Cancel. Optional label parameter lets custom
Save include its new title in the same snapshot, no separate label mutation.
4. Direct Home shortcut previously erased training before calling the selector;
now delegates cancellation/persistence/UI to the selector. This caller adjustment
is necessary for failed replacement to preserve training.

Only four production functions changed: selectTimerMode, selectTimerModeFromUser,
applyCustomTimerNow and direct caller selectHomeQuickSession. No engine rewrite,
v21 writer/key/schema/backup change, locale change or unrelated feature removal.

## RED / GREEN evidence

See TEST_RESULTS.txt for compact unmodified output excerpts.

- Initial new matrix and neighbors before app edits: **20 FAIL / 2 PASS**. Covers
mode/custom × running/paused × active/no training × throw/false, cancel/propagation,
Home preservation and internal seconds/Skip compatibility.
- Additional independent successful-label test re-executed against original
PR177 source after writing the fix: **1 FAIL / 0 PASS**, stored 'Old label'
instead of 'New custom title (47m)'. Fixed source restored in finally.
- Final new cases: **23 PASS / 0 FAIL / 0 skipped**. Retry requires one save before
native/interval/render/close; checks all session fields and unchanged UI on failure.
Real production restoreTimerSession + updateTimerDisplay verify restored title
and mode. Storage/DOM/native are synthetic; not device durability evidence.
- Initial neighboring run: 85 PASS / 2 FAIL, both source-shape assertions expecting
old three-argument delegation/post-save label assignment. Updated those assertions
to require returned result and label in the confirmed persisted transition; no
behavior assertion suppressed. Final neighboring run: **87 PASS / 0 FAIL / 0 skipped**.
- Startup smoke: PASS. JS syntax and diff checks: PASS.

Commands:

```sh
node --test --test-name-pattern='P0 mode/custom' tests/integration_recovery/timer_credit_durability.test.cjs
timeout 45 node --test --test-reporter=tap tests/integration_recovery/timer_credit_durability.test.cjs tests/track05_timer/*.test.cjs tests/track07_functional/timer_destructive_shortcuts.test.cjs tests/track07_functional/timer_mode_button_safety.test.cjs tests/track07_functional/timer_mode_20_locale_prompt.test.cjs tests/timer_native_bridge/native_timer_contract.test.cjs tests/integration_quality/verified_legacy_save.test.cjs tests/integration_recovery/native_durable_ack.test.cjs tests/focus_workflows/test_focus_workflows.cjs
timeout 40 node tests/smoke_app.cjs
node --check android/app/src/main/assets/web/app.js
git diff --check
```

Existing suite ownership retained: integration_recovery -> product_consistency,
track07_functional -> navigation in main agents.json. No new test folder, duplicate
owner or repeat of separate PR173 ownership patch.

## Scope review and limits

Manual diff review confirms protected prior repair bodies untouched. Standard
button confirmations retain reviewed translations, external training cancellation
is delayed until saved, internal quickInternalChange retains training and sub-minute
rest durations, and Skip/Home still choose valid modes. Source smoke exercises
focus/interval rounds/rest/skip. Real restore/display bodies are used in new tests;
validQuickSnapshot is stubbed in this fixture, covered by neighboring training suite.

NOT_TESTED: Android/WebView/device/background/force-stop, real disk/power-loss,
SAF, APK/AAB, broad heavy suites, fresh GitHub Actions results. No Android/build
or manual Actions dispatch. Auxiliary active-timer snapshot still has existing
storage guarantees, not a new native six-family ACK/process-death guarantee.
Other multi-save operations (domain switch, starting/advancing/cancelling training,
sport quick rest) are unchanged; their own failure atomicity is not certified here.
Existing long-label restore truncation and Native bridge refusal handling unchanged.

Rollback: revert this scoped commit on its stacked branch; no data migration.
Next: review the exact published commit, shared app.js hunks and evidence; manual
admission only. No release approval follows from these source tests.
