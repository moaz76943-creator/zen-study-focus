# Baseline vs proposed candidate — no fabricated speedup

## What changed

**Before (PR #25 SHA `0dd9239bc28978e11f41c1c0f618c9662b291fe2`):**
The production asset tree has 431118 JS bytes, 57918 standalone CSS bytes, 567675 image bytes and 16559244 audio bytes. Large list redraws and every-keystroke task search are present in the inspected UI source. Android timings and memory are unknown.

**After (Recovery-17 branch):**
Production code, Android assets, embedded HTML/CSS and entrypoint are intentionally unchanged. The same static numbers therefore apply: JS 431118, CSS 57918, images 567675, audio 16559244 bytes. No improvement to APK startup, on-device search responsiveness, memory or battery can truthfully be attributed to this PR yet.

New candidate-only code in `tests/performance_recovery/optimizers.cjs`:
- `windowRange`: bounded page of records; no source mutation; not yet wired into production rendering.
- `createLatestScheduler`: coalesces queued changes and drops scheduled work after dispose; no timers modified in app.
- `createListenerScope`: prevents repeated same-handler registration and releases registered listeners on disposal.

| Metric | Before | After in shared app | Candidate / status |
|---|---|---|---|
| Production JS bytes | 431118 | 431118 | Unchanged |
| Production CSS bytes | 57918 | 57918 | Unchanged |
| Image bytes | 567675 | 567675 | Unchanged |
| Audio bytes | 16559244 | 16559244 | Unchanged |
| Notes Core at 5000 records | Functional result verified | Same implementation | 50 matches; bounded core search |
| Tasks Core at 1000 records | Functional result verified | Same implementation | 100 matches; unbounded UI still exists |
| Analytics Core at 10000 records | Functional result verified | Same implementation | 10000 accepted and 250000 synthetic minutes |
| Startup duration | NOT MEASURED | NOT MEASURED | Android required |
| Search latency p50/p95 | NOT MEASURED | NOT MEASURED | Run `benchmarks.cjs`, record Node only |
| DOM frame time/jank | NOT MEASURED | NOT MEASURED | Android required |
| WebView RSS / peak heap | NOT MEASURED | NOT MEASURED | Android required |
| GPU / battery | NOT MEASURED | NOT MEASURED | Android required |

## Reproduce on a checkout of this branch

```sh
node --test tests/performance_recovery/*.test.cjs
node tests/performance_recovery/asset_audit.cjs
node tests/performance_recovery/benchmarks.cjs 7 > recovery17-node-baseline.json
```

These commands require Node.js and the complete checkout, including source modules and media. Baseline and candidate comparisons must be run under **the same runtime, device, app state, dataset and build**. The benchmark intentionally uses actual v21 domain functions, but excludes WebView DOM, paint, disk, Android media and startup. A Node result can never be labeled Android. No arbitrary performance target/threshold is enforced.

### Merge prerequisites

1. Device tests and measured before/after samples using DEVICE_PROTOCOL.md.
2. Architecture review and opt-in integration by lane 00 after Gemini's shared files are stable.
3. Existing regression suites must pass before releasing any production optimization.

Current status: **test harness and opt-in utilities only; no measured production speedup**.
