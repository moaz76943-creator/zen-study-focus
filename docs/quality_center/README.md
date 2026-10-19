# Deep Focus Quality Center — read-only integration (review draft)

This is the **quality-data generator** for a portable dashboard, not an automatic code fixer or a Play-release approval. It coordinates checks already in the project and exposes their evidence without altering the app, v21 user data, existing PRs, Gemini branches, repository permissions, Android manifest, or signing. It needs only Node.js; no subscriptions, external accounts, keys, remote scripts, or background agents.

## Run locally on a complete checkout

```sh
node --test tests/quality_center/run.test.cjs
node tools/quality_center/run.cjs --out /tmp/deep-focus-quality
# Optional comprehensive Node test discovery (longer):
node tools/quality_center/run.cjs --full --out /tmp/deep-focus-quality
```

Open `/tmp/deep-focus-quality/index.html` with a browser, or inspect `report.json`. **These commands are not an Android test, APK build, or CI run.** The full mode includes all `.test.cjs` tests except the intentionally failing media provenance gate, which is always executed separately and never hidden.

## Integration map

| Tool / plugin | Role | Access model |
|---|---|---|
| GitHub (connected) | Source of truth for PRs, diffs and exact SHAs | Human-reviewed PR; no automatic merges |
| Codex Tasks, Superpowers, Context7 | Scope tests and code fixes, validate library documentation | Must use isolated branches; no concurrent edits to shared files |
| Notion and Linear (connected) | Decisions, issues and task assignments | Manual synchronization; dashboard does not copy private account data |
| Firecrawl and TinyFish (connected) | Research original audio, individual rights and source references | Research findings are **not** licence approval |
| Android E2E PR #30 | Real touches, offline behavior, user state on disposable test profile | **NOT_TESTED** until a device/emulator runs the suite |
| Firebase/Crashlytics (optional, not connected) | Consent-aware crash reporting in future test builds | Requires owner setup, privacy review; not bundled here |

## Hard release gates

- Do not merge PR #25 or this draft based on source tests alone; master issue #13 requires physical device and human review.
- `tests/master_recovery_qa/media_provenance_gate.test.cjs` is **intentionally RED** until every distributed Ogg has genuine individual provenance; its failing result is reported, not suppressed.
- Ogg signatures **do not prove playable audio or commercial licensing**. Each track still needs source SHA, rights, codec decode on Android, normal-volume listening and loop analysis.
- Shape-valid locale dictionaries **do not prove 20-language coverage**. PR #32 contains an independent untranslated-string audit; native-speaker and rendered-screen checks remain necessary.
- Existing v21 backup contract and storage keys are never touched. Device backup/restore must be verified before real-data interaction QA.
- No GitHub Actions workflow was added, triggered or modified. Do not turn on automatic builds until the project's integration owner confirms cost and exact-SHA review gates.

## Ownership and follow-up

- Follow the integration source PR #25 (`integration/deep-focus-recovery-00-final-20261019` at the inspected SHA `0dd9239bc28978e11f41c1c0f618c9662b291fe2`), but always revalidate its current HEAD before any integration.
- PR #26 covers original audio research; PR #27 security/data QA; PR #29 performance; PR #30 Android E2E; PR #31 UX prototype; PR #32 language audit. This dashboard does not duplicate those lanes.
- Integrate future findings as links and evidence into the official issue #13 ledger; don't mark a check TESTED unless a reproducible command, exact SHA and relevant platform evidence exist.
