# Performance Recovery 17 — tests and opt-in tools

No shared app files are modified. Pure Node built-in test runner and repeatable synthetic fixtures.

```sh
node --test tests/performance_recovery/*.test.cjs
node tests/performance_recovery/asset_audit.cjs
node tests/performance_recovery/benchmarks.cjs 7
```

- `optimizers.cjs`: independent windowing, last-request search work scheduler, event-listener lifecycle. Not wired to production.
- `optimizers.test.cjs`: lifecycle, bounded results, latest-query correctness.
- `scalability.test.cjs`: **real source modules**, 5000 notes, 1000 tasks, 10000 analytics events, mocked two-channel audio.
- `offline_assets.test.cjs`: static HTML startup dependency check only, not an offline WebView boot.
- `asset_audit.cjs`: scan critical local paths and report uncompressed on-disk resource sizes.
- `benchmarks.cjs`: timing of synchronous Node.js domain core functions, checks output correctness before recording; prints Node runtime/environment and memory *observations*. No Android equivalence.
- `docs/performance_recovery/`: source findings, before/after honesty, real Android protocol.

Neither synthetic fixture volumes nor Node/isolated-JS runtimes establish real-device speed. No unapproved nature clips are enabled by this lane.
