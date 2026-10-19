# Master QA evidence matrix — 161 backlog items

**Audit:** 2026-10-19; source https://github.com/moaz76943-creator/zen-study-focus/issues/13
**Integrated source SHA:** `28b19a1b4c0e51096303e3c8c30384ab40623457`; **main remains** `fab0b8bb82d0031e8de4e54086734be94bb38cc0`.
**Verified GitHub Actions Run:** https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39194321909
**Mode:** Initial QA before this lane's changes. Source static inspections + pre-existing integrated CI only. This report does **not** claim the newly added tests have run on CI, and **does not** claim physical-device execution.

Counts for this independently audited initial matrix: **{"PASS":4,"FAIL":1,"BLOCKED":4,"NOT_TESTED":152}**.
**Decision:** FAIL / BLOCKED for production; a test-only build may be used for controlled validation of data-free or disposable profiles, not release to Play.
PASS statuses cover only the precise evidence described; 001–147 were not revalidated individually. Re-run and update each cell once all tracks are integrated at one reviewed HEAD.

| ID | Exact source requirement (Issue #13) | Status | Evidence / action |
| --- | --- | --- | --- |
| DF-001 | Check live `main`, recovery branch `fix/v21-safe-release-recovery-20261018`, PR #1 and PR #12; record full commit SHAs. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-002 | Do not run Gemini agents on `main`, recovery branch or PR #12 branch; create a dedicated topic branch off the latest tested recovery SHA. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-003 | Before changes export an actual `ZEN21::` v21 backup on the user's Android phone and verify offline recovery with a disposable dataset. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-004 | Capture current baseline screenshots and reproducible failures for each of the seven reported areas. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-005 | Record current device Android/WebView version, screen dimensions, available disk space, and build runner constraints. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-006 | Read `docs/contracts/DATA_COMPAT_V21.md`, `docs/MEDIA_LICENSES.md`, `docs/QA_08_RELEASE_AUDIT_20261019.md`, and relevant integration instructions. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-007 | Verify all worktree statuses clean before the agent edits, and make only scoped incremental commits; do not rewrite working user files. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-008 | Create an explicit PR conflict matrix for audio, locale, analytics, tasks, notes, and shared `app.js` / `index.html`. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-009 | Adopt P0/P1/P2 and statuses TODO/BLOCKED/IN_PROGRESS/TESTED/DEFERRED with unique IDs in commit messages. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-010 | Record commands, test output, changed files, failures, licenses and Git SHA after each small batch. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-011 | Detect unsupported Gemini CLI/Termux platform and stop; never use random forks, sudo, `curl / sh` or insecure workarounds. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-012 | Require human GitHub review before merges or changes to permissions, licensing, backups, signing, and release configuration. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-013 | Enumerate every nature sound tile and corresponding packaged file, and confirm it is actually referenced at runtime. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-014 | Detect missing, zero-byte, corrupted, HTML disguised as `.ogg`, undecodable or artificially synthesized nature content. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-015 | Never silently generate synth-noise 'nature' as a replacement for a missing recording. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-016 | Find field recordings for rain (light/heavy), waves, gentle stream, waterfall, forest/birds, leaves, soft wind, fire, nighttime crickets, distant thunder, café, and roof rain. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-017 | Prioritize CC0/CC BY recordings whose individual source and redistribution rights can actually be verified; CC BY requires proper attribution. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-018 | For EACH asset capture upstream URL, owner, exact license URL, attribution text, download date, original SHA256 and converted SHA256. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-019 | Reject recordings with no reliable individual provenance, personal data, music, voices requiring clearance, or unclear commercial redistribution rights. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-020 | Listen to every candidate at ordinary phone volume; screen for hiss, pops, clipping, sharp peaks, obvious loops, synthetic artifacts, and distracting noises. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-021 | Verify codec support and actual decode on Android WebView, not merely `.ogg` filename and desktop `ffprobe` success. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-022 | Normalize recording loudness conservatively without aggressive compression or clipping; prevent combined mixer peak overload. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-023 | Create pleasant stable loops with sufficient duration and short crossfade only when necessary; thunder should not loop every few seconds. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-024 | Provide graceful unavailable-state per tile and local fallback silence/error, never streams or unverified effects. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-025 | Verify simultaneous playback, independent volume, mute at 0%, pause, resume, stop-all, app background/foreground and teardown. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-026 | Prevent duplicate sound instances, stale promises, stuck audio, and AudioContext/HTMLAudio resource leaks. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-027 | Keep the core ambient playback completely offline; avoid permissions not required for playback. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-028 | Maintain `docs/MEDIA_LICENSES.md` as a per-asset artifact and add automated provenance/codec/hash checks. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-029 | Verify package size after replacement and ensure Google Play delivery constraints are respected. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-030 | Do not activate previously hidden/invalid sound tiles until their authentic and legally distributable recordings are included. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-031 | Provide a small picker (minimum five options) of clear, soft **non-musical** completion sounds, including a silent option. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-032 | Consider soft single bell, wooden chime, gentle water drop, small soft gong, two short natural percussive taps; no melodies/music. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-033 | Obtain each sound with verified individual CC0 or compatible license and provenance before bundling. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-034 | Normalize alert loudness; cap sudden peaks, remove clicks, harsh high frequencies, and long reverb tails. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-035 | Preview sounds in settings with volume control, cancellation and only one preview playing at a time. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-036 | Persist selected sound/volume in existing config safely and retain stable fallback if asset unavailable. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-037 | Respect silent mode, Do Not Disturb, notification permission, audio focus, alarms and user's mute preference as platform-appropriate. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-038 | Distinguish focus completion vs short rest vs long rest where useful but avoid repeated or intrusive alarm loops. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-039 | Test background, locked screen, audio focus interruption, Bluetooth/headphones and rapid successive sessions. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-040 | Check alerts do not play twice after timer restoration and callback retries. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-041 | Write tests for silence, disabled alerts, no asset, user volume 0, pause/dispose, and repeated completion id. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-042 | Document sound sources, exact licenses and attribution along with ambient recordings. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-043 | Restore or maintain all **20 originally supported language choices**; do NOT quietly remove `ar`, `fa`, or `ur` to hide untranslated strings. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-044 | OWNER DECISION REQUIRED if prior request to suppress ALL Arabic script is intended literally: current request says all 20 selected languages should work. Default to language-faithful UI. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-045 | Keep selected interface language stable after restart, session restore and backup import. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-046 | Inventory every visible string in HTML, JavaScript templates, alerts, buttons, tooltips, modals, error toasts and Android-native UI. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-047 | Remove or map every static English string in Arabic/German/Spanish/other non-English modes. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-048 | Cover Notes Studio, Tasks Studio, Analytics Studio, timers, training, sounds, goals, backup flows and calendar. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-049 | Create a canonical key registry; avoid multiple independent dictionaries for the same key with divergent translations. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-050 | Validate exact parity of key sets for the registered 20 language codes in CI. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-051 | Eliminate literal internal i18n key placeholders, undefined/null and empty strings in the UI. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-052 | Use language-appropriate plurals and date/weekday names but not non-Western digit glyphs. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-053 | Ensure RTL applies to interface correctly and does not reverse original note/task body contents. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-054 | Enforce no unwanted Arabic-script strings in NON-Arabic UIs, while preserving Arabic only when the Arabic locale is selected. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-055 | Handle language switch in already-open modals and re-render dynamic components, without data mutation. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-056 | Test on narrow mobile screens with longer German/French/Russian strings and screen reader labels. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-057 | Add Android native bridge translations for save dialogs, download/export errors and notifications. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-058 | Test all 20 languages with screenshot snapshots and per-screen DOM inventory; distinguish not-yet-tested from PASS. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-059 | Do not translate user-entered note titles or task descriptions, and do not drop historical note content. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-060 | Enforce ASCII digits 0-9 for ALL rendered counters regardless of UI language (Arabic, Persian, Urdu included). | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-061 | Cover timer, training rounds, dates, calendar, goal %, task counts, notes counters, daily/week/month chart labels, SVG axis labels, tooltips, legends, downloads. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-062 | Prevent `Intl.NumberFormat` locale defaults from yielding Arabic-Indic/Eastern Arabic numerals; force `latn` numbering system with tested fallback. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-063 | Keep digits 0-9 in numeric input fields including Android numeric keyboard and validation messages. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-064 | Do not change identifiers, text bodies, filenames, translations or stored user data just to normalize display digits. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-065 | Ensure numbers remain correctly ordered in RTL; use bidi isolation (`bdi`, `dir=ltr`) for numeric segments. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-066 | Add automated DOM + SVG assertions forbidding U+0660–U+0669 and U+06F0–U+06F9 in GENERATED NUMBER UI. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-067 | Test representative values 0, 9, 10, 25, 100, 1234, -2, 0.75, 100%, 2026-10-19 and 00:05. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-068 | Ensure CSV is invariant and exported with ASCII digits, date keys and culture-neutral numeric decimal separator. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-069 | Test first render, tab switch, state update, hot locale change, resumed timer and restored backup. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-070 | Inventory all `onclick`, addEventListener, pressable cards, menu items and tab actions across EVERY screen. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-071 | Automatically detect missing handlers, duplicate conflicting global functions and incorrect script load order. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-072 | Classify each tap target: action, navigation, informative non-clickable display, disabled with reason, or remove. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-073 | Remove misleading tap affordances from analytics KPI cards unless a genuine detail drilldown exists. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-074 | Ensure all forms validate inputs and provide specific recovery instructions rather than cryptic code/error names. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-075 | Ensure save/copy/export/share/delete/retry controls report confirmed results, never optimistic success. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-076 | Make empty-state call-to-action buttons actually open a relevant editor or page. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-077 | Enable close, back, cancel and Escape behavior for each modal without losing unsaved work. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-078 | Prevent double submit, race conditions and duplicate tasks/notes/session events from rapid double taps. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-079 | Capture console errors and JS exceptions (without personal data) in a reproducible QA report. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-080 | Test Android back button, keyboard open, focus traps, screen reader navigation and orientation. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-081 | Exercise drag, swipe and press events on real touch input; always offer a tap-based alternative. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-082 | Test clipboard unavailability, SAF export denied/cancelled, closed document stream, storage full and old device behavior. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-083 | Render localized human-readable error messages and a useful retry mechanism. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-084 | Use event-driven regression tests for at least 100 critical tap targets rather than checking that onclick strings merely exist. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-085 | Offer an uncluttered notes home: search, compact notebook/tag chips, pinned/recent notes, clear + action. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-086 | Separate quick capture from full editor and reduce new-note taps to one. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-087 | Finish rich editor toolbar for heading, bullets, ordered list, checkbox, quote, undo/redo and safe preview. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-088 | Make Cornell cues, main notes, summary separate fields with old-note view/edit compatibility. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-089 | Use full-height distraction-free writing mode with Android keyboard-safe toolbar, back/close confirmation. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-090 | Implement reliable per-note drafts with verified save result and conflict detection; never overwrite a newer saved note silently. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-091 | Implement archive/trash/restore without ID changes or destructive mass deletion. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-092 | Support simple notebooks and multiple tags without nested complexity; fast filters/sorting/search. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-093 | Make note detail and reading mode beautiful, airy and readable, with mixed RTL/LTR content. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-094 | Implement interactive checkboxes where supported and truthful checklist progress. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-095 | Offer highlight/selection and headings/TOC for long notes without heavy editor framework. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-096 | Enable secure internal note links/backlinks by stable numeric ID and predictable missing-target behavior. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-097 | Link notes to tasks and calendar with atomic/best-effort recovery per v21 contract. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-098 | Extract checklist tasks with confirmation, stable extraction key and dedupe. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-099 | Make active recall question/answer/cornell review usable in no-more-than-three-tap flows. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-100 | Preserve all old note content and unknown fields; sanitize note Markdown and disallow JS URLs/XSS. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-101 | Count only real user-created notes and real properties; no fake reading or focus time. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-102 | Provide export TXT/Markdown and safe Android PDF/print after real-world tests. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-103 | Test 1,000/5,000 notes, long bodies, 320px displays, Arabic paragraphs and storage quota failure. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-104 | Use progressive disclosure to avoid clutter; group advanced commands under overflow menu. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-105 | Make adding a task one tap plus text; move advanced fields into optional details. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-106 | Design each collapsed task card with title, one status, due indicator and primary action only. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-107 | Make edit, complete, reopen, archive, trash/restore and Undo reliable and discoverable. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-108 | Support subtasks and checklists with compact inline progress. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-109 | Support optional projects, due date/time, priority and activity without requiring them for basic tasks. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-110 | Offer Today / Upcoming / Overdue / Completed views, with quick reschedule. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-111 | Allow picking top three daily priorities manually. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-112 | Connect a task to focus timer by stable numeric task ID and record only real completed activity. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-113 | Prevent double-counting focus time and duplicate completed occurrences for recurring tasks. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-114 | Implement safe daily/weekday/weekly repeat rules and one occurrence per due window. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-115 | Compute real project progress from genuine tasks, not sample/startup items. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-116 | Connect tasks to notes and actual calendar dates and update links on archive/restore. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-117 | Provide search/filter/sort and alternate tap controls for reorder; avoid mandatory drag-and-drop. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-118 | Display planned vs actually recorded focused minutes when data exists, not invented numbers. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-119 | Keep v21 `id`, `catKey`, `date`, `done`, `isStarter` and all unknown fields on migration/edit. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-120 | Test 1,000 tasks, repeats across DST, storage failures and restoration. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-121 | Show actual history-based totals from v21 `id,date,minutes,domain`; do not require missing start/end timestamps. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-122 | Ensure one canonical analytics source, dedupe by unique valid session ID, report conflicting duplicates. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-123 | Exclude corrupt, sample, unfinished/non-focus activity when reliable status exists; document legacy limitations. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-124 | Never infer historic start hour or crossing midnight without trustworthy timestamps. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-125 | Provide a useful dashboard: today/7 days/30 days, sessions, activity split, true goals. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-126 | Provide weekly comparison with correct denominators and explicit empty period behavior. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-127 | Add user-controlled date range and activity filters with validation and reset. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-128 | Make each graph interactive only if it actually drills into data; no decorative dead cards. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-129 | Use lightweight accessible SVG charts with ASCII 0-9 ticks, labels, legends, tooltips and tab focus. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-130 | Provide meaningful zero-data states, no hard-coded percentages or demo productivity streaks. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-131 | Allow CSV export through Android SAF with explicit successful/failed/cancelled UI result. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-132 | Show links to actual task/session detail only when real relationships are recorded. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-133 | Keep chart render speed acceptable with 10,000+ histories; no unnecessary animation. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-134 | Validate streak rules, local day/week, time-zone shifts, leap day, partial week and DST. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-135 | Preserve ability to compare daily/weekly goals only when original target snapshots exist. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-136 | Test hidden charts, repeated analytics tab activation, reversed range and filter clearing. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-137 | Never place Arabic-Indic/Eastern Arabic digits in chart SVG text or visual labels. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-138 | Use existing white design tokens and unify typography, surface, shadows, borders, icon stroke and spacing. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-139 | Center timer in bottom bar exactly and keep quick training adjacent; retain access to all seven features. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-140 | Make home primary focus timer, quick activity presets, daily plan and goals; hide secondary complexity. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-141 | Use full-width touch targets, mobile keyboard-safe dialog height and overflow menus. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-142 | Respect logical properties RTL/LTR and safe areas; do not blindly mirror numeric data. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-143 | Verify 320/360/393/430px screen layouts and Android font scaling 100–200%. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-144 | Use 44dp-equivalent tappable targets where practical and clear focus indicators. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-145 | Make every success/failure/loading/empty state visually consistent. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-146 | Ensure bright white appearance without glary low-contrast text or heavy blur. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-147 | Check reduced motion, TalkBack labels and keyboard navigation. | NOT_TESTED | Outside Lane 11: independent lane acceptance not adjudicated by this run |
| DF-148 | Run initial baseline Node and Python tests before any feature changes; log only verified green results. | PASS | Integrated HEAD CI source/syntax/Node/Python regression all green, Run 39194321909 (not device) |
| DF-149 | After each batch run syntax, focused tests, smoke, and source-safety regression; do not weaken assertions to hide errors. | NOT_TESTED | Pending direct evidence |
| DF-150 | Add automated checks for audio asset codec/source/license entries and non-synth fallback. | FAIL | Media provenance gate intentionally red: incomplete per-asset license and provenance |
| DF-151 | Add 20-language DOM/screenshot coverage with Arabic UI test and global ASCII-digit enforcement. | BLOCKED | 20 dictionaries check available; no 20-language DOM/screenshot/ASCII SVG evidence |
| DF-152 | Add real WebView tap and media tests for at least one Android device or clearly mark NOT_TESTED. | NOT_TESTED | No physical Android/WebView test performed |
| DF-153 | Test offline mode, low storage, app background, kill/restart, activity recreation and Android permission denial. | NOT_TESTED | Real device lifecycle, permissions and storage failure unavailable |
| DF-154 | Verify v21 backup round-trip, IDs and unknown fields preserved, draft conflict and rollback on partial write. | BLOCKED | Isolated v21 contract coverage exists; on-device backup roundtrip/draft/rollback not proven |
| DF-155 | Verify notes-to-task-to-focus-to-analytics end-to-end without invented minutes. | PASS | Existing cross-lane pure-core E2E Node test passed in integrated CI (not device E2E) |
| DF-156 | Build Debug APK and unsigned AAB from exact HEAD SHA through existing GitHub Actions; preserve zero-additional-billing path. | PASS | Integrated HEAD CI produced debug APK and unsigned AAB, Run 39194321909 |
| DF-157 | Keep production Play signing, permissions, package `com.zenstudy.focus`, v21 keys and `ZEN21::` unchanged. | PASS | Inspected integrated Android Gradle/Manifest and source contract; no package or v21 key alteration |
| DF-158 | Never merge into `main` or publish to Play from an agent. Produce a human-reviewed draft PR and truthful PASS/FAIL/BLOCKED matrix. | BLOCKED | Draft QA PR not yet reviewed; merging/main publishing strictly forbidden |
| DF-159 | On any P0 test failure stop and revert the last narrow change; do not delete data or reset state. | NOT_TESTED | Pending direct evidence |
| DF-160 | Stop after at most two repair attempts per root cause; escalate with logs and reproducible steps. | NOT_TESTED | Pending direct evidence |
| DF-161 | Update media source document, QA report and changelog with changed files, SHAs and affected supported languages. | BLOCKED | This report/handoff added; original production media doc and changelog require owner 00 changes |

## Release gates (must ALL be green separately)
1. Exact integrated commit SHA frozen, all 161 requirements reviewed, conflict matrix accepted.
2. JS syntax + unit/core + QA master suite, smoke, Python regression PASS on SAME SHA.
3. Every bundled nature/end alert asset: individual origin URL, license text/permissions, attribution, source and converted SHA256, codec header, verified on-device listening and clean looping PASS.
4. All 20 locales including ar/fa/ur in DOM/Android, 0–9 for every generated numeric in DOM/SVG/export, persistence after restart PASS.
5. Actual touch controls, focus alarms and volume mixer, offline/lock/notification, TalkBack/keyboard/320px screen PASS on Android hardware.
6. Real v21 backup export→import & interrupted storage recovery retain IDs, unknown fields and user content PASS on device.
7. Note→task→real timer→single session→analytics→CSV workflow PASS on device.
8. Debug APK and unsigned AAB generated at exact SHA; **separate** signing & authorized human release decision for production.
9. Human review; no agent merge to main, no forced update/permission alteration/secret exposure.

## Trigger for recheck
After the last lane 00 integration merge, rerun all scoped QA tests, inspect failed assertions rather than bypass them, revalidate media and locale evidence, obtain real Android operator logs, update row statuses and issue #13 checkboxes only against evidence.
