# Quality gates (what stops regressions)

| Gate | Where | What it prevents |
|---|---|---|
| `tools/run_tests.mjs` | CI on every push/PR (`ci_tests.yml`) | any new failing node test (`tests/KNOWN_FAILING.txt` may only shrink) |
| `tests/guardrails.test.cjs` | node tests | tracked secrets/keystores, size budgets, 20-language locale completeness, exported components |
| `tests/ratchets.json` | node tests | risky patterns (`innerHTML=`, `insertAdjacentHTML`, inline `onclick`, `document.write`, `eval`, `console.log`) may only go down; lower the number in the same commit when you reduce one |
| `tests/release_invariants.test.cjs` | node tests | package identity, targetSdk, offline manifest, licensed audio, CSP, UTC-"today" |
| `tools/browser_checks/run.cjs` | nightly + PRs touching web assets (`browser_checks.yml`) | overflow at 320px/large fonts (en/ar/de), corrupted-storage boot, wrong day in other time zones, developer wording in the UI, sound tiles |
| `build_aab.yml` | push to main / tags | unsigned or wrongly signed packages, AAB/APK signature mismatch |

Adding a feature: add its strings to all 20 `locales/*.json`, keep panels responsive at 320px, add or extend a test.
