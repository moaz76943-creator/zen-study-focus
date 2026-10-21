# Deep Focus — application controls, Analytics and timer safety acceptance (2026-10-21)

**Scope:** exact application SHA `12f4aced3a1798cdc89dd3cc70c2741e120d321d` derived from the reviewed PR #118 P0 branded native dialog branch; separate QA branch PR #127 tests that app source. No merge to main. Android v21 storage/ID/JSON packets unchanged.

## Reproduced and repaired application defect

The three standard Timer mode buttons did not share the same active-session protection. Focus used `selectTimerModeFromUser`; **Short and Long** called `selectTimerMode` directly, silently discarding an in-progress Timer session.

Test-first: [RED source #39539453073](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39539453073) had one expected failure proving the Short/Long mismatch. The only application runtime change is replacing two `onclick` handlers in `index.html` with the existing guarded handler. No reset/clear, new persistence API or native code changed.

## Exact-HEAD positive evidence (Chromium/source)

[GREEN source + real Chromium #39539734962](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39539734962) **SUCCESS**:

| Case | Outcome | Evidence |
|---|---|---|
| Node source regression suite | PASS: 624/624 | Workflow source job |
| Python suite | PASS: 31/31 | Workflow source job |
| Browser genuine timer-running Short/Long Cancel | PASS | No reset of mode/total/sessionId; remains running |
| Browser genuine Long OK | PASS | Selects Long, stops old session |
| Bottom navigation active section | PASS: 7/7 | Real click and observed screen |
| Open/close Settings/Goals/Custom Timer/Notes | PASS: 4 named flows | Real click and DOM |
| Analytics translated controls & interactive filters/export in all 20 languages | PASS: 20/20 locale scenarios | Chromium JS, export via **mock/native callback contract**, not real SAF |
| Analytics responsive rendering | PASS: 18/18 | 6 languages × 3 widths |
| Navigation button hit-testing | PASS: 140/140 | 7 nav × 5 languages × 4 widths |
| Layout at two font sizes and phone widths | PASS: 280/280 | Browser only; zero overflow/clipping |
| Language switch/navigation | PASS: 60/60 | 20 locales × 320/393/430px |
| Existing deep Notes/Tasks/Timer training/alerts save and quota scenarios | PASS | Browser completion/picker/editor suites |

**Button coverage caveat:** static inventory counted **134** interactive source controls, **51** dynamic `addEventListener` sites, **45** dynamic control factories and no missing script references. The browser rendered **230** button elements in one runtime state. These are *inventory counts*, not 230 tested functional outcomes. The dedicated browser interaction ledger recorded **14 named positive interaction cases**; other independent browser suites add scenario-specific evidence but do not exhaust every input permutation.

## Android acceptance

The older [native P0 QA #39491560302](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39491560302) passed 5 app-branded JS prompt/alert/confirm actual Android taps and offline restart, but did **not** include this new Short/Long fix. [PR #127](https://github.com/moaz76943-creator/zen-study-focus/pull/127) runs real Android API30 against the **new exact app SHA** with actual short/long Cancel/Accept and 20 locale accessibility/5-screen Western numeral probes. **Mark NOT_TESTED on this HEAD until the final run/JSON evidence is reviewed.** Old emulator successes do not count as green for new source.

## Remaining non-certified controls, release blockers

- Complete *semantic* click, state, rollback and accessibility traversal for each inventory control and dynamic widget: **NOT_TESTED**, particularly rarely-used Calendar operations, backup/restore, hidden modal controls and all sound-mixer variants.
- Real SAF save/cancel/restore with the Android DocumentsUI provider: **NOT_TESTED** on this HEAD; mocked browser callbacks are not proof.
- Every original 20-nature sound file human listening, rights and actual device audio focus/loop: **NOT_TESTED**; do not enable unapproved recordings.
- Full 20-language contextual text parity: **NOT_TESTED**, preexisting independent audit found 4,626 missing explicit locale/key pairs, despite passing functional Analytics subset.
- Real owner phone Android 13, interruption/rotation/notifications/TalkBack, v21 primary/mirror/Native ACK fault injection: **NOT_TESTED** on this HEAD.
- Security Gitleaks review not independently closed.
- Release gate: `RELEASE_APPROVED=NO`.

**Bottom line:** broad interactive desktop acceptance and targeted source regressions are GREEN; universal “100% of all buttons / entire app” certification would not be supported. No main merge or automatic production signing.
