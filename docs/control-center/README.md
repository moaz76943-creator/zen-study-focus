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
