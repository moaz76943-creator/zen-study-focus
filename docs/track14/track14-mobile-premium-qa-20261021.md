# TRACK 14 — Premium mobile UI & accessibility (scoped recovery)

Date: 2026-10-21 · Owner: Track 14 · Issue #110 / DF-138–147

## Source and dependency ledger
- Base: integration/master-recovery-20261021 at `cd1713b66fdf6ec11c5808834bf30f516ee8f6c5`, PR #138. **Do not merge this branch into main or #138 automatically.**
- CSS existed already (from PR #84); retains its activation, all seven bottom destinations and the centered fourth Timer/fifth Training tabs.
- The existing Android origin-safe JS dialog implementation is owned by PR #118; this change does not touch Android Java or native dialogs.
- PR #95 and #131 are independent locale/navigation and binding audits; they are **not** proof of real button outcomes at 200% or TalkBack support.
- Shared-file coordination: this branch edits **only** `design_recovery/white_premium_recovery10.css`; PR #138's file list as inspected on 2026-10-21 did **not** include it. Recompare against the latest #138 SHA before integrating.

## RED → GREEN source evidence
- At the exact base SHA, two source predicates were false: an explicit cap for timer digits at 200% text scaling, and wrapping with a 44px minimum for the quick duration buttons.
- Minimal scoped CSS adjustment: bounded responsive timer font size `clamp(1.55rem,12vw,3.25rem)`; wraps duration controls and sets 44px minimum targets without removing handlers or changing stored data.
- Post-change source predicates true. No actual end-to-end Android assertion is implied.
- Reproducible local suite: `node --test tests/white_premium_qa/*.test.cjs`.

## Chromium layout and visual review
Browser runner: `tests/white_premium_qa/track14_mobile_matrix_browser.cjs`; isolated workflow: `.github/workflows/track14_mobile_premium_qa.yml`.

| Width | RTL/LTR | 100% | 150% | 200% |
|---|---|---|---|---|
| 320px | both | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| 360px | both | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| 393px | both | NOT_TESTED | NOT_TESTED | NOT_TESTED |
| 430px | both | NOT_TESTED | NOT_TESTED | NOT_TESTED |

These 24 Chromium cells must be promoted to PASS or FAIL **only from this branch's completed exact-SHA run**. The script records ring text bounds, seven destination hit areas, page overflow, navigation clicks, errors, 24 PNG screenshots, two transparently labeled *simulated old-rule* 320px/200% comparison screenshots, and JSON results. The comparison images are *not* claimed to be snapshots of a previous deployed app. Root-font CSS emulation is not proof of Android WebView text zoom.

## Acceptance ledger
| Gate | State | Evidence/remaining proof |
|---|---|---|
| Correct base / separate branch | PASS | anchored to integration PR #138 head captured above |
| Seven destinations / no Meditation | PASS (source invariant only) | regression check; click postconditions require browser run |
| CSS timer cap + adjustable controls | PASS (source predicate only) | RED→GREEN source inspection |
| 320/360/393/430 at 100/150/200% | NOT_TESTED | exact-head Chromium workflow & artifact pending |
| Visual regression screenshots | NOT_TESTED | comparison baseline simulated; human screenshot review pending |
| Keyboard focus and visible outlines | NOT_TESTED | source styles already present; hands-on navigation still required |
| RTL/LTR / generated Western digits | NOT_TESTED (runtime) | screenshots + locale audits required; user-authored text untouched |
| Android physical/emulator screenshots | NOT_TESTED | install exact-head APK; capture real UI |
| Android soft keyboard and modal IME | NOT_TESTED | Activity/Notes dialogs in emulator with real IME |
| TalkBack, screen reader names and ordering | NOT_TESTED | Android accessibility traversal |
| Native touch and safe area | NOT_TESTED | emulator and physical touch tests |
| All 15 product UX tasks fully closed | NOT_TESTED | partial responsive safety repair only |
| Release gate | FAIL (not approved) | RELEASE_APPROVED=NO, no signing/merging |

## Rollback and independence
Revert only the scoped CSS commit after review. Do not change JS focus/session state, v21 storage keys, application package, existing translations, assets or audio. Do not call source-only success a production approval. Preserve any in-flight changes in PR #138 until integrator resolves conflicts.
