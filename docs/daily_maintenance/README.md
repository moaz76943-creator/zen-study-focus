# Daily Deep Focus recovery automation

**Status:** Review-only proposal. The GitHub `schedule` event runs only after this workflow is on default `main`. Adding this file to a draft branch does **not** activate daily GitHub runs.

## What it does

- Daily at 02:17 UTC (approximately 05:17 Amman): checks out the actual recovery branch, records SHA, validates the 161-task ledger, prioritizes available P0 tasks, runs Node/Python smoke and selected regression lanes, audits translation gaps, and reports deliberate media licensing blockers.
- Generates only `android/app/src/main/assets/web/control_center_overrides.css` from already-reviewed `docs/control-center/design-config.json`. If stale and source SHA is unchanged, runs full regression tests and proposes a **draft** PR targeting the recovery branch.
- Upserts one GitHub issue, `[Daily QA] Deep Focus recovery status`. Does not create 1 issue per day.
- Friday at 01:47 UTC: builds a **test-only debug APK** with source SHA and checksum. No signing, auto-merge, main app source deployment, or Play release.
- Reports and binary artifacts expire after 3 days. Uses standard `ubuntu-latest` hosted runners.

## Flexible controls

GitHub → Actions → **Deep Focus Daily Recovery** → **Run workflow**.

Choose `target=recovery` (current integrated PR #25 branch) or `target=master-draft` (independent PR #44), `lane=all|ui|audio|locale|analytics|data|qa|performance`, and `mode=audit|safe-fix|deep-qa`.

- `audit`: no tracked edits.
- `safe-fix`: only deterministic validated generated CSS; if tests pass, creates a review branch and attempts a draft PR.
- `deep-qa`: full source tests plus a debug APK build, no code changes.

The workflow is extendable by adding reviewed, deterministic repairers with tests and expanding the **automatic change allowlist** under owner review. It is not an AI coding model; it cannot independently invent fixes for arbitrary Flutter/JS/Android bugs. The separately scheduled ChatGPT recovery task may help prepare reviewed patches.

## One-time activation and safety

1. Review [PR #45](https://github.com/moaz76943-creator/zen-study-focus/pull/45) and its passing source tests. This PR changes automation files and makes `build_apk.yml` **manual-only for publishing GitHub Releases**, so a main push no longer publishes a release automatically.
2. Merge this infrastructure-only PR to the default branch when approved. Do **not** merge PR #25 app code into main just to enable it.
3. Check the next scheduled Actions run. If `gh pr create` is blocked by GitHub's permission to let Actions create PRs, the workflow keeps its review branch and writes a triage issue. No unapproved auto-merge is attempted.
4. Review any repair PR, source tests and visual diff before merging it into the recovery branch.

## Limits

Android phone UI touch, WebView playback, commercial recording provenance and user backup restoration **remain unverified** until tested. A green Node/Gradle build is not a production approval.

Public standard GitHub-hosted runners have free execution, while storage and concurrency limits still apply. Avoid large runners or paid external model APIs in this workflow.

<!-- P0 stale-source audit identified 2026-10-20; workflow changes require review. -->
