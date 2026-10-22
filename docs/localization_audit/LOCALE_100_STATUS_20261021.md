# Deep Focus 100-locale implementation checkpoint — 2026-10-21

## Scope and original invariants

Review PR: #129, stacked on PR #126, no main merge.
- 100 registered language targets: original 20 unchanged plus 80 unapproved candidates; Hebrew excluded.
- The original app's 20 runtime choices, Android package identity, stored data v21, backup format and user-authored notes/tasks are unchanged.
- Runtime activation of all 80 new locales is **OFF**. No renderer, timer, analytics engine or production Android Java is modified by this PR.

## Real candidate translation content produced

| Lane | Locale | Source keys with first-pass wording | Original keys still needing wording | Human review | Runtime |
|---|---|---:|---:|---|---|
| Web UI | Swahili (sw) | 88 | 384 of 472 | NOT_TESTED | DISABLED |
| Web UI | Romanian (ro) | 88 | 384 of 472 | NOT_TESTED | DISABLED |
| Android-native copy | sw | 10 | at least 1 brand/copy key | NOT_TESTED | DISABLED |
| Android-native copy | ro | 10 | at least 1 brand/copy key | NOT_TESTED | DISABLED |

**196 initial string candidates**, not certified translations. Additional native/dynamic keys are still outside the 472-key web source inventory, and candidate accuracy, plurals, tone and naturalness require independent contextual/native-linguist review. Romanian source-identical words are preserved with explicit human-review notes; no weaker synonym is forced to satisfy a test.

## Actual source audit of pre-existing 20 languages

Measured against the PR's same app tree:
- 4,626 missing explicitly populated language/key entries, **not** all translations in the rendered UI.
- 20 source-identical English candidates requiring triage.
- 94 unmarked static HTML/JavaScript display-text candidates.
- 25 source catalogs, 472 English keys in the current dictionary scanner. Native and dynamic Android/JS text inventory is **not complete**.
- Source-level native Android scanner additionally detects user-facing toast, notification-title/body, notification-channel and dialog-title strings.

## Guardrails and evidence

- JSON drafts cannot activate runtime locales, and cannot self-certify; full review and release state always remains false.
- Structural checks reject stale English inventory, missing placeholders, unsafe bidi/HTML, non-Western decimal numerals, unrecognized keys and lost action icons/CSV labels.
- Native Android candidate validator rejects unknown Java source strings, missing format tokens, unsafe numbers and control characters.
- Full 100-language scoreboard displays original locale gaps and missing new-language content. Unreviewed words count as **candidates**, not release-ready copy.
- GitHub Actions runs a source contract, entire existing Node/Python regression suite and real Chromium scenarios on the exact PR head. Check latest job and artifact before reporting PASS.
- The separate Android expanded-dialog acceptance in PR #128 previously failed (native dialog proof timeout); Android device, SAF, TalkBack, full buttons, speaker review, licensing/security and signed release remain independent gates.

## Integration path

1. Finish the missing translations for each locale across every screen, modal, native Android message and accessibility node.
2. Run independent fluent-speaker contextual review, including terminology, pluralization and consent/warning text.
3. Prove 0–9 generated counters, RTL/LTR, screen sizing, all tap outcomes, offline/restart, user-data preservation and real SAF on exact-head Android.
4. Prepare a separate narrow activation PR; independently review and approve each locale. Do **not** activate a whole 80-language group on a source-lint PASS.

**RELEASE_APPROVED=NO. MERGE_READY_AS_100_TRANSLATED_LANGUAGES=NO.**
