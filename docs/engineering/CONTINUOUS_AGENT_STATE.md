# DEEP FOCUS — Continuous agent state

Durable checkpoint for scheduled development runs. Update it with every merged step. No secrets or personal data here.

## Fixed rules
- Repo: `moaz76943-creator/zen-study-focus`. Official branch: `integration/master-qa-verified-v21` (not `main`).
- Package `com.deepfocus.study`. Keep White Premium design, Arabic/RTL, Western digits 0-9, protected storage keys, old-backup compatibility.
- Forbidden: Hebrew, Meditation section, unrequested AI features, Cloud TTS, mandatory accounts, a second timer, destructive data ops, force push, branch resets.

## Active track: 100-language UI catalog (priority 4 of the user's list)
Workflow (see `docs/i18n/README.md`): write `index|translation` TSV against `i18n/source_en.json` key order →
`node tools/i18n/tsv_to_pack.cjs <code> file.tsv` → `node tools/i18n/build_packs.cjs && node tools/i18n/coverage.cjs` →
`node --test tests/i18n_catalog.test.cjs`. All packs are labelled `ai-pending-review` (not checked by a person).

Done (631/631 strings): ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl th sv el cs ro hu da fi no sk uk bg hr sr bs sl lt lv et sw fil ms ta te mr gu kn ml pa am az uz kk ka hy ne si my km lo mn af (61 + en).
- `bs` is labelled `machine-unverified` (left as is).

Remaining, in registry order: sq eu ca gl is ga mk mt cy be ky tg tk ps ku so ha yo ig zu xh sn st tn rw mg ny eo la gd co fy haw hmn sm su jv om.

## Known pre-existing test failures (fail on the base branch too, not caused by pack work)
- `tests/df_lane03_core_shell_locale.test.cjs`: only test 4 still fails (harness repaired in branch `ccr-618eb454-s60jxw`). Test 4 expects a reviewed DF99 shell pack to beat the legacy DICT; `dfGetLocalizedText` checks DICT first. Changing that order changes visible text in many languages, so it waits for a product decision.
- `tests/global_i18n_engine.test.js`
- Fixed 2026-11-14 (branch `ccr-618eb454-6miujj`): `tests/i18n/core_authored_digit_integrity.test.cjs` (`saveNewNote` moved to `notes_studio.js`; test now runs the real v21 controller + Notes Core and the legacy fallback) and `tests/termux_fix03_truthful_streak.test.cjs` (badge is built with DOM nodes, not innerHTML; fake DOM updated). Both mutation-checked. 15 files remain in `tests/KNOWN_FAILING.txt`.

## Checkpoint log
| Date (UTC) | Base HEAD | Work | PR | Result |
|---|---|---|---|---|
| 2026-11-14 | a06e5af | packs sw, fil + this state file | #603 | merged db11002 (CI: Gitleaks, CodeQL, lane11 regression fail on base too — repo-wide, not required) |
| 2026-11-14 | db11002 | pack ms | #604 | merged 2971971 |
| 2026-11-14 | 2971971 | packs ta te mr gu (4 parallel translation subagents) | #605 | merged b9fdcae |
| 2026-11-14 | b9fdcae | packs kn ml pa am (catalog test 5/5; lane03 4 fail + lane11 3 fail identical on base) | #606 | merged 22c5cbd |
| 2026-11-14 | 22c5cbd | packs az uz kk ka | #607 | merged 4915c28 after owner said finish the blocked work: `wind_breeze.ogg` re-encoded 256→112 kbps (3,467,115→1,590,090 B), budget not raised |
| 2026-11-14 | 22c5cbd | locale guard synced to 101-code catalog; lane11 test fixed (10/10) | #608 | merged 41dea72 (verified locally: run_tests no new failures) |
| 2026-11-14 | 41dea72 | lane03 harness repaired (9 tests: 8 pass); fix: English baseline no longer masks a Quick Training translation reached through alias keys (`navTrainingText` → `trainingTitle`) | #609 | merged 1e2e13b |
| 2026-11-14 | 1e2e13b | 2 stale test harnesses repaired (note digit integrity, streak badge); KNOWN_FAILING 17 → 15; run_tests 478 pass, no new failures | #610 | merged 17faf63 (Gitleaks/CodeQL red on base too; Codex P2 → follow-up below) |
| 2026-11-14 | 17faf63 | Codex P2 from #610: new `tests/i18n/notes_ui_authored_digit_integrity.test.cjs` saves through `saveNewNote()` → installed `DeepFocusNotesEditorUI` → `draftToSave()` → controller → Notes Core (fake DOM); mutation in `draftToSave()` caught | #611 | merged 58e2385 |
| 2026-11-14 | 58e2385 | analytics heatmap test: heatmap is the element after the year `<h3>`, not the wrapper's last child (insight sections are appended after it); KNOWN_FAILING 15 → 14 | #612 | merged 747ecb5 |
| 2026-11-14 | 4915c28 | packs hy ne si my km lo mn af (8 parallel subagents; TSV checker: order, placeholders, native digits, leading symbols) | (this PR) | see PR |

