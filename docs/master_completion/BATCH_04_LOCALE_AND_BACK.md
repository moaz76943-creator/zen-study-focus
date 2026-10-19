# Batch 04 — dynamic Notes labels, training locales and safe Back

BASE_SHA: ff7d7d4
ISSUES_FIXED (scoped implementation): DF-048/055/059/065/077/080, DF4-007/008/013/015.

Confirmed in real desktop Chromium: switching an open English Notes editor to Arabic retained English Preview and All notes/Archive/Trash controls. Owned labels now carry explicit translation keys; locale refresh updates captions, fields, filters and draft status without rebuilding inputs, changing selection values, resetting the opened fingerprint or rewriting authored text. Only explicit UI labels are updated.

The existing training key registry now has complete explicit rows for all 20 languages; no separate training engine was introduced. Presets state seconds vs minutes, and remove-exercise title/ARIA and training navigation use the selected language. Source completeness and rendered labels are verified, but professional native-language editorial review is still required. Other Notes/Tasks/settings catalogs remain incomplete and are not covered by this claim.

A separate P0 found during this work: Android Back removed noteModal directly, bypassing the existing draft/quota confirmation. It now closes only the top modal and delegates Notes to nsCloseEditor; refusing to lose a draft consumes Back while keeping the editor open. Escape uses the same guard. New three-case source regression failed before this fix and passes now.

TEST_COMMANDS: node --test tests/notes_ui/*.test.cjs tests/localization_20/training_catalog.test.cjs tests/integration_recovery/back_draft_guard.test.cjs; node tests/df4_browser/completion.cjs; node tests/smoke_app.cjs.
TEST_RESULTS: Notes UI 40 PASS; training catalog 2 PASS; Back 3 PASS; desktop browser 23 PASS (20 rendered training locales + Notes locale/persistence + quota retry + timer retry with simulated elapsed fixture), zero JS errors. External network blocked in a fresh desktop browser context; screenshots/log: /workspace/scratch/completion-evidence/browser/.
ACTUAL_ANDROID_TESTS: NOT_TESTED for these changes. Native device Back is not claimed from a JS/desktop test.
NEXT_BATCH: inspect Android CDP timeout diagnostics, review independent dashboard delta and rebuild exact final source.
