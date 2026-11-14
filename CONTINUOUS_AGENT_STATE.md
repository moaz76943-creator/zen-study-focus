# CONTINUOUS_AGENT_STATE — Deep Focus Sovereign Status

- **Current Version:** `v664.0.0` (`VERSION_CODE=41384`)
- **Canonical Branch:** `integration/master-qa-verified-v21` (mirrored to `main`)
- **Known Failing Local Tests:** `0` (matches `tests/KNOWN_FAILING.txt`)
- **Language Policy:** Strictly 20 approved native languages (`ar, en, de, fr, es, tr, ru, zh, ja, ko, id, ms, hi, ur, fa, pt, it, nl, pl, vi`).
- **Forbidden Language Codes:** `he, iw, syc, ber, zgh, kab, yi, ji, tmh, tzm, shi` (enforced across runtime, catalog, and CI).
- **Numeral Policy:** Universal Unicode `Nd` normalization (`0123456789` across all scripts including Arabic-Indic, Extended Arabic-Indic, Adlam, NKo, Devanagari).
- **Storage Architecture:** Atomic journal-staged writes (`_journal_tmp` -> primary -> `_mirror`) across the 6 `DURABLE_V21_KEYS`.
- **Legacy PR Status:** Historical PRs (`#607`, `#613`, `#614`, `#615`) superseded by direct verified commits `v650.0.0`–`v664.0.0` on `integration/master-qa-verified-v21` and `main`.
