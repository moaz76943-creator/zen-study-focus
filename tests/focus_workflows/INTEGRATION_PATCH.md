# DEEP-FOCUS-06 — Integration patch / contracts

Base: `fix/v21-safe-release-recovery-20261018` at `527d85978c8dfd3a3eab8aa8cfae199c4d541c8b`.
Scope here: `timer_settings.js`, `goals_studio.js`, `quick_training.js`,
`sound_mix_controls.js`, `tests/focus_workflows/`.
**Do not cherry-pick an app.js or Android change from this branch: none was made.**
Coordination with lane 00 is necessary before production integration.

## Existing and proposed data contract

The canonical v21 completed record is:
```js
{id: "unique-session-id", date: "YYYY-MM-DD", minutes: 25, domain: "study"}
```
Keep `id` types intact: real v21 session IDs are strings; task IDs are numeric safe integers.
Old records have **no trustworthy start/end timestamp**. Never invent one.
`goals_studio.js` now validates and deduplicates by **(ID type, ID value)**,
rejects invalid/demo rows, maps `exam→work` and `review→read`,
and totals calendar days/ISO-date Monday-first weeks. Dates use the
original `localDateISO()` convention. Missing or invalid minutes do not count.
Weekly goals live in `cfg.weeklyGoalsMin`; daily goals stay in `cfg.dailyGoalsMin`.
Both are *preferences*; only `cfg.sessionHistory` is credited progress.
No migration or new persistence keys are required.

Recommended opt-in extensions to **future** completed rows once 00/01/04/05 agree:
```js
{
 id: "original-session-id", date: "2026-10-19", minutes: 25,
 domain: "study", taskId: 1730000000000,
 startedAt: "2026-10-19T08:00:00.000Z",
 endedAt: "2026-10-19T08:25:00.000Z"
}
```
Add `startedAt`/`endedAt` **only** when actual trustworthy timestamps exist.
Do not derive them from a legacy `date` or reconstruct from `minutes`.
The analytics lane owns final schema and duplicate-id policy.

## Lane 00 exact integration requests (not executed)

1. In `app.js → focusOnTask(id)`, after finding the existing task, call
   `focusWorkflowLinkTask(t.id)` if present. Preserve the original numeric ID.
   Do not replace existing text/nav behavior. Reject starter or missing tasks.
2. In `app.js`, introduce `focusSessionTaskId`, capture it **once** when a
   newly started timer obtains `timerSessionId`:
   ```js
   focusSessionTaskId = quickTraining?.active
     ? (Number.isSafeInteger(quickTraining.taskId) ? quickTraining.taskId : null)
     : (typeof focusWorkflowGetLinkedTask === 'function'
        ? (focusWorkflowGetLinkedTask()?.id ?? null) : null);
   ```
   Persist optional `taskId` in `storeTimerSession()`; restore it only when it
   is a nonnegative safe integer; clear on explicit reset/new mode. In
   `creditCompletedSession()`, attach that `taskId` to the **single**
   canonical record `cfg.sessionHistory.push(...)`; do NOT append another record
   for the task or for the quick workflow event. Preserve the existing
   `completedTimerIds` dedupe and active-time calculations.
3. To expose a trustworthy phase-completion event for lane 05, emit it after the
   **one** successful canonical record insertion, carrying `id,date,minutes,
   domain,taskId` from the existing record. Events are UI projections, not a
   second ledger. Define `deep-focus:session-recorded` with `schemaVersion:1`.
   Do not synthesize `startedAt/endedAt` from `timerTotal` on restore.
4. Load `sound_mix_controls.js` using a classic `<script>` **after**
   `app.js`, then set up the optional controller:
   ```js
   window.focusSoundMixer = DeepFocusSoundMixer.createSoundMixer({
     catalog: SOUNDS_DATA,
     isPlaying: id => Boolean(activePlayers[id]),
     start: id => toggleSoundTile(id),
     stop: id => stopSoundTile(id),
     setVolume: (id,v) => setTileVolume(id,v)
   });
   ```
   Existing `toggleSoundTile`/generation tokens still own `Audio` and synth
   fallback lifecycles. A mixer preset can call
   `focusSoundMixer.applyMix([{id:'rain',percent:55},{id:'fire',percent:25}])`.
   Call `renderSoundsStudio()` after a preset/slider UI action if needed.
   `stopAll()` and `dispose()` stop all active players, invalidating stale
   errors/promises via existing `stopSoundTile` semantics. The optional module
   is not currently loaded by `index.html`.
5. Existing mode-pill HTML directly calls `selectTimerMode`, which resets a
   running/paused session without explicit approval. Route *user clicks* through
   a lane-00 confirmation wrapper, leaving automatic phase transitions and
   internal `selectTimerMode` unaffected. Keep timer centered in bottom
   navigation and Quick Training directly adjacent; current `index.html`
   already has this arrangement.
6. Lane 00 should add `node --check sound_mix_controls.js` and
   `node --test tests/focus_workflows/test_focus_workflows.cjs` to its JS gate
   if desired. This branch also provides `test_focus_workflows.py` in a
   Python-discoverable package, so the existing
   `python3 -m unittest discover -s tests -p 'test_*.py' -v` runs it.

## Event contract

`deep-focus:workflow` (CustomEvent, UI-only):
`{schemaVersion:1,source:'quick-training',kind:'started'|'phase'|'completed'|'cancelled', ...}`.
`started` contains `domain,taskId,sets,workSeconds,restSeconds`.
`phase` contains `domain,taskId,phase,set,sets` with `set` 1-based.
`completed` contains `domain,taskId,sets`.
`cancelled` contains `domain,taskId,completedSets` (0-based number of prior sets).
No quick-workflow event awards minutes. Only the original app.js
`creditCompletedSession()` has the accounting authority.

## Android physical-device verification required

The app's native `FocusTimerService` is unmodified; source inspection is **not**
on-device proof. Test notification permission behavior and Android background
limitations using a real phone, including screen-off, process death,
reopen/restore, pause/resume, rotation, notification dismissal, and end of long
and short breaks. Verify the JS finalization and native expiration cannot
double-credit, and the native notification never continues after an explicit
pause/stop. Check wake-lock release, battery optimization and audio focus.
Audio media provenance/release blockers from PR #1 remain open.

## Run

```sh
node --test tests/focus_workflows/test_focus_workflows.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
node tests/smoke_app.cjs
```

This is **not release approval**. Integration, native device QA and checks on
the final merge SHA are mandatory.
