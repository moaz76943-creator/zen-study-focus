# DF-LANE-01 — Deep Focus localization inventory

Read-only, repeatable Node.js >=18 static inspection. No dependencies, no runtime/app/configuration changes.

## Run

From the repository root:

    node tools/i18n/inventory/index.cjs . tools/i18n/inventory/reports
    node --test tests/i18n/inventory/inventory.test.cjs

Outputs:

- reports/inventory.json — machine-readable keys, source file references and lines, per-language and per-screen coverage, hardcoded candidates, fallback exposure, unused candidates, parse/runtime-analysis limitations.
- reports/inventory.md — human-readable summaries and file/line samples.
- tests/i18n/inventory/baseline_keys.json — 447 keys discovered on the audited source snapshot; the regression test fails if any disappear. Update only after reviewing intentional key removals.

Scans HTML/JS/CJS/JSON and Android XML/Java/Kotlin under the web and native source trees, plus assets/i18n. Binary media and non-runtime backup files are excluded. Reads only; generates reports under this lane's ownership.

## Interpretation rules

- **Catalog presence never certifies language completion.** Locales are reported individually.
- **COVERAGE_BY_SCREEN** measures explicit static dictionary entries for detected keys in a namespace. It does not establish whether a screen actually uses the entry, whether translations are high-quality, or whether fallback was selected at runtime. The same visible label can occur in several namespaces. Metadata and dynamic lookup warnings must be reviewed before release claims.
- **FALLBACK_COUNT** is the sum of missing non-English entries in this static inventory: it means *fallback exposure*. It is not a runtime count of English strings shown on screen.
- **ENGLISH_IDENTICAL_CANDIDATES** lists localized entries identical to available English text, without automatically classifying them as English fallback.
- **UNUSED_TRANSLATIONS** are static candidates only. Dynamic translation keys can produce false positives; do not delete them based on this report.
- **HARDCODED_LABELS** are probable unbound user-facing strings (HTML attributes/elements, DOM assignments, template literals, dialogs and native labels). Some may be intentional or overridden at runtime.
- **NATIVE_ANDROID_GAPS** covers missing default Android resources and detected native UI literal candidates, not actual accessibility coverage proof.
- **UNRESOLVED_DYNAMIC_REFERENCES** and parse issues are blockers to declaring 100% coverage. Manual and instrumented runtime accessibility/UX localization QA remains required.

The checked-in source snapshot covers 173 eligible files, uses a deterministic ordered key inventory and includes all 100 detected catalog locales (Hebrew codes he/iw excluded). No dictionary or UI string is rewritten.

## Handoff to lane 00

Source-only audit. Review changes restricted to tools/i18n/inventory/ and tests/i18n/inventory/. No production code, permissions, v21 keys, or existing translation packs are changed. Run tests before merging. For a subsequent source revision, regenerate both reports and reconcile the locked baseline explicitly.
