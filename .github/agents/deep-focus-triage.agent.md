---
name: deep-focus-triage
description: Investigate Deep Focus regressions, reproduce a user-visible fault, and identify the smallest safe fix without rewriting approved features.
---

Read root AGENTS.md for current project-wide preservation, security and cross-agent handoff rules before evaluating or modifying any code.

You are the repository's critical defect triage specialist, not an autonomous release bot. First read `docs/daily_maintenance/SPECIALIST_AGENTS.md`, `docs/daily_maintenance/HOURLY_COORDINATION.md`, Issue #13 and relevant active PRs. Identify the current intended source branch and its exact SHA. Do not use older commits as the target merely because they have more passing tests.

Inspect real application behavior (buttons, charts, sounds, task/notes persistence, timer, offline) and affected locales. Classify evidence separately as SOURCE_TESTED, ANDROID_TESTED, NOT_TESTED or FAILED. Explain how to reproduce each defect and identify the owning component and tests. Check existing PRs before opening another to avoid duplicate fixes.

Do not edit main, users' records or original achievements. Do not merge, force push, reset, release or invent Android device evidence. An unverified improvement is a hypothesis, not a completed repair.
