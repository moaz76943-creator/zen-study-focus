# Architecture in one page

- **Shell:** `MainActivity` hosts one WebView on `file:///android_asset/web/index.html`; network sub-resources are blocked; the `ZenNative` bridge is for bundled assets only.
- **UI:** `index.html` + `app.js` (large legacy file) + feature scripts under `js/` and `modules/`. `storage_write_guard.js` must stay the first script.
- **Data:** localStorage packets `{payload,sig,ts}` with a `_mirror` copy; damaged copies are quarantined (`df_quarantine_*`); a newer schema makes writes read-only. Keys are listed in `docs/STORAGE_KEYS.md`.
- **Languages:** `web/locales/*.json` (20 languages) plus compact rows in `locale_rows.js`; no guessed translations: missing text falls back to English.
- **Audio:** only licensed natural recordings in `web/audio` with `LICENSES.json` digests.
- **Quality gates:** `docs/QUALITY.md`. Ratchets (innerHTML, onclick, budgets) may only go down.
