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
