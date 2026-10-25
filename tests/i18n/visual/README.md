# DF-LANE-11 visual evidence and commands

- Static regressions: `node --test tests/i18n/visual/rtl_typography_numerals.test.cjs`
- Real Chromium matrix: `node tests/i18n/visual/browser_matrix.cjs`
- Browser matrix requires a locally installed Playwright + Chromium. No external web fonts or network resources.
- Matrix: 320 / 360 / 393 / 430 px, root text 100% / 200%, RTL ar/fa/ur/ckb/ps/sd/ug, CJK zh/ja/ko, Indic hi/bn, Cyrillic ru, European expansion de.
- Set `DF11_VISUAL_OUT` to choose screenshot output path. `matrix.json` records measured `innerWidth`, `scrollWidth`, direction, off-screen controls and any failures.
- **Important:** Source tests verify invariants, not physical font rendering. The Playwright script is optional and its mere existence does NOT prove screenshots were captured. Android WebView text zoom and TalkBack require device QA.
- `index.html` currently links the main CSS files but does not load `js/numeral_invariant_guard.js` or `js/localization_fallback_guard.js`. Lane 03 owns wiring and must inject its existing durable `saveFortressData` implementation (raw localStorage writes corrupt the v21 storage envelope).
