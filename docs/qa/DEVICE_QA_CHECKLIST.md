# Deep Focus — short Android device QA checklist

Status of every row: **NOT RUN** until a person executes it on a real device or emulator and records the result here.
Install the QA debug APK from the exact-SHA `df06_exact_source_packages` run (verify SHA256SUMS first). Package: `com.deepfocus.study`.
Never use "Clear data" or uninstall on a device that holds real study data; use a spare profile/device or export a ZEN21 backup first.

| # | Area | Steps (adb helpers in brackets) | Pass when | Result |
|---|---|---|---|---|
| T1 | Timer + notification | Start a 2 min focus timer, lock the screen, wait. [`adb shell dumpsys alarm \| grep -A3 com.deepfocus.study`] | One completion notification, one credited session, no duplicate after unlocking | NOT RUN |
| T2 | Doze | Start 5 min timer, screen off. [`adb shell dumpsys deviceidle force-idle`; later `adb shell dumpsys deviceidle unforce`] | Completion fires within the OS Doze window; notification posted once; credit once | NOT RUN |
| T3 | Notification permission denied | [`adb shell pm revoke com.deepfocus.study android.permission.POST_NOTIFICATIONS`] then run a 1 min timer | No crash; timer completes in-app; session credited once | NOT RUN |
| T4 | Restart/force-stop mid-timer | Start timer, [`adb shell am force-stop com.deepfocus.study`], reopen after the deadline | Timer state restored or completed exactly once; no double credit | NOT RUN |
| N1 | Notes after force-stop | Type a note, leave it as unsaved draft, force-stop, reopen | Draft is offered/restored; saved notes intact | NOT RUN |
| N2 | Notes limit | Not feasible by hand (10,000 cap is covered by Node test) | n/a | NOT APPLICABLE |
| K1 | Tasks persistence | Add 3 tasks, complete 1, force-stop, reopen, rotate device | Same 3 tasks, same done state, no duplicates | NOT RUN |
| A1 | Audio loop | Play a nature loop for 3+ min | Seamless loop, no silence gap, no crash | NOT RUN |
| A2 | Audio mixing | Play two sounds, change each volume separately | Volumes independent; both keep playing | NOT RUN |
| A3 | Audio focus | While a sound plays, start a call/other media app, then return. [`adb shell dumpsys audio \| grep -i focus`] | Sound pauses/ducks and resumes or stays stopped per design; no stuck playback | NOT RUN |
| A4 | Completion alert tones | Pick each of the 5 completion alerts and finish a short timer | Each tone plays once, clear, not clipped | NOT RUN |
| B1 | Backup export (SAF) | Settings → export; choose a folder in the system picker | File `ZEN21::` backup written; size > 0; app stays responsive | NOT RUN |
| B2 | Restore (SAF) | On a spare profile/device import that file | Tasks, notes, settings equal the source; unknown fields kept | NOT RUN |
| B3 | Interrupted write | Start export, revoke picker target / fill storage if possible | Clear error; existing data untouched | NOT RUN |
| R1 | RTL | Switch to Arabic; walk Timer, Tasks, Calendar, Notes, Sounds, Analytics | Mirrored layout, no clipped text, numbers are 0-9 | NOT RUN |
| R2 | Large text | Settings → Display → Font size largest + display size largest; open each screen | No overlapped/unreachable controls (Studios pill reachable) | NOT RUN |
| R3 | TalkBack | Enable TalkBack; traverse timer controls, a task row, a note, bottom nav | Every control announced with a meaningful label; focus order logical | NOT RUN |
| L1 | Language spot check | Switch to 5 languages incl. one low-resource (e.g. sn, sw); open Notes → speed reader, sample tasks/notes | Tutorial text, sample tasks/notes and buttons are translated; user-typed text untouched | NOT RUN |

Record: device model, Android version, APK SHA256, date, tester. Defects go to GitHub issues with the row id.
