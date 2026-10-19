# DEEP-FOCUS-RECOVERY-10 — White Premium design / lane 00 handoff

Source: [Issue #13](https://github.com/moaz76943-creator/zen-study-focus/issues/13), **DF-138–DF-147**.
Base: `632ef51ae6034224e6b459e0962a8bbedbf2b18e` on `fix/v21-safe-release-recovery-20261018`.
This delivery is intentionally **CSS + tests + documentation only**, not activated on the baseline runtime.

## Design direction and ownership

The existing `white_2100.css` has seven real bottom actions (Tasks, Calendar, Notes, Timer, Training, Nature, Analytics); its timer is in logical column 4 and training column 5. Preserve those controls and their handlers. Do not create decorative proxy controls. Timer remains a functioning existing v21 focus engine, not a new timer or fabricated analytics source.

Lane 07 already owns `design_tokens_v22.css`, `ui_components_v22.css`, and premium translation module. **Do not duplicate those assets**; take its opt-in class `df-v22` and token names. This lane only owns:
- `android/app/src/main/assets/web/design_recovery/white_premium_recovery10.css`
- `tests/white_premium_qa/design_recovery.test.cjs`
- `tests/white_premium_qa/viewport_matrix.py`
- this guide.

No direct writes to `index.html`, `app.js`, `white_2100.css`, other lanes' CSS or data keys. No font downloads or remote runtime dependencies are introduced.

## Exact lane-00 integration edits

1. Integrate lane 07 asset files first; resolve conflicting branch ancestry with an explicit commit/verified SHA. In **integration-owned `index.html` only**, load stylesheets in this order:

```html
<link rel="stylesheet" href="white_2100.css">
<link rel="stylesheet" href="design_tokens_v22.css">
<link rel="stylesheet" href="ui_components_v22.css">
<link rel="stylesheet" href="design_recovery/white_premium_recovery10.css">
```

2. Preserve the body’s existing dynamic classes (including `timer-home` / `deep-lockdown`); append opt-ins `df-v22 df-recovery10`. Activation is reversible by removing `df-recovery10` and its stylesheet. Do not inject style dynamically as an unreviewed workaround.

3. Keep the existing `nav.bottom-nav-capsule` with **all seven original button IDs**, order and handlers intact. On every tab activation update `aria-current="page"` (or a consistent tab pattern), and set the active button's accessible name from the selected locale. In particular `#navTraining` must not retain a hardcoded language after switching locale. Mark decorative SVGs `aria-hidden="true"` / `focusable="false"`. Never use color alone to announce active state. A CSS class alone does not update TalkBack labels.

4. Keep `#focusHeroCard` before `#quickTrainingCard` in focus/reading order. Mobile layout should present real timer first, then quick presets, training, daily plan/goals. If you need to group existing nodes, introduce `<div class="df10-focus-pair">` around the **existing** timer and training nodes without cloning/mounting them twice. On narrow phones the wrapper stacks, not side-by-side. Wide-screen side-by-side is strictly optional with `df10-wide` and only above 720px. Moving DOM nodes can invalidate original dashboard-order assertions; update integration-owned tests against the new deliberate order before enabling the wrapper.

5. Use `class="df10-state" data-state="success|error|loading|empty"` on existing state elements. For **confirmed** success, mark `role="status"` with `aria-live="polite"`; errors `role="alert"`; loading `aria-busy="true"` on relevant regions. States must carry localized human-readable text and actionable retry if supported. Never announce success before the real save/export operation acknowledges completion. Do not inject sample tasks/notes or fake time.

6. For modals, integration owner keeps `role="dialog"`, `aria-modal`, `aria-labelledby`, focus entry/return, Escape/Android back handling, and unsaved-change confirmation. CSS provides bounded scroll height; **CSS alone cannot focus-trap or detect all Android IME viewport changes**. Implement a single central `visualViewport` resize observer only if real WebView IME QA proves it necessary; avoid global scroll hacks.

7. Preserve all 20 languages and apply `html.dir` according to selected locale (`ar/fa/ur` RTL). Numeric UI uses Latin 0–9 via the locale/numeral system owned by lane 03/04; CSS only isolates timer/counters. User-entered note/task text remains unchanged and direction-auto as appropriate. Check PR #12's restriction of ar/fa/ur against Issue #13 before allowing it into integration.

## Acceptance test matrix (do not infer PASS from CSS existence)

| Gate | Expected | Current isolated lane |
|---|---|---|
| DF-138 | Reuse lane-07 v22 design tokens | CSS opt-in authored; integrated rendering NOT_TESTED |
| DF-139 | 7 nav controls, timer 4th, training 5th | Source invariants authored; real WebView NOT_TESTED |
| DF-140 | Timer / quick durations / daily plan primary | CSS authored; markup adjustment belongs to 00 |
| DF-141 | Touch, modals, text expansion, IME | CSS authored; Android IME NOT_TESTED |
| DF-142 | RTL/LTR, safe area, numeric isolation | CSS authored; device RTL NOT_TESTED |
| DF-143 | 320/360/393/430 and 100/150/200% | Browser script provided; run status NOT_TESTED |
| DF-144 | 44px equivalent targets where feasible | CSS authored; device accessibility NOT_TESTED |
| DF-145 | Success/error/loading/empty states | CSS classes authored; correct runtime semantics by 00 |
| DF-146 | Contrast, soft white, no blur/perpetual effects | Tokens reused; computed-style audit NOT_TESTED |
| DF-147 | Reduced motion, keyboard, TalkBack | CSS authored; manual TalkBack NOT_TESTED |

At 320 CSS pixels, seven 44px touch slots + gaps/padding are an unusually tight fit; keep seven visible where possible and permit contained nav scrolling rather than reducing hit targets below 44px. At 200% font scaling, wrap tab labels and allow nav height to increase. Prevent clipping, rather than shrinking semantic text. Verify nav center in both `ltr` and `rtl` on actual target WebView.

## Automated tests and commands

```bash
node --test tests/white_premium_qa/design_recovery.test.cjs
python3 tests/white_premium_qa/viewport_matrix.py
node tests/smoke_app.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

The first command is dependency-free and guards source structure. The second executes 24 cases (4 widths × 2 directions × 3 emulated root-font sizes) using optional local Playwright/Chromium; an unavailable browser reports `NOT_TESTED` (exit 2), not PASS. These checks do not replace screenshot review or physical Android WebView testing.

**Manual Android gate:** widths 320/360/393/430; fonts 100/150/200%, portrait/landscape; RTL ar/fa/ur plus LTR en/de; hardware keyboard, D-pad and TalkBack; screen cutouts/safe-area; modal with IME and back; all seven nav actions; existing v21 notes/tasks content; timer play/pause/resume; reduced motion; offline cold launch. Record actual screenshots, device model, Android version, WebView version, test HEAD SHA, failure reproduction and observed `scrollWidth`. No APK, Play build, data migration, merge or release is authorized by this isolated lane.

## Risks and release blockers

- Lane 07 CSS is a branch dependency. Without it, token fallbacks allow legible output but do **not** count as integrated design acceptance.
- Original `index.html` may have viewport `user-scalable=no`; true accessibility review requires lane 00 to reconsider zoom policy rather than claiming compliant text scaling from CSS alone.
- Legacy fixed modal layout, third-party fonts from Google, existing inline styles and other lane content can override CSS. Verify computed styles after merging all relevant PRs.
- **Human reviewer** approves integrations. Do not merge into `main` or publish Play; do not touch storage keys, signing, media licenses or `ZEN21::`.
