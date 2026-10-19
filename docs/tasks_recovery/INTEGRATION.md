# DEEP-FOCUS-RECOVERY-08 — Tasks lane handoff

Source issue: https://github.com/moaz76943-creator/zen-study-focus/issues/13
Baseline: `632ef51ae6034224e6b459e0962a8bbedbf2b18e`
Integration owner: lane 00. This is a **standalone draft**, not activated on Android.

## File ownership and compatibility
Changed production modules only:
- `android/app/src/main/assets/web/tasks_core_v21.js`
- `android/app/src/main/assets/web/tasks_studio.js`

Added:
- `tests/tasks_recovery/tasks_recovery.test.cjs`
- `tests/tasks_recovery/tasks_recovery_ui.test.cjs`
- `docs/tasks_recovery/INTEGRATION.md`

No edit to `app.js`, `index.html`, timer, native Android, CSS shared root, storage keys, signatures, CI workflows or source translations. The existing v21 numeric `id`, `date`, `catKey`, `done`, `isStarter` plus unknown fields are retained, including on updates. New data is additive:
- Optional `dueAssigned` boolean. Missing flag on old records means due date was assigned, preserving old behavior. Quick capture sets false but retains the legacy `date` as the local task day. Rescheduling sets true.
- `cfg.taskTopThreeV21[YYYY-MM-DD]=number[]` stores up to three distinct manually selected, active real task IDs. When absent, the original automatic top-three suggestions remain visible, for backward compatibility. Explicit empty list means no selection.
- Repeat frequency `weekdays`, interval exactly 1. Existing `daily`, `weekly` and `monthly` remain supported.
- No new storage keys, migration, session-history writer or autonomous timer.

## Exact DF status (tested scope vs integration)
| ID | Local result | Gate |
| --- | --- | --- |
| DF-105 | Quick inline form submits a titled task, no advanced input required | mount and persisted adapter required |
| DF-106 | Compact card: title/status, conditional due, single complete/reopen action; details collapsed | device visual/touch QA pending |
| DF-107 | Existing edit, archive, recoverable trash, undo/redo, complete/reopen retained | journal-safe commit needed |
| DF-108 | Existing numeric subtask/checklist IDs, progress, tappable items retained | Android input QA |
| DF-109 | Optional deadline marker, project/category/priority/time fields in advanced editor | legacy date remains preserved |
| DF-110 | Today, Upcoming, Overdue, Completed tabs; tap-based reschedule | timezone/device QA pending |
| DF-111 | Manual daily top-three with max three, preserves fallback legacy suggestions | verified in isolated JS |
| DF-112 | Existing numeric task-to-timer callback retained; focus minutes read-only from real history | BLOCKED until lane 00 proves persistent timer ID and completion event |
| DF-113 | Existing unique-session-ID dedupe, conflicting replay exclusion, idempotent recurrence retained | real process-death test pending |
| DF-114 | Weekdays (skips Sat/Sun UTC-calendar math) added to daily/weekly/monthly repeats | DST unit case passes; device/system-clock QA pending |
| DF-115 | Existing progress excludes starter/demo and trashed tasks | isolated JS test passes |
| DF-116 | Existing numeric note IDs and date-calendar model retained | BLOCKED: note, calendar cross-module adapter |
| DF-117 | Search, category, project, status filters and date/title/priority sorting | touch/keyboard test pending |
| DF-118 | Planned minutes optional; actual focus shown only from canonical completed events | no generated focus time |
| DF-119 | Unrecognized top-level and nested legacy data retained | isolated JS test passes |
| DF-120 | 1,000 task logic, DST weekday, quota failure tested in isolated JS | BLOCKED: physical v21 backup/restore and quota on Android |

## Tested
Existing suites: `tests/tasks_core/tasks_core.test.cjs` and `tests/tasks_core/tasks_studio.test.cjs` (12 cases).
Added suites: `tests/tasks_recovery/tasks_recovery.test.cjs` and `tests/tasks_recovery/tasks_recovery_ui.test.cjs` (18 cases).
**30/30 passed in an isolated V8/CommonJS adapter exercising actual remote source and test text.** This was not a Node command, CI execution or physical Android test; do not relabel it as one. New tests cover actual fake-DOM event handlers, state mutations, Undo, write failure, synthetic-focus non-attribution, repeat replay, DST dates, unknown fields and 1,000 tasks.

Required in a checked-out Git working tree:
```sh
node --check android/app/src/main/assets/web/tasks_core_v21.js
node --check android/app/src/main/assets/web/tasks_studio.js
node --test tests/tasks_core/*.test.cjs tests/tasks_recovery/*.test.cjs
```
Then run the repository's full JavaScript/Android build, v21/`ZEN21::` backup-restore tests and on-device WebView touch/storage/keyboard/performance tests before approval.

## Integration contract for lane 00
1. Load `tasks_core_v21.js` before `tasks_studio.js` and mount `DeepFocusTasksStudioV21.mount(root,adapter)` exactly once in an owned container. Do not mount beside an overlapping legacy task list.
2. Adapter must expose `readState():{cfg,tasksList}` and synchronous, **durable, atomic and failure-throwing** `commit(before,after)` for cfg/tasks together, respecting v21 primary/mirror/journal backups. Existing `saveFortressData` swallows write errors; it must not be treated as verified success.
3. Timer bridge `linkTaskToTimer(id:number):true` must persist that exact numeric ID across pause/restore and only append one completed focus/custom session `{id:string,date,minutes,domain,taskId:number,mode:'focus'|'custom',completed:true}` on recorded success. Never mutate `todayMins` from tasks UI or infer old focus time.
4. Respect `isStarter` and `deletedAt` in other legacy home/calendar/task renderers (lane 00 owns them). Before extracting note checkboxes as tasks, use one confirmed atomic two-family transaction; never half-save.
5. User-selected language may be any of 20: current Tasks Studio has pre-existing ar/en labels; localization lane 04 must provide integrated translations without removing ar/fa/ur or rewriting user-authored text. Numerals are display-only Western 0–9 in localization lane 05.
6. Preserve Android package `com.zenstudy.focus`, `ZEN21::`, `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, and every extra property. No `force-push`, direct `main` merge or release without lane 00 human approval.
7. Block production until actual 320px viewport and Android keyboard/Safe Areas, physical backup restore, storage-full injection, task-to-session trace, background/restart and Android WebView QA complete.

## Conflict handoff
Two edited files belong exclusively to this task lane while integration runs. Lane 00 should merge these after reviewing its own edits to `app.js` and related timer/history APIs. Other tracks must not concurrently rewrite these two modules. PR #12 remains a separate shared-file conflict. Any failures, skipped device checks or locale coverage gaps must remain documented rather than being reported as PASS.
