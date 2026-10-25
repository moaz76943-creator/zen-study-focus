# DEEP-FOCUS-07 — White Premium v22: design specification and integration handoff

**Branch:** `feat/deep-focus-07-white-premium-ux-20261019`  
**Baseline:** `527d85978c8dfd3a3eab8aa8cfae199c4d541c8b` (PR #1 recovery branch, 2026-10-19)  
**Owner:** lane 07; **integrator:** lane 00. No modifications to `index.html`, `white_2100.css`, `app.js` or shared dictionaries.

## 1. Product principles
- Premium white/pearl surfaces. Ink, cyan/blue focus accents and restrained low-cost shadows; no large glass blur or continuous animation.
- The **actual v21 timer remains the primary interactive control**, not a cosmetic new timer. Study, workout, reading and work retain their existing engines.
- Shared components: `.df22-card`, `.df22-card-title`, `.df22-button`, `.df22-icon-button`, `.df22-input`, `.df22-form-field`, `.df22-empty`, `.df22-modal`, `.df22-bottom-nav`, `.df22-chart`, `.df22-timer-zone`. Use native `button`, `input`, `label`, `dialog` or appropriately attributed modal containers.
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24px. Radii 10 / 14 / 18 / 24px. Touch targets >= 44 CSS px for primary controls. Typography from 16px body, growing titles and tabular, LTR-isolated timer digits. Never shrink running text to force fit.
- Do not insert demo analytics or mutate `cfg`, `notesList`, `tasksList`, session history, backup format, package identifier or localStorage.

## 2. Files
| File | Responsibility |
|---|---|
| `android/app/src/main/assets/web/design_tokens_v22.css` | Namespaced theme tokens; literal auditable colors |
| `android/app/src/main/assets/web/ui_components_v22.css` | Opt-in legacy adapters + reusable control styles |
| `android/app/src/main/assets/web/locale_premium_v22.js` | 22 additional localized UI keys × 20 app languages, with a safe opt-in DOM hook |
| `tests/design_quality/test_design_v22.cjs` | Pure Node test suite; contrast math, translation coverage, RTL, WebView CSS guardrails |
| `tests/design_quality/INTEGRATION.md` | This contract |

## 3. Lane 00 integration (ONLY lane 00 edits shared files)
In `index.html`, load the files in this order **after the existing white_2100.css**:

```html
<link rel="stylesheet" href="white_2100.css">
<link rel="stylesheet" href="design_tokens_v22.css">
<link rel="stylesheet" href="ui_components_v22.css">
```

Enable in the existing body (retain all dynamically applied `timer-home`, `deep-lockdown` etc. classes):

```html
<body class="df-v22">
```

Near the existing locale scripts, place `locale_premium_v22.js` **before consumers**, without replacing the shared `DICT`:

```html
<script src="locale_rows.js"></script>
<script src="locale_extras.js"></script>
<script src="locale_premium_v22.js"></script>
```

Add `data-df22-i18n="newTask"`, `data-df22-placeholder="search"` or `data-df22-aria-label="timerLabel"` only to relevant **new/updated** controls. After the active language is established and whenever the user switches languages, call `DF22Locale.apply(document, activeLanguageCode)`. Use the application's actual current locale variable; do not invent a parallel preference store. The function writes `textContent`, `placeholder`, `aria-label` only; no `innerHTML`. `DF22Locale.t(lang,key)` returns a string for supported keys, and `null` for an unknown key. `DF22Locale.dir(lang)` reports RTL for ar/fa/ur; the application owns the actual `html.dir` setting. Use `dir="auto"` on user-editable free text and `<bdi>` around mixed-direction identifiers/titles.

### Timer beside quick training
The existing `#focusHeroCard` and `#quickTrainingCard` are not adjacent siblings, so **CSS alone cannot safely position them side by side without changing other content order**. Lane 00 may introduce a single `<div class="df22-timer-zone">` with these two existing sections as its children, preserving all their IDs, handlers, and state. Keep `#focusHeroCard` first in DOM/focus order. The CSS stacks them on phones narrower than 440px and places them side by side on larger viewports, provided the actual content fits. On narrow screens leave the timer on top rather than squeezing it. Lane 00 must reconcile `tests/test_home_dashboard.py` DOM-order assertions if markup is moved; the v22 track intentionally does not change that test.

### Navigation and dialogs
For any refactored 7-tab navigation, apply `df22-bottom-nav` to the existing `nav` (do not add another nav). It uses bounded horizontal scrolling on narrow screens rather than clipping labels. Preserve the native tab click handlers, label every action, update `aria-current="page"` and ensure the active tab is reachable with keyboard and TalkBack. Modal owners must manage `role="dialog"`, `aria-modal`, `aria-labelledby`, focus entry/return, Escape dismissal and backdrop policy. CSS cannot implement modal focus trapping.

## 4. Contrast audit (token pairs)
Test computes relative luminance with sRGB linearization per WCAG, comparing normal text at **4.5:1** and focus indication at **3:1**. Pairs: ink/surface, muted/surface, primary/surface, success/surface, danger/surface, on-primary/primary-fill, ink/page, focus/surface. This is a token audit, **not a claim that every inherited v21 icon, image or final runtime combination is compliant**. Lane 00 should use browser/Android WebView computed styles to check all actual components.

## 5. Test and release gates
```bash
node --check android/app/src/main/assets/web/locale_premium_v22.js
node --test tests/design_quality/test_design_v22.cjs
node tests/validate_locales.cjs
node tests/smoke_app.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Run the existing Android build gate only after lane 00 integration. Device QA matrix: widths 320, 360, 393, 440, 480px; Arabic/Urdu/Persian RTL plus English/German/Chinese/Japanese; dynamic font scaling 100%/150%/200%; landscape; long titles and localized labels; no sideways page scrolling or truncated dialogs; TalkBack headings/button names/focus order; hardware keyboard/D-pad traversal and visible focus; reduced-motion system option; charts at zero/large values; offline launch and process recreation. Measure actual `scrollWidth <= clientWidth` for viewport-level elements and check elements visually, not via CSS-string assertions alone.

**Integration status:** These assets are deliberately not loaded on the v21 runtime until lane 00 adopts them. Their presence does not imply current app screens have been visually upgraded, nor that APK/device QA has passed. This track must not merge itself into PR #1.
