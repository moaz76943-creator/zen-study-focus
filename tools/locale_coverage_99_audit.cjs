#!/usr/bin/env node
'use strict';
// Honest per-language audit of the runtime localization dictionaries for the official 100 languages.
// It counts what is actually loaded (the app.js LANG_CATALOG + DICT, and the whole quick_training.js table),
// never a claim of full app translation, and it FAILS (exit 1) on a real defect: an excluded language
// (he/iw/yi) in any dictionary, a Hebrew-script string in the shipped quick-training table, a malformed
// quick-training row, or an official language the runtime catalog cannot resolve.
//   node tools/locale_coverage_99_audit.cjs [--json]
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const web = path.join(root, 'android/app/src/main/assets/web');
const read = (p) => fs.readFileSync(path.join(web, p), 'utf8');

const HEBREW = /[\u0590-\u05FF]/;
const EXCLUDED = ['he', 'iw', 'yi', 'heb'];
const BAD_DIGITS = /[٠-٩۰-۹०-९০-৯૦-૯௦-௯౦-౯೦-೯൦-൯๐-๙໐-໙၀-၉០-៩༠-༩]/;
const QUICK_CELLS = 36;

const reg = JSON.parse(fs.readFileSync(path.join(root, 'i18n/languages.json'), 'utf8'));
const VARIANTS = reg.variants || {};
const official = reg.languages.map((l) => l.catalogCode || VARIANTS[l.code] || l.code); // 100 app codes
const officialSet = new Set(official);

// app.js / quick_training.js log legacy pack warnings at load time; keep them out of the audit report.
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };

// --- app.js: LANG_CATALOG + DICT ---------------------------------------------------------------------
const app = read('app.js');
const cutoff = app.indexOf('let todayISO =');
if (cutoff < 0) throw new Error('app.js locale initialization moved (marker "let todayISO =" not found)');
const appCtx = {
  window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  console: quiet, setTimeout, clearTimeout
};
vm.createContext(appCtx);
vm.runInContext(app.slice(0, cutoff) + '\nthis.catalog = LANG_CATALOG; this.coreDict = DICT;', appCtx);
const catalog = appCtx.catalog;
const catalogCodes = catalog.map((x) => x.code);
const coreDict = appCtx.coreDict;

// --- quick_training.js: run the WHOLE file so trailing Object.assign() batches are included ------------
const quick = read('quick_training.js');
const quickCtx = {
  window: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
  document: {
    addEventListener() {}, getElementById: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }),
    body: {}, readyState: 'complete'
  },
  console: quiet, setTimeout, clearTimeout
};
vm.createContext(quickCtx);
vm.runInContext(quick + '\nthis.quickDict = QUICK_TRANSLATIONS; this.quickKeys = QUICK_KEYS;', quickCtx);
const quickDict = quickCtx.quickDict;
const quickKeys = quickCtx.quickKeys;

// --- legacy registry ---------------------------------------------------------------------------------
const registrySrc = read('js/global_i18n_registry.js');
const legacy = [...registrySrc.matchAll(/\bcode:\s*"([^"]+)"/g)].map((x) => x[1]);

// --- checks ------------------------------------------------------------------------------------------
const defects = [];
const excludedIn = (obj, label) => Object.keys(obj || {}).filter((k) => EXCLUDED.includes(k)).forEach((k) => defects.push(label + ' carries excluded language ' + k));

const catalogExcluded = catalogCodes.filter((c) => EXCLUDED.includes(c));
if (catalogExcluded.length) defects.push('LANG_CATALOG carries excluded language(s): ' + catalogExcluded.join(','));
excludedIn(quickDict, 'QUICK_TRANSLATIONS');
excludedIn(coreDict, 'DICT');
if (HEBREW.test(quick)) defects.push('quick_training.js contains Hebrew-script text');

const missingFromCatalog = official.filter((c) => !catalogCodes.includes(c));
if (missingFromCatalog.length) defects.push('official languages missing from LANG_CATALOG: ' + missingFromCatalog.join(','));

const nonOfficialQuick = Object.keys(quickDict).filter((c) => !officialSet.has(c));
if (nonOfficialQuick.length) defects.push('QUICK_TRANSLATIONS has non-official rows: ' + nonOfficialQuick.join(','));
const missingQuick = official.filter((c) => !Array.isArray(quickDict[c]));
const invalidQuick = official.filter((c) => Array.isArray(quickDict[c]) && (quickDict[c].length !== QUICK_CELLS || quickDict[c].some((v) => typeof v !== 'string' || !v.trim())));
if (invalidQuick.length) defects.push('QUICK rows malformed: ' + invalidQuick.join(','));
const quickDigitRows = Object.entries(quickDict).filter(([, row]) => Array.isArray(row) && row.some((v) => BAD_DIGITS.test(String(v)))).map(([c]) => c);
if (quickDigitRows.length) defects.push('QUICK rows with non-Western digits: ' + quickDigitRows.join(','));

const missingCore = official.filter((c) => !Object.prototype.hasOwnProperty.call(coreDict, c));
const legacyOnly = legacy.filter((c) => !officialSet.has(c));
const catalogOnly = official.filter((c) => !legacy.includes(c));

const report = {
  catalogLanguages: catalogCodes.length,
  officialLanguages: official.length,
  coreDictionaryLanguages: Object.keys(coreDict).length,
  quickTrainingLanguages: Object.keys(quickDict).length,
  quickKeys: quickKeys.length,
  missingCore,
  missingQuick,
  invalidQuick,
  nonOfficialQuick,
  legacyRegistryLanguages: legacy.length,
  legacyOnly,
  catalogOnly,
  excludedHebrew: !catalogCodes.some((c) => EXCLUDED.includes(c)) && !HEBREW.test(quick),
  defects,
  ok: defects.length === 0
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`CATALOG=${report.catalogLanguages} CORE=${report.coreDictionaryLanguages} QUICK=${report.quickTrainingLanguages} KEYS=${report.quickKeys}`);
  console.log(`QUICK_MISSING=${missingQuick.length} QUICK_INVALID=${invalidQuick.length} QUICK_NON_OFFICIAL=${nonOfficialQuick.length} CORE_MISSING=${missingCore.length}`);
  console.log(`LEGACY_REGISTRY=${report.legacyRegistryLanguages} LEGACY_ONLY=${legacyOnly.join(',')} CATALOG_ONLY=${catalogOnly.join(',')}`);
  if (defects.length) {
    console.error('DEFECTS:');
    for (const d of defects) console.error('  - ' + d);
  } else {
    console.log('OK: no localization defects (catalog, dictionaries and excluded-language policy all clean).');
  }
  console.log('NOTE: listed languages are the loaded dictionaries, not a claim of full app translation.');
}
process.exit(defects.length ? 1 : 0);
