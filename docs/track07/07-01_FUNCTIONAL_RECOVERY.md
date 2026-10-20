# TRACK 07-01 — Tasks checklist/subtask durable UI recovery

Date: 2026-10-20. Canonical untouched base PR #73 SHA `a5d557813c4fa9bd0209e1a12d563e84a7064d56`.
Scope is the existing Tasks Studio only. No shared integration-owned source or v21 packet/schema modifications.

## Reproduction — RED
- Source `tasks_studio.js`: the HTML checkbox is changed by the browser before the `change` handler.
- When `adapter.commit` returns `false` or throws, persistent task state remains unchanged but the checkbox stays visually checked.
- Separate regression file `tests/track07_functional/task_checklist_ack.test.cjs` reproduces both false and throwing ACK for checklist and subtasks, asserts visible rollback and successful retry.
- Exact-head RED run: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39424361224 — 37 existing PASS, 2 new FAIL.

## Minimal fix — GREEN
- Changed ONLY `android/app/src/main/assets/web/tasks_studio.js` in application source.
- `apply` returns true for acknowledged/no-op result, false on rejected/throwing persistence.
- Failed checkbox/subtask toggles revert the displayed checkbox to its last persisted value, without recreating the task editor or changing user data.
- Exact-source GREEN run: https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39424471553 — 39 PASS, 0 FAIL, 0 SKIP, plus JS syntax PASS.
- Native Android failure injection, actual force-stop and device UI: NOT_TESTED on this track.

## Handoff to 07-09
Integrate only the production source fix and targeted regression after code and branch ancestry review. The branch-specific QA workflow and report do not need to be shipped. Re-test source on the integrated SHA and Android API30 against real v21 durable ACK. No changes to `app.js`, `index.html`, `integration_v22.js`, `MainActivity.java`, or data format. Do not auto-merge or release. `RELEASE_APPROVED=NO`.
