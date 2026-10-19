# DEEP-FOCUS-RECOVERY-11 — Android device acceptance protocol

Reference issue: #13; integrated source SHA: `28b19a1b4c0e51096303e3c8c30384ab40623457` (2026-10-19).
These instructions are **not evidence of execution**. Do not convert a NOT_TESTED to PASS without device identity, Android & WebView versions, actual observed results and unedited logs/screenshots.

## E2E-01 (DF-155): Notes → Tasks → Focus → Analytics
1. On a disposable v21 dataset, create a note with one unchecked item, e.g. "Read chapter".
2. Confirm extraction once creates one numeric-ID task and a second extraction creates zero new tasks.
3. Link task to a 1-minute test focus interval; run the interval completely without skip/reset.
4. Complete the task; reopen Analytics for today's local date and the correct activity domain.
5. Expect exactly **1 completed session and 1 minute**; navigate away and back; force-stop/restart and recheck; no duplicated minutes. Export CSV through SAF and verify bytes only after user confirms saved URI.
6. Record screen, timestamps, app build SHA, test task ID, session ID and actual Analytics totals. Never mark as PASS from pure-module tests alone.

## AUDIO-01 (DF-150/152): Rain + Ocean + Alert
1. Airplane mode. Mix genuine packaged rain and ocean recordings simultaneously.
2. Set rain 65% and ocean 35%; reduce rain to 20%; stop rain only. Ocean must continue.
3. Complete the test timer exactly once; chosen gentle completion alert must play once.
4. Stop/dispose ocean, press Stop All, background/foreground, lock/unlock and reconnect headset. Confirm no retained playing instance/audio focus resource, no crackles, repeats, harsh peaks or streams.
5. Capture local media filenames, checksum, upstream license proof, listening notes and codec inspection; silence/error when a missing clip is selected.

## LOCALE-01 (DF-151/152): 20 Languages + 0–9
1. Test **ar, fa, ur, en, de** plus all remaining registered language options, including notes/tasks/analytics/modals/errors.
2. Switch each in-place and ensure localized labels, TalkBack names, correct RTL/LTR and no alteration of user-authored text.
3. For each language verify timer 00:05, 10, 25, 100, 1234, -2, 0.75 and 2026-10-19: every **generated** digit must be ASCII 0–9, including charts SVG and exported CSV. User text is exempt.
4. Background/force-stop/restart app, confirm language, note and task survive without resetting preferences; use both narrow screens and large font scaling.
5. Capture DOM + SVG text snapshots and screenshots. Source dictionaries alone are not device or DOM evidence.

## DATA-01 (DF-153/154): Integrity and interruption
1. Export actual app-produced `ZEN21::` backup and restore on a disposable installation; verify full record IDs and unknown fields.
2. Create a full-storage/failed-write case; confirm error instead of false toast, no lost records, mirror rollback, pending-journal recovery upon explicit approval only.
3. Airplane mode, Android back, keyboard, rotation, activity recreation, kill/restart, notification rejection, background timers and TalkBack.
4. Never run destructive tests on the user's only live copy. Note localStorage draft/active timer are **outside** the v21 export scope.

## Evidence schema
`{case_id, source_sha, build_sha, device_model, android_version, webview_version, date, operator, status, expected, actual, media_hashes, logs_or_screenshots, defects}`.
Allowed status values: PASS / FAIL / BLOCKED / NOT_TESTED.
