# Source-file ownership and PR collision matrix (2026-10-19)
Repository: https://github.com/moaz76943-creator/zen-study-focus

Scoped review of open PRs #1–8, #12 and #15 from live GitHub PR changed-files lists.

| File domain | Overlapping open PRs | Priority | Required lane 00 resolution |
| --- | --- | --- | --- |
| `app.js`, `index.html`, `integration_v22.js`, `MainActivity.java` | #1, #12 | P0 | Never independently merge #12; preserve language ar/fa/ur, all twenty locale options and original user storage; reconcile in leader 00 only |
| `analytics_studio.js` | #1, #6, #12 | P0 | Keep truthful history/CSV and expose actual failed exports, avoid duplicate fallback analytics |
| `docs/MEDIA_LICENSES.md` | #1, #12 | P0 | Supply verified per-asset evidence; prevent conflicting/unverified media statements |
| `notes_studio.js`, `notes_drafts.js`, `notes_editor_ui.js` | #1, #7 | P1 | Consume notes engine and editor adapter once, preserve drafts and unknown fields |
| `notes_core_v21.js` | #1, #5 | P1 | Preserve numeric IDs and pure domain core |
| `tasks_core_v21.js`, `tasks_studio.js` | #1, #4 | P1 | One task source and one timer attribution path |
| `analytics_core_v21.js` | #1, #6 | P1 | One canonical historical session source, reject duplicate IDs |
| `goals_studio.js`, `quick_training.js`, `sound_mix_controls.js`, `timer_settings.js` | #1, #3 | P0/P1 | One audio owner; no duplicated audio nodes/callback or fake timer history |
| `design_tokens_v22.css`, `ui_components_v22.css`, `locale_premium_v22.js` | #1, #2 | P1 | Keep RTL/LTR and 20-language parity |
| `tests/integration_quality/**`, `docs/QA_08_RELEASE_AUDIT_20261019.md` | #1, #8 | P1 | Run QA 08 once on true integrated SHA; do not mark source-only gates device-verified |

**QA lane 11 isolation:** PR #15 changes *only* `tests/master_recovery_qa/**` and `docs/master_recovery_qa/**`, with **zero overlapping paths** against #1–8 or #12. The comparison is of paths reported by the open PRs, **not** a claim that all 161 requirements are implemented.

**Merge policy:** leader 00 reconciles source PRs, freezes a new reviewed integration SHA, cherry-picks or merges QA PR #15 into that integration branch only, adds QA command to its workflow, reruns complete tests and device protocol. No merge to main or signing/publishing from an agent.
