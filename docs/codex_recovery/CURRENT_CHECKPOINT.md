# Current incremental recovery checkpoint

Timestamp UTC: 2026-10-21T23:21:02Z (user reference date: 2026-10-22).
Task: CROSS-001 / DATA-024 / TRACK01, failed water-counter persistence.
RELEASE_APPROVED=NO.

## Source and ownership

- Main: `a552ec566d9089ff930df224fa80f03a8ef1aa3a`.
- Application integration PR138: `d0116e69e67667b24a1689d621823d9823df2711`, still open/unmerged at verification.
- Base and selected application source: that exact PR138 head, not main's older application.
- Isolated branch: `fix/water-counter-ack-20261022`; original worktrees preserved.
- Existing PR173 already fixes timer-test ownership. It remains open at `003461525045200f26a896203da5b18dcdf97959`; do not duplicate it or inherit old Issue69 evidence after its manifest changes.
- Reviewed hourly workflow path omission: the neighboring daily-maintenance PR workflow already covers manifest and ownership tests. No redundant CI added.

## Confirmed defect and repair

`app.js:addWaterCup` changed live `cfg.water` before `saveFortressData` could reject Native ACK, mirror write or readback. Failure left in-memory progress advanced and escaped the click handler. A later retry could persist two increments although only one was acknowledged.

The action now persists a shallow candidate through the unchanged v21 writer, requires `true`, then publishes the water field and refreshes the header. On failure it keeps the original live object/count and displays the existing localized `saveFailed` message. Unknown fields, session history, numeric identities, envelopes, native bridge and backup marker remain unchanged. Existing 8→0 cycling remains.

Regression tests extend the already-owned `tests/integration_quality/activity_domain_durable_ack.test.cjs`. They execute the actual production action and writer in a VM, using synthetic storage and an injected Native ACK boundary. They cover rejected ACK, mirror quota error, mismatched readback, false adapter return and retry; both raw packet copies and live state are compared. These are source integration tests, not Android durability proof.

## Evidence

- RED on unchanged base app with new tests: 9 cases, 4 pass / 5 fail.
- GREEN: `timeout 30 node --test --test-reporter=tap tests/integration_quality/activity_domain_durable_ack.test.cjs`: 9 pass / 0 fail.
- Neighbor/storage: `timeout 45 node --test --test-reporter=tap tests/integration_quality/*.test.cjs tests/data_contracts/*.test.cjs tests/integration_recovery/native_durable_ack.test.cjs`: 62 pass / 0 fail (includes the 9 above; do not add counts).
- Adjacent activity/timer: `timeout 40 node --test --test-reporter=tap tests/integration_recovery/activity_counter_durability.test.cjs tests/integration_recovery/timer_credit_durability.test.cjs tests/track05_timer/tick_lifecycle.test.cjs`: 13 pass / 0 fail.
- `timeout 40 node tests/smoke_app.cjs`: PASS (startup, 20 locales, focus/interval/rest, backup, XSS, audio source smoke).
- JS syntax and `git diff --check`: PASS.
- Local raw logs: `/workspace/scratch/water-ack/`; summarized permanently here. They contain synthetic data only.
- Android/physical device, new APK/AAB, end-to-end SAF, security scans and human locale/audio reviews: NOT_TESTED this session. No expensive workflow dispatched. No permissions/signing/media/locale dictionary changes.

## Handoff

Publish one scoped draft PR targeting PR138's integration branch, carrying only this action, regression and checkpoint. PR and exact commit receipt are recorded in GitHub. Central `app.js` has many owners: do not merge until integration owner reviews this 14-line hunk and reruns relevant checks against any newer head. Main and staging remain untouched by this session.

Next exact action: review the draft's focused CI result on its exact head; Android acceptance later must inject failure with synthetic QA data, tap Water, verify unchanged count/error, then retry, force-stop/reopen and verify exactly one acknowledged increment. Do not start APK/emulator work merely to fill this checkpoint. PR173 admission and its fresh bounded four-cohort cycle remain separate and pending human review.
