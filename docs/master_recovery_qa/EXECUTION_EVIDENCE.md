# Recorded initial execution evidence — QA lane 11
Date: 2026-10-19. Source SHA `28b19a1b4c0e51096303e3c8c30384ab40623457`. QA first commit `7bff0e29c7cb18ebfdc0084740867610bf0e9363`.

## Recorded PASS (narrow scope)
1. GitHub Actions [Run #39194321909](https://github.com/moaz76943-creator/zen-study-focus/actions/runs/39194321909), executed on EXACT integration SHA: JS syntax, 20 dictionary shape baseline, existing Node regression suites, Android Debug APK, unsigned AAB, Python regression, artifact upload all concluded success. Signed release skipped.
2. Four isolated JavaScript module checks executed against actual retrieved sources at the same SHA: 
   - Notes create → checklist task extraction → task complete → synthetic **recorded** session → Analytics dedupe (25 minutes, one session): PASS.
   - Invalid/duplicate historical sessions excluded and date-only start time not invented: PASS.
   - Pure mixer rain + ocean simultaneous, 65/35, stop one, dispose both: PASS.
   - Supplementary locale dictionary of exactly 20 and ar/fa/ur RTL, de/en/es LTR: PASS.
   These execute pure source methods in a JavaScript harness; they do **not** simulate an Android end-to-end timer or decode audio.
3. After adding QA tests, JavaScript syntax compilation of `workflow.test.cjs`, `source_contracts.test.cjs`, `media_provenance_gate.test.cjs` and JSON fixture parsing: PASS. **No Node execution of the newly added suite** was available; do not misrepresent this as test pass.

## Recorded FAIL / BLOCKED
- P0 media license gate: **FAIL**. Integration tree bundles **12** `.ogg` files, but existing `docs/MEDIA_LICENSES.md` mentions only **forest.ogg** and **wind.ogg** as sound assets. The other **10** (cafe, earth, fire, leaves, noise, ocean, rain, stream, thunder, winrain) lack individual entries. Even the two listed are not fully attributed with both upstream SHA256 and converted SHA256.
- Suspicious binary alias: `sounds/earth.ogg` and `sounds/noise.ogg` are the **same Git blob SHA `6267d90ab384e818ec1c4c624cbb52a84814a6fd`**, so their bytes are identical. This demands a documented intentional-alias decision or correction, not a renamed fake effect. Git blob hashes are **not** claimed to be SHA256.
- P0 locale conflict: draft PR #12 removes ar/fa/ur UI choices; conflicts with Issue #13. **BLOCKED**.
- Android WebView physical touch, real codec decoding, one-shot end alarm, audio fidelity, 20-locale visual/ASCII SVG, v21 phone backup and restore: **NOT_TESTED**.
- Newly created QA Node suites: **NOT_TESTED** until leader 00 includes/executes them from exact reviewed HEAD.

## Required subsequent execution
`node --test tests/master_recovery_qa/*.test.cjs` followed by existing suites and Android + device protocol. Expect media provenance and duplicate-file gates to **FAIL until corrected**. After fixes record every command, SHA, output, failure and device evidence, then update the 161-row matrix.
