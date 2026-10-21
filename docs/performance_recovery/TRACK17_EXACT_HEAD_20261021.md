# TRACK 17 — performance, memory and offline evidence (2026-10-21)

## Exact source / ownership
- Integration candidate: PR #138, `integration/master-recovery-20261021`.
- Fixed baseline SHA: `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5`.
- Isolated branch: `audit/track17-performance-offline-20261021`.
- Historical predecessor: PR #29 (still draft, based on an older recovery SHA). Its `tests/performance_recovery/` files already exist in this candidate. This track extends that lane; do **not** cherry-pick PR #29 blindly.
- No changes to the shared `app.js`, `notes_editor_ui.js`, `tasks_studio.js`, `analytics_studio.js`, Android runtime, v21 schema, minutes attribution or user data. PR #138 may continue integrating independently.
- The opt-in `optimizers.cjs` helpers remain **unwired** to the product: this PR does not claim UI improvements that were not deployed.

## Baseline facts
- Real Notes Core search is exercised against **5,000** synthetic notes; Tasks Core against **1,000** tasks; Analytics Recovery Core against **10,000** synthetic verified sessions. The core tests assert exactly 50/100 search hits and 10,000 accepted sessions, 250,000 minutes and zero duplicates respectively.
- Current Notes Studio editor UI pages its search results by 100 records. A separate legacy `renderNotesStack()` fallback still constructs every matching DOM card; before changing it, verify the active runtime's editor initialization and overlapping Notes Studio ownership. This is a *possible* large-list hot spot, not proof of observed Android jank.
- The old PR #29 audit lists optional Google Fonts as network-dependent; the installed startup dependencies and offline usability still need confirmation against **this exact SHA**.
- Existing source benchmarks cannot measure startup, compositor frames, Android CPU/PSS, native audio focus, background wakeups, or genuine leaks.
- PR #138's combined release-quality CI/Android evidence is not complete for this exact head. Historical green tests on earlier commits are **not** current candidate certification.

## Repeatable Node-only measurements
The new `track17_benchmark.cjs` uses the actual three committed production core modules, fixed synthetic fixtures, 3 warmups and 9 bounded timed trials (configurable to 3–30). It checks output *before* writing any result and prints wall median/p95/max, process CPU median/p95 and process heap/RSS observations. Synchronous calls over 50 ms are flagged as **Node task proxies**, not browser long tasks.

```sh
node --test tests/performance_recovery/*.test.cjs
node tests/performance_recovery/asset_audit.cjs
node tests/performance_recovery/track17_benchmark.cjs . 9
```

The scoped GitHub Actions workflow checks out the candidate and **fixed baseline SHA on the same Ubuntu runner** and invokes the *same benchmark script* for each tree. It archives exact SHAs and both JSON files. It intentionally **does not fail a PR on noisy timing deltas**; correctness checks fail closed. The comparison must be interpreted as a within-run diagnostic, not a product speedup.

| Measure | Baseline | Candidate | Release meaning |
| --- | --- | --- | --- |
| Notes 5000, Tasks 1000, Analytics 10000 synthetic core behavior | Existing source tests | Same plus repeatable instrumented benchmark | Node-only; output correctness must pass |
| Cold / warm Android activity launch | NOT_TESTED | NOT_TESTED | Run opt-in ADB capture on the same device/build; am start is not WebView-ready |
| Android CPU, memory PSS, leak after 50 foreground/background cycles | NOT_TESTED | NOT_TESTED | Attach per-cycle dumps and assess trend after GC / process restart |
| Chromium DOM render, frame long tasks, input latency | NOT_TESTED | NOT_TESTED | Use actual page + performance trace; never infer from Node |
| 5000-note DOM and 1000-task scroll and search | NOT_TESTED | NOT_TESTED | Populate disposable device via supported import; verify readback |
| 10000-session Analytics UI, CSV and minute parity | NOT_TESTED | NOT_TESTED | Use real Android WebView + genuine persistence/export readback |
| Offline UI across seven sections, offline restart | NOT_TESTED | NOT_TESTED | Disable connectivity on **disposable emulator**, confirm assets and actions |
| Audio background/screen-off, Bluetooth and other activities | KNOWN BLOCKER in PR #90 | NOT_TESTED on this branch | Do not downgrade AUDIO-BG-UNDERRUN-01 |
| Storage low/quota, process kill, resume and restore | NOT_TESTED | NOT_TESTED | Disposable synthetic dataset and v21 export/readback required |
| Older/newer Android WebView | NOT_TESTED | NOT_TESTED | Two identified API/WebView providers with device metadata |

**Before/after runtime behavior:** unchanged by this audit-only PR. Do not claim any production CPU, RAM, startup or DOM improvement until a measured bottleneck is reproduced, fixed in a separately reviewed patch and compared on the same runtime.

## Explicit Android probe
On a **dedicated test device/emulator**, with the app installed and one ADB device connected:

```sh
bash tests/performance_recovery/android_metrics_probe.sh evidence/android
```

It captures Android version, active WebView provider, storage capacity, three `am start -W` cold and warm pairs, `dumpsys meminfo` and process CPU snapshot. It calls `am force-stop` and HOME but **never** `pm clear`, deletes data, switches networking or touches v21 keys. Force-stop intentionally interrupts timers: check restoration and earned minutes manually. Do not run this on a live focus session. `TotalTime` is Android activity start timing, **not** full DOM ready/paint. Real cold/warm WebView timing requires a CDP mark/trace on that same session. When device/ADB not available report `NOT_TESTED`.

## Gate before production optimization
1. Keep first-order checks on the current integration HEAD; confirm the owner of any shared file and a clean conflict matrix.
2. Collect same-device repeatable timings, two state snapshots and baseline logs. Reproduce a true freeze/leak/slow query; fail the focused regression test (RED).
3. Fix only the measured issue, preserving 20 locales, Western generated digits, source behavior, all seven sections, v21 backups and exact 10,000-session minutes.
4. Re-run GREEN, full neighboring source regressions, Android across foreground/background/offline, restore and backup/readback. Attach comparable median/p95 with OS/WebView/build/fixture hashes.
5. Keep PR draft until independent reviewer accepts source and Android artifacts. Never merge this audit directly into `main`.
