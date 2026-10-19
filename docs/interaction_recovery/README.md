# DF-070–084 — Interaction recovery handoff (independent lane 06)

Baseline: `632ef51ae6034224e6b459e0962a8bbedbf2b18e`, branch `fix/v21-safe-release-recovery-20261018`. Snapshot examined 2026-10-19. This lane makes **no direct edits** to app.js, index.html, Android/native code, shared screen files, data compatibility contracts or other lanes. PR #12 independently modifies analytics and app.js; coordinate in lane 00. Do not merge either blindly.

## Reproducible inventory / confirmed defects

Run `node tests/interaction_recovery/audit.cjs > interaction-audit.json` (report generated locally only), then `node --test tests/interaction_recovery/*.test.cjs` and `node --check android/app/src/main/assets/web/interaction_recovery_06.js`. Scanner enumerates `onclick` and other inline events, known script-order constraints, missing JS files and duplicate top-level function declarations. It **does not** claim a click worked because a handler exists.

Source inspection at the baseline found **114 inline HTML events** and **19 ordered scripts**. The analytics KPI cards for active minutes and completed sessions both use `onclick="addQuickSessionRecord()"`, which only displays a generic explanatory toast (`app.js` near line 1794). An informative statistic should not look tappable unless a genuine drilldown exists. PR #12 modifies this area; lane 00 must choose the correct implementation, then enable the standalone `disableDeadAnalyticsCards(document)` only when still needed.

Five global function name collisions occur between `app.js` and `notes_studio.js`: `filterNotesByTag`, `renderNotesStack`, `openNoteModal`, `fillNoteTpl`, `saveNewNote`. Because notes_studio.js loads after app.js, later declarations replace earlier global behavior. Lane 00 must preserve the intended owner and add no duplicate competing global definitions.

More confirmed risk: legacy `exportAllNotes()` calls `navigator.clipboard.writeText(...)` without awaiting/rejecting its Promise, and immediately displays a success-like message. `shareAppWithFriends()` also displays success immediately after invoking clipboard without checking for rejection. `createNewTask()`, `saveNewNote()` and `saveQuickDump()` mutate in-memory arrays and show success despite `saveFortressData` being allowed to fail silently. `handleAndroidBack` removes `.open` from every modal without a dirty-editor check. These require integration-owned corrections and durable persistence acknowledgement, not monkey patches that could lose user data.

## Independent, opt-in module

`interaction_recovery_06.js` exports `DFInteractionRecovery06` in WebView or `module.exports` in Node. It performs **no work on import**. `createGate` rejects rapid duplicate concurrent actions by key and reports success only on an explicit `true` / `{ok:true}` acknowledgement (or verified outcome callback). `createClipboardAction` awaits clipboard completion and returns failure on denied/unavailable clipboard. `createNativeExportTracker` differentiates a native picker opening (`pending`) from a later matching `success`/`failed`/`cancelled` callback; it cannot independently verify Android SAF storage writes. `createModalClose` protects dirty drafts via an injected permission/close callback. `disableDeadAnalyticsCards` removes only the known fake click affordance while keeping statistics readable. `observeAnonymousErrors` captures anonymous exception categories/counts only, never user-entered content, stack, URLs or exception strings.

### Integration contract (lane 00 only)

1. Review PR #12 first. Include the module **after** baseline preflight, without altering protected v21 storage keys or `ZEN21::` backup semantics. Do not overwrite current global handlers just to activate helpers.
2. Wire clipboard and Share to an awaited `createClipboardAction`, with a localized visible failure route. Preserve all user-authored note bodies and digits. Defer success until the platform Promise resolves. If the native sharing intent has no completion receipt, say the chooser opened, **not** "shared successfully".
3. Wire Android `ACTION_CREATE_DOCUMENT` to `createNativeExportTracker.begin()`, retain request correlation IDs and call `.complete(id,status)` only on a definite result. Existing `ZenNative.exportBackupToFile` supplies no correlating receipt to this independent module, so the bridge contract must be added by Android/integration owners and tested on-device.
4. Wrap note/task/dump save handlers in `createGate`, using the same stable action key until a verified primary/mirror commit succeeds. Do not treat `saveFortressData`'s undefined return as durable success. If persistence fails, keep the unsaved editor data and do not toast ✓.
5. Replace unconditional modal and Android-back handling with `createModalClose` after implementing actual per-editor dirty state, explicit discard confirmation and focus restoration. Cover hardware Back, Escape, keyboard, TalkBack and orientation on a physical Android WebView.
6. Optionally attach `observeAnonymousErrors` for redacted QA diagnostics. It is opt-in; do not persist raw exception messages, content or private data.
7. Only after integration run at least **100 distinct critical targets as dispatched touch/keyboard actions** with assertions on state, durable data, native receipts and user-visible outcomes. The static 114-event inventory is **NOT** these 100 runtime tests. Include Notes/Tasks/Analytics, import/export, cancellation, delete/restore and failure injection. Do not mark DF-084 complete before this gate.

## Task ownership / status

| IDs | Evidence / next gate | Status |
| --- | --- | --- |
| DF-070–072 | HTML event census; five global collisions; script-order audit; semantic target classification remains to integrate | PARTIAL |
| DF-073 | Two dead KPI click handlers identified; opt-in inert-card helper tested; PR #12 overlap | PARTIAL |
| DF-074–076 | Confirmed false clipboard successes and unacknowledged task/note writes; async gate + clipboard helper tested; original screen handlers not edited | PARTIAL |
| DF-077–078 | Dirty-modal safe close and duplicate action gate unit tested; Android Back not rewired | PARTIAL |
| DF-079 | Redacted anonymous exception observer unit tested; runtime capture not installed | PARTIAL |
| DF-080–082 | Hardware back, accessibility, pointer/touch, clipboard denial and native SAF need physical Android validation | BLOCKED_DEVICE |
| DF-083 | English/Arabic fallback messages in independent helper; 20-language per-key translations belong to lane 04 | PARTIAL |
| DF-084 | Static inventory 114 events; no honest claim of 100 event-driven Android interaction checks yet | BLOCKED_INTEGRATION |

## Release blockers

Needs lane 00 to integrate this module, resolve PR #12 overlap, wire true native export receipts and durable note/task commits, then conduct real Android/WebView QA on touch/keyboard/back/accessibility and 100 critical targets. Local isolated Node checks do not prove on-device behavior. Human approval required before merge. No app data was modified or deleted by this lane.
