# DEEP-FOCUS-RECOVERY-17 — source and scale audit

**Date:** 2026-10-19. **Repository:** `moaz76943-creator/zen-study-focus`.
**Pinned integration source:** PR #25, `0dd9239bc28978e11f41c1c0f618c9662b291fe2`.
**Scope:** tests/performance_recovery/ and docs/performance_recovery/ only. No shared app source, assets, build, workflow, or permission changes. Never merge without Android verification.

## Provenance and measurement honesty

- The following asset totals come from the **Git tree blob sizes** at the pinned commit, not from a device, gzip, network transfer, or APK runtime.
- **10 regression cases passed** by evaluating the exact GitHub-hosted JavaScript modules and test bodies in a JavaScript V8 connector isolate. This is **neither Node.js nor Android WebView**. No performance time or RAM measurement was claimed.
- Node test/benchmark files are supplied for repeatable execution; **no native Node run, APK instrumentation, offline device test, Android memory sample, battery, frame, GPU, or boot duration has been captured in this lane**. Record those separately using DEVICE_PROTOCOL.md.

## Asset census — uncompressed source blobs

| Class | Files | Bytes |
|---|---:|---:|
| JavaScript | 26 | 431118 |
| Standalone CSS | 4 | 57918 |
| Main HTML (also embeds CSS) | 1 | 83733 |
| Images | 13 | 567675 |
| Nature OGG and completion WAV | 17 | 16559244 |

Largest JS: `app.js` 88737 bytes, `notes_editor_ui.js` 42264 bytes, `locale_rows.js` 26499 bytes, `tasks_studio.js` 25198 bytes.
Largest audio: `sounds/rain.ogg` 3537078 bytes, `sounds/leaves.ogg` 3235295 bytes, `sounds/winrain.ogg` 2690534 bytes. `sounds/earth.ogg` and `sounds/noise.ogg` reference **the same Git blob SHA**, not two independently distinct recordings. This is an asset duplication/provenance observation, not a listening assessment.

## Offline startup and hot paths (static inspection only)

- `index.html` includes **25 local script tags** plus **4 local stylesheet links**, all checked against the pinned tree. There are **0 missing critical paths** in that static graph and **0 remote critical scripts/styles**. One external Google Fonts stylesheet is present; system font fallbacks exist. Network-absent font/layout behavior has **not** been tested on device.
- Scripts are regular, synchronous end-of-body script tags, not deferred/lazy-loaded. `integration_v22.js` invokes `install()` during loading, mounts notes/tasks/analytics/alerts and applies locale; actual critical-path duration is unknown.
- `notes_studio.js:renderNotesStack` matches/sorts and then creates a card for every matching note with `box.replaceChildren()` and `matches.forEach`. The path accepts inline `oninput="renderNotesStack()"` from `index.html`. `notes_editor_ui.js` may override this route, so assess both UI paths before any production fix.
- `tasks_studio.js:renderResults` calls `searchTasks` for each input and creates a `taskCard` for every matching item; input callback has no observable coalescing/debounce. Possible synchronous DOM cost and frame jank at scale; **not yet quantified on device**.
- `app.js` timer stores `timerTargetTime` and calculates remaining time from `Date.now()`; two start/restore paths use a 500-ms timer. This is better than counting callbacks but does **not** prove background/resume parity with the Android foreground service.
- `app.js` nature player and `nature_audio_recovery_v1.js` include explicit pause/src cleanup. In-memory two-channel fake-audio test passed; actual audio decoder, device audio policy, concurrent sound quality and native resource usage are untested.
- CSS has some `prefers-reduced-motion` rules, but the entire animation/transition inventory and GPU workload have not been measured.

## 20-item coverage matrix

| # | Request | Evidence | Status |
|---|---|---|---|
| 1 | JS/CSS size | Git tree census, reproducible local audit script | Static verified |
| 2 | Image/audio sizes | Git tree census | Static verified |
| 3 | Home load time | Android cold/warm startup protocol | Device pending |
| 4 | Expensive startup tasks | Script/integration inspect | Static finding |
| 5 | Note search speed | Node benchmark provided; no timing sample | Timing pending |
| 6 | 5000 notes | Real Notes Core result validated in isolate | Logic verified |
| 7 | 1000 tasks | Real Tasks Core result validated in isolate | Logic verified |
| 8 | 10000 analytics rows | Real Analytics Recovery report validated | Logic verified |
| 9 | DOM redraw | Unbounded list source identified; independent paging helper | Not integrated |
| 10 | Event listener duplication | Independent idempotent listener-scope test | App pending |
| 11 | Audio resource leakage | Fake-audio dispose/release test | Device pending |
| 12 | Two sounds at once | Verified fake audio parallel play + total volume <=1 | Logic verified |
| 13 | Device RAM | adb meminfo protocol | Device pending |
| 14 | Offline use | Local dependency graph scan | Device pending |
| 15 | Optional assets missing | No optional sounds in critical HTML script/style graph | Device pending |
| 16 | Long list rendering | Bounded paging helper/5000-row test | Not integrated |
| 17 | Search while typing | Latest-only scheduler coalescing test | Not integrated |
| 18 | Timer tab changes | Stored deadline and 500-ms ticker inspected | Device pending |
| 19 | Reduced motion/GPU | CSS presence checked; instrumentation protocol | Device pending |
| 20 | Benchmarks and comparison | Standalone tests + benchmark CLI + BEFORE_AFTER.md | Harness ready |

## Verified isolated cases

1. 5000 notes: 50 matching records; pages contain 30 and 20 without mutating source.
2. 1000 tasks: 100 matching records.
3. 10000 sessions: 10000 accepted, zero duplicates, exactly 250000 synthetic minutes.
4. Two fake audio channels: one object per clip, mixed volume sum <=1, both stop/release on dispose.
5. Windowing helper on 5000 records; last page length 20.
6. Latest-only scheduler emits final query only and cancels/disposes.
7. Listener-scope helper blocks double-registration and detaches on dispose.
8. Static graph: all referenced critical script/CSS assets exist.
9. Google Fonts reported explicitly as remote optional dependency.
10. Unreferenced optional sound files not required for critical HTML script/style graph.

**Do not treat the 250000-minute synthetic input or counts above as real user activity.**

## Follow-up integration recommendations (for lane 00 after Gemini completes)

1. Measure notes editor's **actual** primary `renderStack` alongside the `notes_studio` fallback; integrate paging/virtualization only after preserving selection, screen reader order, draft state and note IDs.
2. Add bounded task result rendering with progressive exposure, preserve keyboard focus and board/matrix/calendar navigation; test at 1000 tasks.
3. Coalesce UI search results with last-query semantics. Never debounce persistence, timers, or screen-reader announcements without design review.
4. Prefer listener scopes and audio cleanup on mount/unmount rather than hiding leaks. Verify allocations and detach on actual WebView.
5. Avoid changing web asset loading order blindly: globals are coupled; all 25 script dependencies must be checked first.
6. Test offline font fallback on device; ship bundled fonts only after licensing/weight assessment, not as a speculative fix.
7. Coordinate resource decisions with the independent media/provenance lane; do not activate unverified nature recordings.

**Release gate:** retain Draft; actual Android offline cold-start, jank, memory, timer/resume, scroll and audio evidence is required before any production activation.
