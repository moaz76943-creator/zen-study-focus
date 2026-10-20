# Deep Focus — privacy-first engineering tool integrations

**Review-only proposal.** These files do not change the app, timer, user data, 20 locales, sound files, permissions, signing or release status. They are deliberately isolated from recovery PR #25, Android PR #50, and dashboard PR #34. A draft PR is not an activated GitHub Actions schedule.

## Unified operation

GitHub remains the **only authority for source, review, checks and SHA**. Termux, ChatGPT, Codex and Gemini use AGENTS.md and Issue #13, open draft PRs for changes, and accept only exact-SHA evidence. Floot/Figma can display or design against reviewed **non-secret** exports; they do not get broad write tokens or access to app user data.

* **Dependabot**: weekly GitHub Actions and /android Gradle dependency update **PRs** only; no automatic merge. The config is effective when merged to default branch. Apply human review and normal regression gates.
* **CodeQL**: GitHub-native JS/TS code scanning on main and PRs to main; sends findings to GitHub code scanning, not an additional SaaS. Android Java coverage is NOT implied.
* **Gitleaks**: pinned SHA256-checked CLI, redacted scan of the checked-out working tree, no uploaded findings. History is **not** scanned and files over 10 MiB are excluded, so this is not a clean bill of health for old secrets.
* **Playwright (Python)**: manual, read-only, local Chromium test of #timerDigitsTxt, #mainPlayBtn, quick-duration controls, study/sport state. Brand-new empty browser profile and localhost-only browser requests; no screenshots or personal data. Desktop Chromium is **NOT** Android E2E.
* **Maestro**: manual, debug-only Android emulator with an empty disposable app state. CLI 2.11.0 ZIP is SHA256-verified, analytics/update checks disabled, outbound IPv4 and IPv6 traffic blocked at process level before invoking CLI, and HTTP egress is explicitly probed. If firewall or emulator preparation fails, **FAIL/NOT_TESTED**, never PASS. This is a launch/control smoke only and does not replace broader Android QA.
* **PostHog**: **NOT CONNECTED to the Android app**. No SDK, API key, endpoint or event recording is introduced. Before any opt-in, obtain user approval and validate privacy policy, retention, pseudonymization, data residency, consent, and safe sample events. The WebView currently has a no-network CSP; do NOT weaken it for telemetry.
* **Figma / Floot / Linear / Notion**: optional existing workflows, not new privileged bridges. Share curated task/contract metadata only. Do not paste tokens into chat/issue/PR text or automation prompts.

## How to operate after review and merge to main

1. GitHub > Actions > **Deep Focus Privacy-First Browser and Android Lab** > Run workflow.
2. Choose a specific allowlisted source branch: main, fix/master-completion-20261020 or integration/deep-focus-consolidated-candidate-20261020. The branch may advance; the actual checked-out SHA is printed in job logs.
3. Enable Playwright (default true). Enable Maestro explicitly for a heavier emulator build and a minimal real-device **emulator** smoke.
4. Read job results. A PASS only covers what executed; external rights/licences, release signing, v21 physical backup, and 20-locale completeness remain separate blocks.
5. Security workflow separately runs on PR/main and weekly after merge. Add required branch checks in GitHub Settings when they have produced valid results, with careful review of the repo's protection rules. The GitHub connection used here cannot silently configure all admin security controls.

## No-leak rules

- Only public code and disposable test fixtures may reach third-party package registries/download hosts. No OAuth tokens or signing keystores passed to Playwright or Maestro.
- GitHub Actions jobs have explicit least-privilege permissions. No PR uses a privileged pull_request_target event; no production publication; no automated merging.
- Use repository/organization secrets only for unrelated approved release workflows, never for these tools. Periodically inspect installed ChatGPT plugin permissions and revoke unnecessary write access.
- GitHub's public repository and Actions logs are **not private**; never put personal notes, raw backups, support emails, tokens or unredacted crash payloads in them.
- Absolute non-disclosure cannot be guaranteed from public code or third-party binaries. The approach limits what they can receive and makes network-dependent tests fail closed.
- For Termux, run the deterministic checks without sending secrets: python tools/tool_integrations/test_privacy_contract.py; Gitleaks may be run locally with a manually reviewed pinned binary.

## Important limitations

No live browser/emulator test has been certified by creation of these files. A failed installation, blocked network, missing SDK, or UI mismatch must be reported FAIL or NOT_TESTED; never mark release approved. The browser and Maestro tests do not claim that all 161 recovery tasks passed. No changes to existing production code, old PRs, v21 data migration, media sources or app network CSP are part of this integration.
