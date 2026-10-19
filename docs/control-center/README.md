# Deep Focus — Developer Control Center

An **Arabic-first, mobile-responsive, read-only engineering dashboard** for the existing Deep Focus repository. This is not a screen of the Android consumer application; it never touches the user's v21 storage. It lives separately from the app UI to avoid merge conflicts with ongoing Gemini work.

## Files

- docs/control-center/index.html: mobile dashboard and direct links
- docs/control-center/control-center.css: independent responsive visual design
- docs/control-center/control-center.js: live GitHub API reader, task filtering, JSON import/export and copyable repair briefs
- tools/control_center/audit.cjs: deterministic offline read-only code/data audit
- tests/control_center/*.test.cjs: analyzer, client parsing and regression tests
- .github/workflows/control_center_audit.yml: nightly/manual and PR-triggered source audit, issue triage

## How to use

**Open** docs/control-center/index.html through a local HTTP server or publish the repository's docs/ directory via GitHub Pages **after human review and merge**. The GitHub branch file viewer is not a hosted web page. GitHub Pages settings are not changed by this PR. The audit workflow schedule and manual dispatch are only available from the default branch once merged.

The dashboard uses public GitHub REST and raw URLs to read the head SHA from PR #25, then reads the official 161-task recovery ledger at that exact SHA. It also lists open pull requests and matching GitHub Actions runs. GitHub API access may be rate-limited, so errors and missing information must be displayed as partial/unavailable, not as success.

The action cards link to the actual GitHub workflow UI (no embedded credential or secret), and the repair button copies a scoped prompt that can be reviewed and given to Gemini. An imported health.json file is processed entirely within the browser; it is never uploaded.

## Audit locally (Node.js 22)

From the repo root:

    node --test tests/control_center/*.test.cjs
    node tools/control_center/audit.cjs --json report/health.json --markdown report/health.md
    node --check docs/control-center/control-center.js

The auditor checks source ledger consistency (161 unique IDs, accepted status values), missing nature-audio mentions in the media documentation, identical Ogg content hashes and outstanding BLOCKED tasks. These are **static evidence checks**, not device tests or full license/legal verification. Presence of a filename in a media ledger does not constitute a verified commercial-use license. Two files with identical SHA256 bytes are not automatically broken; human review is required.

## Automation guardrails

GitHub Actions runs lightweight tests, syntax checks and an offline scan, then uploads JSON + Markdown evidence (14-day retention). On a nightly or manual run, a **separate** job with narrowly scoped issues:write permission can create/update one predictable issue for critical findings. This job does not run for pull requests. It does not modify application code, user notes, task storage, Git history, release permissions, media licenses or signing configuration.

This dashboard does not automatically fix arbitrary bugs; it automates detection, evidence gathering, issue triage and preparation of actionable repair tasks. The existing Android CI and physical-device acceptance workflow remain separate.

**Release invariants:** preserve package name com.zenstudy.focus; v21 storage keys and ZEN21:: backup format; the 20 supported interface languages; user-authored text; UI numbers 0–9; licensed original media only; no forced push, auto-merge, fake focus events or signed release without owner approval. Do not mark Android physical tests as PASS without device evidence.

## Known limits

- A one-page static dashboard cannot directly start an authenticated GitHub workflow without authentication. Use linked GitHub Actions UI.
- GitHub Pages hosting has to be configured/verified by the repository owner if not already enabled.
- PR #25 remains a draft until reviewed and verified.
- Imported audit reports may describe older source SHAs; compare the imported inspected_ref with the current PR head before acting.


## V2: Screen Studio — edit supported properties on a phone

The Screen Studio maps the six actual runtime IDs: timer, tasks, calendar, notes, sounds and analytics. Each screen points to relevant app files and regression suites. From the mobile UI, the owner can edit:

- General primary/cyan/background colors, card radius and font scale.
- Per-screen accent color, card radius and spacing between supported cards.
- A responsive, approximate visual preview (not a WebView emulator).

The strict configuration lives in docs/control-center/design-config.json. Its generated offline CSS is packaged at android/app/src/main/assets/web/control_center_overrides.css. Exactly one stylesheet link was inserted in the Android index after existing styles. This **shared index edit requires conflict review with Gemini**.

Commands from the repository root:

    node tools/control_center/generate_style.cjs --check
    node tools/control_center/generate_style.cjs --write
    node --test tests/control_center/*.test.cjs

The browser exposes download JSON/CSS buttons. No arbitrary JavaScript, selectors, source files, storage settings, hidden screens or unbounded numerical changes are allowed. For app behavior changes, use an agent handoff and a code PR.

The "Open GitHub change request" control generates a prefilled GitHub Issue with the full validated config and latest default-branch SHA. This is a **request**, not immediate APK modification.

### Owner-only draft design PR automation

After the feature has been merged onto the repository's default branch, .github/workflows/control_center_design_requests.yml listens for new design issues created by the repository owner. It rejects stale SHA, invalid JSON, unsupported keys or ranges. It creates a new branch and a draft PR changing **only** the JSON and compiled CSS. It cannot merge, sign or release an app. It refuses if the source changed since the issue was composed.

Until the entire recovery work lands on the default branch, the issue event workflow and GitHub Pages site may be unavailable. PR #37 currently targets the integration branch. The preview and source files can be reviewed without publishing any user-facing app update.

## V2: Agent Studio and scoped QA automation

Select an agent specialization (UI, Audio, Localization, Analytics, Data or QA), one screen, and a precise goal. The generated issue contains source file scope, relevant test directories, SHA and acceptance/safety requirements. Copy the request to a connected Gemini/Codex or open the prefilled issue for review. **Issue creation alone does not invoke an AI model.**

The separate control_center_agents.yml workflow exposes only the allowlisted lanes ui, audio, locale, analytics, data, qa and all. Authorized users can manually run source test suites in GitHub Actions without arbitrary commands or write privileges. This is a set of **QA automation agents**, not autonomous LLM coding agents. Device QA and backups remain NOT_TESTED until completed.

Testing includes studio.test.cjs (schema validation, injection attempts, scoped handoffs) and studio_integration.test.cjs (verified selectors, app CSS link, deterministic generation and workflow security checks). CI checks the JSON-to-CSS parity before recording success.

Review every diff and run Android/device tests before merging changes into a production app; source test PASS is not an Android sign-off.


## Control Center v3 — 20 additional working tools

Version 3 extends the same PR #37; it does not create a second competing dashboard.

| ID | Tool | Action and limitation |
|---|---|---|
| F01 | Unified search | Search loaded recovery tasks, PRs, workflow runs and imported source findings. |
| F02 | Command shortcut | Ctrl+K (or Command+K) focuses search; Escape closes results. |
| F03 | Task quick views | Blocked, actionable, ledger-tested, or all. |
| F04 | Task sorting | By urgency/status, ID ascending/descending, or subsystem. |
| F05 | Tasks CSV | Download filtered tasks with spreadsheet-formula protection. |
| F06 | Area backlog | See blockers and totals per source subsystem. |
| F07 | Release checklist | Display five gates requiring real evidence; never auto-approve. |
| F08 | CI trend | Show verified source-run success percentage, excluding pending from denominator. |
| F09 | Failed-run links | Open only recorded failing GitHub Actions runs. |
| F10 | Stale PR detection | Indicate pull requests not updated for 14 days. |
| F11 | PR filter | Draft/ready filtering and text search. |
| F12 | Risk severity filter | Critical, warning, info, or all from imported QA. |
| F13 | SHA freshness | Warn when imported health.json is from a different commit than PR #25. |
| F14 | Snapshot comparison | Compare a prior exported project JSON against current recovery task IDs/status. |
| F15 | Theme presets | Apply one of four cosmetic palettes to the staged preview. |
| F16 | Undo | Undo staged design changes, retaining a bounded 40-step history. |
| F17 | Redo | Re-apply undone staged changes, with fork-safe history. |
| F18 | Screen-only reset | Reset only the selected screen's appearance, not the whole design. |
| F19 | Safe JSON import | Import allowlisted design-config.json; reject extraneous fields, oversized data and malformed values. |
| F20 | Change diff | View exact theme/screen property differences from the baseline before opening a review request. |

The source-of-truth machine-readable list is feature-manifest-v3.json. Implementation lives in v3-core.js (pure/testable logic) and v3-ui.js (accessible interaction); responsive layout in v3.css. V3 reads a **copy** of the existing public project state and modifies design settings **only in the local browser preview**. It never modifies Android user data, creates remote branches or merges PRs directly.

### Workbench usage from Android phone

1. Open the dashboard's HTTPS page after hosting is enabled, or serve docs/control-center/ over a trusted local HTTP server.
2. Use "مساحة إدارة المشروع" for cross-repo search and filtered CSV. Click the source task/PR/run link to open evidence.
3. Export a project state snapshot from the existing actions area, then re-import an older one for status comparisons. No upload happens.
4. Choose a theme palette and adjust one screen at a time. Undo or redo any staged change; inspect the exact configuration diff.
5. Export design-config.json and the generated CSS from the original screen editor or open the owner-reviewable GitHub issue. **Nothing changes in the installed APK** until a reviewed code change is built and installed.

### Check, test, and security assumptions

    node --test tests/control_center/*.test.cjs
    node --check docs/control-center/v3-core.js
    node --check docs/control-center/v3-ui.js
    node tools/control_center/generate_style.cjs --check

V3 tests cover all F01–F20 behavioral contracts, bound/invalid input cases, HTML contract and mobile CSS presence, plus simulated DOM interactions (NOT a physical browser/Android WebView). The existing GitHub Actions audit workflow runs these suites and publishes explicit PASS/FAIL and NOT_TESTED status. A successful source run is not proof of production device QA or user backup restoration.

**Limits:** Only listed cosmetic properties can be changed through the no-code design controls. Modifying behavior of an arbitrary Android screen still requires a scoped agent request/PR and code review; arbitrary code execution from the dashboard is prohibited. The control panel is not automatically available at a web URL until GitHub Pages has been set up and source changes have been reviewed and merged into the proper branch.

## Reliability and mobile-use hardening

This follow-up closes concrete gaps in v3 without merging PR #37 or modifying the runtime storage model.

### QA automation paths verified

- The previously broken UI agent wildcard tests/design_quality/*.cjs now points to real tests/white_premium_qa/*.test.cjs, alongside tests/interaction_recovery/*.test.cjs.
- Agent handoffs for Timer and Calendar now cite actual test suites instead of nonexistent folders.
- qa_lane_integrity.test.cjs checks every screen file, all referenced screen test directories and every test file/wildcard used in the QA workflow. This is CI-enforced to catch future dead links before invocation.

### Offline/rate-limit resilience

- If public GitHub API queries fail, the dashboard retains last-known verified results for the SAME source SHA and labels them stale/partial. A newer SHA never inherits old task counts.
- Empty recovery ledgers are not treated as a fresh zero-defect report.
- Exported reports explicitly carry source_stale alongside SHA and partial-source errors.
- The risk/snapshot panel now lets the user import a prior exported project JSON, view the imported tasks, PRs and CI in clearly labeled LOCAL (NOT LIVE) mode, then explicitly return to live GitHub data.
- Imported snapshots are schema-limited, reject invalid task statuses, foreign URLs, duplicate IDs and oversized text. Bundled audit reports from such files are NOT elevated to trusted release or QA evidence.

### Recover staged visual changes on the phone

- Save, Restore and Delete browser draft controls are explicit opt-in, not automatic. A browser may deny local storage; the page reports that error and JSON export remains available.
- Only the allowlisted appearance config, its baseline and a timestamp are kept under the separate developer-dashboard browser key: df_control_center_design_draft_v1.
- The restore path checks version, size, all settings and baseline identity. When default settings change, an older draft is rejected rather than overriding upstream changes.
- The saved draft contains no auth tokens, app notes, user tasks or Android v21 storage values.
- Deleting a local draft does not delete application content or the currently previewed design.

### Verification

Run node --test tests/control_center/*.test.cjs, node tools/control_center/generate_style.cjs --check and node --check docs/control-center/v3-ui.js. CI also runs the static repository audit, which does not replace on-device Android QA, media license checking or owner release approval.

PR #37 is still a stacked draft on recovery PR #25. GitHub Pages hosting and default-branch issue/dispatch automation remain unconfirmed until review/merge.

## Mobile portable preview: no GitHub Pages server needed

Every successful Control Center Quality Audit run now generates a second artifact named **deep-focus-control-center-mobile**. The artifact contains one `deep-focus-control-center-mobile.html` file, including all five dashboard JavaScript modules, both stylesheets, the validated appearance JSON and a static snapshot of the actual 161-item recovery ledger from the workflow checkout.

### Open the preview on an Android phone

1. In GitHub, open PR #37 > Checks > a successful **Deep Focus Control Center Quality Audit** run.
2. Open the Artifacts section and download **deep-focus-control-center-mobile**. Extract the ZIP on your phone.
3. Open `deep-focus-control-center-mobile.html` in Chrome or another browser that supports local HTML files. Android file apps/browser versions vary in their support for file URLs, downloads, and localStorage; no external web hosting is required for the built-in editor.
4. The first visible 161-task ledger is stamped **CHECKOUT_STATIC_SOURCE / stale**, not a live verification. If the browser can connect to the public GitHub API, refreshing replaces it with the current PR #25 source. If requests are denied, the static ledger remains labeled as such.
5. For design adjustments use Screen Studio; download the resulting JSON/CSS or create a review issue. These changes are local to the preview until a reviewed PR changes the source and an APK is rebuilt.

### Portable security and reproducibility

- Build: `node tools/control_center/build_portable.cjs --output dist/deep-focus-control-center-mobile.html`.
- Verify: `node tools/control_center/build_portable.cjs --check dist/deep-focus-control-center-mobile.html`.
- The bundle is assembled from allowlisted local CSS/JS only. All executable inline scripts and styles are pinned to individual SHA-256 Content Security Policy hashes: **no unsafe-inline, unsafe-eval, remote JS, personal access tokens, or write permissions**.
- A dedicated non-executable JSON block provides the checked-in visual baseline when `file://` prevents reading `./design-config.json`.
- Another non-executable JSON block contains only public task ledger data and strict offline source provenance. User notes, history, private credentials, media files, and Android storage are not included.
- The CI smoke check opens this exact file in a **real desktop headless Chrome browser** and confirms the task DOM and visual editor initialize; it reports `NOT_TESTED` when Chrome is unavailable, never a fabricated PASS. Desktop Chrome is not Android WebView, phone touch testing or a Play release sign-off.
- GitHub Actions artifacts are temporary (14-day retention). Build is reproducible from the source files; run it again to obtain a new portable artifact.

### Known limits

Live GitHub API and raw files still require an internet connection and may fail due to rate limits or browser file-origin restrictions. The static bundled ledger is a snapshot, not a substitute for a current audit. A linked GitHub Issue or Actions workflow still requires authorization in GitHub; the portable dashboard does not directly execute code patches, commit code, merge PRs or ship APKs.
