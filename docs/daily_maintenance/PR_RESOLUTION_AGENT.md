# Deep Focus — Hourly Pull Request Resolution Agent

This is a separate, **low-cost** GitHub Actions coordinator for the existing recovery PR queue. It runs at minute 31 each hour on the repository default branch. Existing hourly source QA continues at minute 23; do not clone the test runners.

## What the agent really does

1. Reads open PRs and **current** PR #25 integration head, not a hardcoded obsolete SHA.
2. Checks up to ten exact Git ancestries per cycle. If a PR HEAD is an ancestor of #25 HEAD, it can close **up to two duplicate requests** with a provenance comment. The code is not removed or re-merged.
3. Classifies every other PR: draft, dependent branch, conflict, owner review, or verification candidate. Maintains one predictable queue Issue and a complete Action job summary.
4. For **same-owner, same-repository, non-draft, explicitly labeled** PRs targeting #25, runs strict file, SHA, head CI and mergeability checks. When every check passes it merges **at most one docs-only PR** per run to the integration branch, never to main.
5. A safe documentation candidate may receive the opt-in label **agent-safe-merge** from the owner. Do not use that label for runtime, migration, signing, audio, locale or release changes; the agent independently rejects non-docs modifications.

This is a deterministic, reviewable policy agent, **not an external AI model** and cannot claim to repair arbitrary Android bugs. More complex source bugs can be assigned through the existing daily/source QA agent manifests or a developer/Codex/Gemini PR. New fixes require failing reproduction tests, green exact-head tests and device evidence before manual integration. Audio files also need verified individual rights, source/converted hashes and human listening. The existing CSS maintenance automation is the only automatic app code repair path. Do not grant a model broad repo secrets for blind merges.

## Safety

- Does not install APKs on user phones, open Play releases, sign artifacts, grant permissions, change v21 keys, change saved user content or remove Git history.
- Preserves the 20 supported UI languages, generated 0–9 digits, app ID and ZEN21:: backup contract.
- Does not infer device E2E PASS from source tests, or accept undocumented media.
- Rejects stale target SHA, moved PR SHA, failed/pending CI, conflicts, drafts, forks, unreviewed PRs and large/destructive file lists.
- Auto-merge applies **only** to modified/added Markdown under docs/ (max 10 files, max 400 lines/file), excluding contracts, media license, security and release paths, with a recognized exact-head workflow PASS.
- No forced push, no auto rebase, no merge to main and no release approval.

## Verification and operation

From repository root, on Node.js 22:

    node --check tools/daily_maintenance/pr_resolution.cjs
    node --test tests/daily_maintenance/pr_resolution.test.cjs

The workflow has a read-only pull-request test job and a scheduled/manual operation job; workflow_dispatch mode audit performs no closing or merging. On a PR to main, the scheduled write job is never triggered. Hourly scheduling only becomes active **after the workflow lands on main**.

Operator review: open GitHub Actions > Deep Focus PR Resolution Agent and read the run summary; then inspect the single [PR Agent] Recovery merge queue issue. To propose a real fix, preserve unique changes on a dedicated branch, reproduce the failure in tests, and follow exact SHA CI before authorizing a merge.

**Release approved: NO.**