## Next step
Size budget fixed (owner approved finishing blocked work, 2026-11-14 ~12:05 UTC). Web assets 14,513,873 B after 62 packs; cap 16,000,000. The 30 left (mostly Latin, ~20-25 KB each) fit.
In progress: packs sq eu ca gl is ga mk mt (subagents running; TSVs in session scratchpad, not durable — redo if lost). Then cy be ky tg tk ps ku so, then ha yo ig zu xh sn st tn, then rw mg ny eo la gd co fy haw hmn sm su jv om. Branch pattern `i18n-packs-<n>` (last used: 13).
Efficient method: numbered source list (`index\tEnglish`), one subagent per language writes `index\ttranslation` TSV; validate (631 lines, order, placeholders, no native digits, leading symbols) before `tsv_to_pack.cjs`.
After packs: analytics English leak (below), then hardening (`termux_fix27`, `termux_fix30`); lane03 test 4 and `termux_fix02` wait on a DICT-vs-DF22 priority decision.

## Pre-existing failing CI gates (not required by branch protection; PR state "unstable", not "blocked")
- Gitleaks (generic-api-key hits in app.js, garden/contracts/security modules) and CodeQL (path-injection, fs-race, insecure-randomness in existing files).
- Lane11 `tests/i18n/visual/rtl_typography_numerals.test.cjs`: FIXED in branch `ccr-618eb454-5fbejb` (10/10): `js/localization_fallback_guard.js` synced to the 101-code app catalog (+ms om prs, -yi; prs RTL); test now expects `overflow-wrap: break-word` (d8bb074 removed `anywhere` on purpose). Removed from `tests/KNOWN_FAILING.txt`. Next hardening candidate: lane03 harness (needs `dfSyncInfiniteLocaleRegistry` stub etc.).
- **English leak (priority 5), found 2026-11-14:** `analytics_studio.js` has 39 EN strings; `assets/i18n/df99_reviewed_packs.json` (51 locales) covers only 17 under `analytics`. The other 22 (all daily weekly monthly minuteUnit heatMinutes excluded invalidRange barAria heatAria exportSaved exportCancelled exportFailed today last7 last30 currentWeek priorWeek activitySplit historicalGoals noHistoricalGoals exportUnavailable) show in English for every non-Arabic locale, e.g. fr "Last 7 days: 20 min / Previous 7 days". Fix = add these keys per locale (about 1,100 strings) or map them to the 101-language catalog; check the size budget first.
- Source bug: key "🩺 Scientific academic & Diagram Occlusion Diagram Occlusion" repeats a phrase (from runtime inventory); translations render it once.
These are candidates for a later security/i18n-hardening task (priorities 6 and 8).
