# Android on-device acceptance and reproduction matrix

Baseline PR #25 SHA 0dd9239bc28978e11f41c1c0f618c9662b291fe2.
ALL entries are NOT_TESTED on an Android device in this delivery.
Use a disposable device/profile and verified v21 backup before writing.

| ID | Steps | Required observable outcome |
|---|---|---|
| R14-01 | Tap Tasks, Calendar, Notes, Timer, Training, Nature, Analytics. | Matching active screen; no blank section or dead tap. |
| R14-02 | Create Note, Save, Edit, Save, restart. | Exactly one updated durable record. |
| R14-03 | Add Task, complete, undo/reopen, restart. | State preserved in Tasks and Calendar; no duplicate. |
| R14-04 | Advanced Tasks: add subtask/checklist, tick, restart. | Each child retained, parents unchanged. |
| R14-05 | Inject storage-write failure in a debug-only test profile. | Explicit failed-save UI, old record preserved. Never fill personal phone disk. |
| R14-06 | Copy notes and paste in disposable input; Analytics CSV export through Android picker. | Clipboard correct; actual exported file readable; Cancel not successful save. |
| R14-07 | Open language, timer settings and note editor; press Back/Cancel. | Modal dismissed with proper unsaved-change behavior. |
| R14-08 | Swipe Tasks and Notes, tap all visible controls. | No overlap, dead taps, or scroll lock. |
| R14-09 | Keep Notes open while changing English to Arabic and back. | Localized visible UI, text unchanged. |
| R14-10 | Start Focus, wait, pause, wait, resume/reset. | Correct wall-clock countdown and stable pause. |
| R14-11 | Set one-minute timer, background/lock, wait for completion. | One completion notification and one permitted alert, not duplicated. |
| R14-12 | Create disposable note/task, kill app process, relaunch. | Exact user-created records retained without data clear. |
| R14-13 | Rotate while editing note/task and while timer active. | No lost state, overflow, duplicate save. |
| R14-14 | Save long title and 800+ character body; reopen reader. | Untruncated text, usable scroll and layout. |
| R14-15 | Inspect timers, dates, chart axes and counts in RTL locales. | System-generated digits 0123456789; user text unmodified. |
| R14-16 | Enable TalkBack; traverse all controls and modal actions. | Accessible labels, sensible order, operable semantics. |
| R14-17 | Notes/tasks across tabs, CSV Cancel and restart. | No lost or duplicated records; no fake success. |
| R14-18 | Record Analytics KPI then tap the KPI card. | Zero fabricated focus sessions/minutes. |
| R14-19 | Nature tile, mute, stop all, background/foreground. | Actual audio follows UI; no synthetic fallback. |
| R14-20 | Deny notification permission; complete/resume timer. | No crash, duplicate alarm, or lost timer state. |

## Reproduction candidates: risks, NOT verified Android bugs

H14-01: Analytics cards in the reviewed source have an
onclick=addQuickSessionRecord() handler. Record the session count before
and after tapping. If it increases without completing a session, flag P0.
This is a source-level risk, not an on-device result.

H14-02: Create a note, use TalkBack to find Edit/Copy and attempt each.
If the visible glyph is inaccessible or unlabeled, capture redacted
accessibility details and mark FAIL on-device.

H14-03: Use ONLY a controlled debug-only storage failure injector to
test save failure. Verify clear error and unchanged prior value.
Without injection, mark NOT_TESTED.

H14-04: Start editing a disposable note, rotate, save and restart.
Compare exact note counts to detect duplicate/empty records.

## Evidence form

Scenario / Result: PASS | FAIL | NOT_TESTED
APK SHA256 / Git SHA / Android API / WebView version:
Model, screen size, locale, orientation:
Repro steps and expected vs observed state:
Redacted screenshot / package-only logcat:
Data integrity and v21 backup verification:
