# DEEP-FOCUS-RECOVERY-13 — Baseline coverage

Source snapshot: PR #25 / 0dd9239bc28978e11f41c1c0f618c9662b291fe2

**This measures explicitly populated source catalog keys only. It is not the percentage of localized visible UI.**

| Language | Dir | analytics | calendar | dialogs | goals | navigation | notes | settings | sounds | tasks | timer | training |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| en | ltr | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| ar | rtl | 47.7% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 76.0% | 100.0% | 100.0% | 100.0% |
| es | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| zh | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| hi | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| fr | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| de | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| ru | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| pt | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| ja | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| id | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| tr | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| ko | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| vi | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| it | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| bn | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| ur | rtl | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| fa | rtl | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| pl | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |
| nl | ltr | 46.6% | 100.0% | 100.0% | 40.0% | 100.0% | 15.8% | 38.9% | 76.0% | 12.9% | 100.0% | 2.7% |

## Incomplete source catalogs

- quick.training (36 keys) — supported: en, ar.
- notes.studio (36 keys) — supported: en, ar.
- notes.editor (49 keys) — supported: en, ar.
- tasks.studio (81 keys) — supported: en, ar.
- goals.studio (15 keys) — supported: en, ar.
- timer.settings (11 keys) — supported: en, ar.
- analytics.recovery.ui (46 keys) — supported: en.
- sounds.alerts (6 keys) — supported: en.
- analytics.studio (1 keys) — supported: en, ar.

## Findings

Missing explicit language/key combinations: 5110.
Independent missing-key proposal records: 281.
Only ar/fa/ur are RTL. Generated UI numbers must stay 0123456789; user-authored text is never normalized.

The additional read-only audit CLI scans HTML/JavaScript literals, flags same-as-English strings and emits independently regenerated JSON and Markdown reports. The baseline does not certify context-appropriate translations.

Human native-speaker review, RTL/LTR actual WebView behavior, and device test remain NOT_TESTED.
