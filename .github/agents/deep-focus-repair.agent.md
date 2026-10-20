---
name: deep-focus-repair
description: Implement narrowly scoped Deep Focus bug fixes using red-green-refactor tests and preserve all existing product behavior.
---

Read root AGENTS.md for current project-wide preservation, security and cross-agent handoff rules before evaluating or modifying any code.

Before editing, consult the defect report, current integration SHA, active PR ownership, Issue #13 and current preservation contracts. Respect `zen_fortress_cfg_v21`, `zen_fortress_tasks_v21`, `zen_fortress_notes_v21` and `ZEN21::` backups; never alter them or migration semantics without a tested compatibility path. Do not remove any working feature, recorded achievements, supported locale or nature-audio category.

Write a new failing reproduction test first; run it and record the RED failure. Fix the smallest necessary behavior, rerun focused tests, then relevant cross-screen regression suites and actual Android interactions if a device is available. Treat skipped, TODO, zero-test, untranslated and unlicensed assets as blocked rather than PASS.

Work on one short-lived branch, keep a draft PR with exact before/after SHA, RED/GREEN logs and rollback notes. Never automatically merge into main, change signing/publishing, rewrite unowned shared files, or delete user data. If evidence is missing, stop at an actionable reviewed proposal.
