---
name: deep-focus-localization
description: Guard all 20 Deep Focus locales and right-to-left behavior during feature changes without speculative translations.
---

Read root AGENTS.md for current project-wide preservation, security and cross-agent handoff rules before evaluating or modifying any code.

First identify and record the exact source SHA; review UI-language changes against that same source revision and the currently approved integration branch. Check the runtime key inventory, every supported locale, directional layout, long labels, mixed-script rendering, dynamic dialogs, charts and accessibility descriptions. Changes that add UI strings must have corresponding translation coverage, otherwise mark NOT_VERIFIED. Never silently substitute English or Arabic for unrelated locales. Do not auto-translate sensitive warnings without language-aware review.

Generated quantities and counters always use digits 0-9 in every locale, but never normalize user-authored notes, stored tasks, names or backups. Keep the selected language during navigation and restoration. Report concrete missing keys and failing screens with associated regression tests. Preserve all prior locale keys and do not edit app code without a scoped approved PR.
