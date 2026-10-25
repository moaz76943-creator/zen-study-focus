# DF-LANE-07 — handoff to integration owner (LANE-03)

## Tested scope
- `timer_settings.js` stages v21 configuration in a separate object, requests verified dual-copy persistence, then mutates live `cfg` only after acknowledgement.
- UI translation refresh must not call Start/Pause/Reset or change a session ID, deadline, left seconds, custom title or focus count.
- New extra toast keys: timer 11 (save failed), 12 (activity changed); Arabic/English fallbacks only. Existing reviewed locale packs cover 0–10. Do **not** claim 99 complete timer locales from this lane.

## Integration boundaries (not changed here)
- `app.js` owns `creditCompletedSession`, `finalizeTimerSession`, `restoreTimerSession`, Start/Pause/Resume/Reset, session metadata, and `zen_fortress_cfg_v21` durability.
- `index.html` currently loads `timer_settings.js`, **not** `js/timer_idempotency.js`. The latter is a standalone guard and its tests do not establish live app completion behavior.
- **Do not blindly add a script tag or call `recordCompletion` beside `creditCompletedSession`.** That creates a second ledger and may double-count. A replacement/integration requires owner-reviewed exact-once design and restoration tests for the existing `completedTimerIds` and `sessionHistory` logic.
- Optional HTML-only UX improvement: give the settings dialog an explicit `data-i18n="btnCancel"` Cancel button which calls `closeModal('timerSettingsModal')`; verify 320px layout and retain the existing close X. Do not reinterpret field reset as a persistence action.

## Exact-head checks for LANE-03
```sh
node --test tests/i18n/timer/timer_safety.test.cjs
node --test tests/focus_workflows/test_focus_workflows.cjs
node --test tests/termux_fix04_custom_timer_consent.test.cjs
node tests/smoke_app.cjs
```
Test on Android after integration: start → pause → force-stop → reopen → resume → complete; reset with Cancel; change language mid-session; short/long breaks; completion before and after reboot. Verify Western digits, task/title preservation and single `sessionHistory` entry. Tests from the current lane are deterministic Node VM tests, not Android runtime evidence.

## P0 source patch required in LANE-03 (do not write these files from LANE-07)
Current integration source audit on 2026-10-25:
- `index.html`: `modeShortBtn` and `modeLongBtn` use `selectTimerMode(...)` directly; this bypasses the `selectTimerModeFromUser` active/paused-session confirmation.
- `index.html`: Reset and Skip call `resetTimerNow()` / `skipTimerPhase()` directly.
- `app.js`: `resetTimerNow` immediately clears `timerSessionId` and `timerActiveMs`; `skipTimerPhase` directly calls `selectTimerMode`. Both can discard progress without the user's approval. This is a current-source observation, not fixed by PR #225.

### Suggested owner patch (validate against newest HEAD first)
```diff
--- a/android/app/src/main/assets/web/index.html
+++ b/android/app/src/main/assets/web/index.html
@@
- onclick="selectTimerMode(cfg.shortMin, 'short', this)"
+ onclick="selectTimerModeFromUser(cfg.shortMin, 'short', this)"
- onclick="selectTimerMode(cfg.longMin, 'long', this)"
+ onclick="selectTimerModeFromUser(cfg.longMin, 'long', this)"
```

In `app.js`, gate `resetTimerNow()` before ANY state mutation, but only for an active/paused session:
```js
if (!quickTraining?.active && (timerRunning || timerSessionId || timerActiveMs > 0) &&
    !window.confirm(cfg.lang === 'ar'
      ? 'إعادة الضبط ستلغي تقدم الجلسة الحالية. هل تريد المتابعة؟'
      : 'Reset will discard the current session progress. Continue?')) return false;
```
In `skipTimerPhase()`, keep the existing quick-training path; otherwise delegate the mode change to `selectTimerModeFromUser(cfg.shortMin, 'short', ...)` and return its boolean result. Avoid a second confirm. Review behavior for pause/resume, session ID, title, and native alarm cancellation. Add real-app regression proving Cancel preserves byte-equivalent v21 timer snapshot and zero credits; Accept makes exactly one transition.
