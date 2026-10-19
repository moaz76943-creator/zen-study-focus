# Recovery-17 Android offline and performance verification protocol

**Status:** instructions only — device run NOT PERFORMED by this lane.

## Safety and repeatability

Run against a disposable test profile, emulator, or dedicated QA handset, **not** a user's production notes/tasks. Create synthetic fixture data only through approved import/test hooks; never wipe or overwrite personal v21 data to prepare a benchmark. Record model, RAM, Android version, WebView version, thermal state, battery saver, app build SHA, locale, motion preference, connection state, fixture generator commit, observation time and result file. Keep personal data, logs, tokens and note bodies out of shared reports.

For each comparison, same hardware/app build/debuggability/fixture counts. Run cold-start and warm-start separately, capture median/p95 from real device samples (no inferred values). If debug WebView is disabled in release, do **not** enable it in production to force a profile; use a separate approved debug build.

## Capture commands (ADB when available)

```sh
adb shell am force-stop com.zenstudy.focus
adb shell am start -W -n com.zenstudy.focus/.MainActivity
adb shell dumpsys meminfo com.zenstudy.focus
adb shell dumpsys gfxinfo com.zenstudy.focus framestats
adb shell dumpsys cpuinfo
```

`am start -W` is Activity launch timing, not a guarantee of JS UI hydration or first usable paint. Add a native/JS ready marker in a separate instrumentation build if needed. `dumpsys meminfo` reports a momentary device process snapshot, not browser JS allocation lifetime. `gfxinfo` frame stats need a documented scroll interval and repeated samples. Identify startup, notes scroll, tasks search and analytics scroll separately. For GPU/energy prefer approved Perfetto/System Tracing and Android Studio profiler on actual devices.

## Scenario execution checklist

- Cold offline boot: disable Wi-Fi and cellular data from system UI, force-stop, launch, and verify basic timer, notes, tasks and analytics remain usable without font/network requests.
- Optional missing media: on a **test build only**, omit an unreferenced optional audio file, boot offline, and confirm the main UI remains usable with a noncrashing unavailable-media state. Never remove real user's installed resources.
- 5000 notes: search common and rare terms, type and erase quickly, scroll beginning/middle/end, edit one note, save, reopen; log frame jank, input response and record correctness.
- 1000 tasks: input search at full speed, switch today/upcoming/board/matrix/calendar, complete/reopen, confirm no lost focus or duplicate listeners.
- 10000 focus-session history entries: switch weekly/monthly analyses and export; validate counts and CSV independently.
- Two sounds: start one, then second, change volume, stop one then all, enter/exit screen, relaunch and verify sound does not leak; check decoder errors.
- Timer: start, change app tabs, background/foreground, rotate if enabled, lock screen, change connectivity, pause/resume, and verify no double completion or time drift beyond independently measured wall-clock agreement.
- Reduced motion: enable Android Remove animations / relevant accessibility reduce-motion setting, repeat heavy transitions and measure frames rather than assuming CSS alone guarantees lower GPU usage.
- Resource listeners: navigate between screens repeatedly, verify that event handlers fire once per user action and WebView memory returns toward a stable plateau after GC (not proof of zero leaks).

## Sample evidence record

```json
{
  "app_sha": null,
  "android_version": null,
  "device_model": null,
  "webview_version": null,
  "network": "offline",
  "fixture": {"notes": 5000, "tasks": 1000, "sessions": 10000},
  "scenario": "notes-search-typing",
  "samples_ms": [],
  "median_ms": null,
  "p95_ms": null,
  "rss_kb": null,
  "frame_stats_file": null,
  "observed_errors": [],
  "result": "NOT_TESTED"
}
```

Do not enter measured values until captured on a physical device/emulator. A failed test must preserve its evidence, not be replaced by a guessed number. These tests gate any future release commit.
