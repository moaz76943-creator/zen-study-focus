# TRACK 07-06 — White Premium narrow-screen nav text scaling

BASE_SHA: `a5d557813c4fa9bd0209e1a12d563e84a7064d56` (PR #73)
TRACK_ID: 07-06
RELEASE_APPROVED=NO

## Confirmed source-level RED
Optional `white_premium_recovery10.css` set mobile tab labels to
`clamp(.62rem, 2.15vw, .75rem)` and to `.6rem` at widths <=340px.
It also reserved a fixed `95px` bottom inset, which does not grow for
200%-scaled labels. The 7-tab control could cover content when its height
expands. This is a source-level risk; viewport screenshots/device observation
have NOT confirmed an actual 320px clipping failure.

## Smallest isolated fix
- Nav labels now use `clamp(.7rem, 2.15vw, .85rem)`, with a `.7rem` narrow override.
- Body reserves `max(95px,7rem)` plus safe-area bottom space, proportional
  to root font scaling.
- Keep existing 7 real controls; Timer fourth, Training fifth, contained nav
  scrolling, 44px touch minimum, direction-specific centering and all handlers.
- The stylesheet is already linked by the inherited `index.html` and its `df-recovery10` class is already added by inherited `integration_v22.js` during bootstrap. This PR makes no new activation/binding change; avoid duplicating that existing integration.
- No `app.js`, `index.html`, global production CSS, data, IDs or Meditation section.

## Tests and gates
- RED: source checks failed all three target predicates on PR #73 baseline.
- GREEN: post-patch source checks passed those three and seven-nav preservation.
- Node regression: `node --test tests/white_premium_qa/mobile_nav_scaling.test.cjs`.
- Existing tests: `node --test tests/white_premium_qa/*.test.cjs`.
- Browser geometry: `python3 tests/white_premium_qa/viewport_matrix.py`.
- Android WebView, large fonts and TalkBack screenshots: NOT_TESTED.
- Existing `viewport_matrix.py` covers 320/360/393/430 × RTL/LTR × 100/150/200%.
  Do not claim it passed without a browser execution on exact integrated SHA.

## HANDOFF_TO_07_09
Only already-integrated opt-in CSS, its regression and this report are changed. Current PR #79
does not claim reviewed 07-06 integration and P0 native fault tests remain open.
Integrator must compare CSS order/specificity and real Android screen geometry,
ensure timer visible first and nav 7 taps work, then apply only after durability
gate. No branch/main auto merge.
