# Batch 08 — narrow Calendar and reproducible media inventory

BASE_SHA: 99a1092
ISSUES_FIXED (desktop scope): DF-065/080/129/141/142/143/144, DF4-022/025.

The full-app desktop layout sweep found 8 horizontal overflow cases in Calendar: Arabic at all four widths at 200% root font size, and en/de/fr/ru at 320px/200%. Weekday intrinsic widths forced the seven-column grid wider than its container. Both Calendar grids now use minmax(0,1fr); weekday labels wrap, and day cells have zero intrinsic minimum width with a 44px minimum height. Days are real buttons, with ISO labels, selected/current-date accessibility state and LTR numbers. Keyboard selection retains focus after rendering. No date/time-zone storage or user records changed.

TEST_COMMANDS: node tests/df4_browser/layout.cjs; node tests/smoke_app.cjs; actual desktop Enter on a day button.
TEST_RESULTS: 280/280 layout cases PASS after fix (0 overflow, exactly one active navigation button, 0 clipped navigation labels); smoke PASS; calendar keyboard action PASS. Sweep covers 7 tabs, ar/en/de/fr/ru, 320/360/393/430, CSS root 100/200%. This is not Android font-scale, IME, rotation or TalkBack proof.

Media: added tools/recovery/media_inventory.py and corrected historical MEDIA_LICENSES.md statements about absent night/waterfall files. Audited all 12 catalog identities plus 2 auxiliary files: 12 packaged files, 2 missing identities, duplicate earth/noise. Actual hashes and ffprobe/full desktop decode are recorded separately from unknown source/license/original chain/listening/Android fields. No audio asset, allowlist or approval flag changed. CI collects exact-head inventory; unavailable codecs are explicitly NOT_TESTED, never media approval. Quarantine remains outside APK.
ACTUAL_ANDROID_TESTS: NOT_TESTED for these latest changes; the independent emulator attempts still block Android acceptance.
NEXT_BATCH: all 197 task records, final full source/native regression, exact-SHA Debug APK and explicit release blockers.
