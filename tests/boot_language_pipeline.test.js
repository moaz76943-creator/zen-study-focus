// Regression guard for the boot/language pipeline (found via headless Chromium run).
const fs = require('fs'), path = require('path'), assert = require('assert');
const web = path.join(__dirname, '..', 'android/app/src/main/assets/web');
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(web, 'app.js'), 'utf8');
const idx = n => html.indexOf(`<script src="${n}"></script>`);

// 1. document.getElementById must never be replaced by a never-null stub.
assert(!/safe_dom_proxy_shield/.test(html), 'DOM null-stub shield must not be loaded');
assert(!fs.existsSync(path.join(web, 'modules/core/safe_dom_proxy_shield.js')));

// 2. Locale rows/extras must load before app.js, or 17 locales silently fall back to English.
const appAt = idx('app.js');
assert(appAt > 0, 'app.js tag missing');
['locale_rows.js', 'locale_extras.js'].forEach(f => {
  assert(idx(f) > 0 && idx(f) < appAt, f + ' must load before app.js');
});

// 3. applyLanguage must not call late-defined functions unguarded (boot ReferenceError).
const start = app.indexOf('function applyLanguage(');
const body = app.slice(start, start + 9000);
assert(!/^\s*renderNotesStack\(\);/m.test(body), 'renderNotesStack() must be isolated in try/catch');
assert(/closeModal\('langModal'\)/.test(body));
console.log('✅ PASS: boot/language pipeline guards (shield removed, locale rows loaded, steps isolated)');

// 4. The secondary hot-swap engine must follow the app language instead of defaulting to Arabic,
//    and must never flatten container elements (it wiped the domain tiles' icon/title/duration).
const hot = fs.readFileSync(path.join(web, 'modules/i18n/universal_i18n_hotswap.js'), 'utf8');
assert(/window\.DF_CURRENT_LOCALE/.test(hot), 'hot-swap init must read the app language');
assert(/node\.children\.length > 0/.test(hot), 'hot-swap sweep must skip container nodes');
assert(/hot\.applyLanguage\(baseCode\)/.test(app), 'applyLanguage must sync the hot-swap engine');
console.log('✅ PASS: hot-swap engine follows app language and preserves containers');

// 5. The floating studio pill must not cover the bottom navigation, and its text must follow the UI language.
const pillSrc = fs.readFileSync(path.join(web, 'modules/ui/studio_navigator_drawer.js'), 'utf8');
assert(!/pill\.style\.bottom = "20px"/.test(pillSrc), 'studio pill must sit above the bottom nav');
assert(/Studios/.test(pillSrc), 'studio pill needs a non-Arabic label');
console.log('✅ PASS: studio pill clears the nav and is localisable');
