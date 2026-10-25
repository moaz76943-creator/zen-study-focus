# Deep Focus — Unified Work Tracks & Notes Studio Roadmap
Date: 2026-10-19

## One design system, one integration branch
All changes integrate through PR #1, branch `fix/v21-safe-release-recovery-20261018`, not overlapping PRs. Use `white_2100.css` as the shared white visual layer: white/pearl surfaces, cyan-blue-violet accents, cohesive spacing, 44px targets where feasible, RTL/LTR, reduced motion, and no fake analytics. Keep legacy saved user records and `com.zenstudy.focus`.

### Track 1 — Unified white premium UI
Deliver consistent navigation, typography, spacing, rounded cards, modal design and responsive small-phone layouts across all six sections. Coordinate with all feature tracks; run regression, check accessibility and real-device layout.

### Track 2 — Timer and quick training
The seventh navigation item is a shortcut to the EXISTING interval training editor, not a second timer engine. Order: Tasks / Calendar / Notes / **Timer** / Training / Nature / Analytics. The timer is fourth of seven, visually central. Preserve timer state, intervals and no false progress. Later: fully configurable focus/short break/long break/round cycles, preset saving, and safe session switching.

### Track 3 — Notes Studio (highest priority)
First increment implemented in this branch: create/edit existing notes without replacing IDs; pinned/favorite flags; duplicate; date/calendar connection; source note search; category filter; sort by recent/oldest/title; real counts without starter examples; 12 templates; consistent white cards; hidden-answer recall; word and character counter. Preserve `zen_fortress_notes_v21`, backup v21, and old note content.

### Track 4 — Tasks, daily goals, nature and analytics
Keep accurate saved tasks/session measurements. Refresh task cards in the same white surfaces. Nature cards must label each actual volume slider and show percentage. Future: daily goals based only on recorded focus duration, user-configured per-domain goals, honest progress and integrated planning.

## Notes improvements catalogue — 40 actionable ideas
**Status:** Ideas below are proposed unless explicitly marked as implemented. This is not a claim they already exist.

### Capture and editor
01. [Implemented] Create a note from any opening of Notes Studio
02. [Implemented] Edit an existing note without changing its stable ID
03. [Implemented] Duplicate a note into a separate editable copy
04. [Implemented] Live word and character counts
05. [Proposed] Automatic local draft saving while editing
06. [Proposed] Undo/redo for note edits
07. [Proposed] Dedicated reading/writing fullscreen mode
08. [Proposed] Bullet, numbering and checklist formatting controls
09. [Proposed] Heading, highlighting and structured section tools
10. [Proposed] Linked text and source URL fields

### Reusable templates
11. [Implemented] Cornell layout — cues, main notes and summary
12. [Implemented] Active recall — question and hidden answer
13. [Implemented] Reading and book-summary template
14. [Implemented] Meeting minutes template
15. [Implemented] Project plan template
16. [Implemented] Workout log template
17. [Implemented] Brainstorming template
18. [Implemented] Checklist template
19. [Implemented] Lecture notes template
20. [Implemented] Weekly review template
21. [Implemented] Decision log template
22. [Implemented] Daily journal template
23. [Proposed] Custom user-created reusable templates
24. [Proposed] Cornell dedicated split panel and printable structure

### Organizing and finding
25. [Implemented] Pin notes to the top of the list
26. [Implemented] Mark notes as favorites
27. [Implemented] Search note titles, contents, and category labels
28. [Implemented] Sort by recency, oldest, or title
29. [Implemented] Preserve calendar dates
30. [Proposed] Notebooks/folders and multi-tag notes
31. [Proposed] Favorites-only and multi-tag smart filters
32. [Proposed] Archive and recoverable trash, with explicit permanent delete
33. [Proposed] Filter by date range and activity
34. [Proposed] Detect duplicate note titles, never auto-delete

### Recall, study and progress
35. [Implemented] Reveal and hide recall-card content
36. [Proposed] Per-note review reminder and review due-date
37. [Proposed] Convert note questions into self-test cards
38. [Proposed] Optional spaced repetition derived from user notes
39. [Proposed] Link a note to a task or focus session without fabricated sessions
40. [Proposed] Optional Markdown/PDF export with faithful right-to-left text

## Safe rollout
- Before merging: JavaScript syntax checks, Notes Studio CRUD smoke tests, original source-safety checks, APK/AAB build, accessibility/layout sanity.
- No signed production release until device QA, sound/media-license evidence and Play signing gates pass.
- The newly introduced notes controls have Arabic and English labels; the other eighteen app languages currently fall back to English for these new controls. Full localization is a separate gate.
- Do not count three starter notes as user-created notes.
- No destructive schema migration, force push, or release of unsigned assets.
