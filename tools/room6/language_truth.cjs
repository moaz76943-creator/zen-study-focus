'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SCHEMA_VERSION = 1;
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_FILES = Object.freeze({
  app: 'android/app/src/main/assets/web/app.js',
  rows: 'android/app/src/main/assets/web/locale_rows.js',
  extras: 'android/app/src/main/assets/web/locale_extras.js',
  premium: 'android/app/src/main/assets/web/locale_premium_v22.js',
  registry: 'android/app/src/main/assets/web/js/global_i18n_registry.js',
  expanded: 'android/app/src/main/assets/web/js/expanded_locales_loader.js'
});
const DICT_CUTOFF_MARKER = 'let todayISO =';
const STATUS_VERIFIED = 'verified';
const STATUS_ENGLISH_IDENTICAL = 'englishIdentical';
const STATUS_FALLBACK = 'fallback';
const STATUS_MISSING = 'missing';
const STATUS_EXCLUDED = 'excluded';
const STATUS_REFERENCE = 'englishBaselineAllLocales';
const CLASSIFICATION_STATUSES = Object.freeze([
  STATUS_VERIFIED,
  STATUS_ENGLISH_IDENTICAL,
  STATUS_FALLBACK,
  STATUS_MISSING,
  STATUS_EXCLUDED
]);
const PASS_STATUSES = Object.freeze([]);
const NON_PASS_STATUSES = Object.freeze([
  STATUS_FALLBACK,
  STATUS_ENGLISH_IDENTICAL,
  STATUS_MISSING,
  STATUS_EXCLUDED
]);

const SELECTED_FOCUS_LAB_LABELS = Object.freeze({
  app: Object.freeze([
    'title', 'sub',
    'navTimer', 'navTasks', 'navCalendar', 'navNotes', 'navSounds', 'navAnalytics',
    'domStudy', 'domSport', 'domRead', 'domWork',
    'modeFocus', 'modeShort', 'modeLong', 'modeCustom',
    'startFocusAchieve', 'btnSave', 'btnCancel', 'calcOutTpl'
  ]),
  premium: Object.freeze([
    'focus', 'shortBreak', 'longBreak', 'quickTraining',
    'start', 'pause', 'resume', 'reset', 'timerLabel'
  ]),
  registry: Object.freeze([
    'app_name',
    'timer_start', 'timer_pause', 'timer_resume', 'timer_reset',
    'today_focus', 'priority_high'
  ])
});

function toSourcePath(root, file) {
  const absolute = path.resolve(root, file);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return absolute.split(path.sep).join('/');
  }
  return relative.split(path.sep).join('/');
}

function readSource(root, file, role) {
  const absolute = path.resolve(root, file);
  let text = '';
  let exists = false;
  try {
    text = fs.readFileSync(absolute, 'utf8');
    exists = true;
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
  }
  return {
    role,
    path: toSourcePath(root, file),
    absolutePath: absolute,
    exists,
    text
  };
}

function freshRequire(file) {
  const absolute = path.resolve(file);
  if (require.cache[absolute]) delete require.cache[absolute];
  return require(absolute);
}

function extractAppDictionaries(source, rowsSource, extrasSource) {
  if (!source.exists) {
    return { source: { path: source.path, exists: false }, dictionaries: null, assembly: 'source_missing' };
  }
  const cutoff = source.text.indexOf(DICT_CUTOFF_MARKER);
  if (cutoff < 0) {
    return { source: { path: source.path, exists: true }, dictionaries: null, assembly: 'cutoff_marker_not_found' };
  }
  const context = { window: {}, document: { addEventListener() {} }, console };
  vm.createContext(context);
  for (const preload of [rowsSource, extrasSource]) {
    if (preload.exists) {
      try {
        vm.runInContext(preload.text, context, { filename: preload.path });
      } catch (error) {
        return {
          source: { path: source.path, exists: true },
          dictionaries: null,
          assembly: 'locale_row_preload_failed',
          evaluationError: String(error.message).slice(0, 200)
        };
      }
    }
  }
  try {
    vm.runInContext(
      source.text.slice(0, cutoff) + '\nthis.__room6LanguageTruthDICT = DICT;',
      context,
      { filename: source.path + ':i18n-init' }
    );
  } catch (error) {
    return {
      source: { path: source.path, exists: true },
      dictionaries: null,
      assembly: 'evaluation_failed',
      evaluationError: String(error.message).slice(0, 200)
    };
  }
  const dictionaries = context.__room6LanguageTruthDICT;
  if (!dictionaries || typeof dictionaries !== 'object') {
    return { source: { path: source.path, exists: true }, dictionaries: null, assembly: 'not_found_after_evaluation' };
  }
  return {
    source: { path: source.path, exists: true },
    rowsIncluded: rowsSource.exists && /ZEN_LOCALE_FIELD_KEYS/.test(rowsSource.text),
    extrasIncluded: extrasSource.exists && /ZEN_LOCALE_EXTRAS/.test(extrasSource.text),
    dictionaries
  };
}

function extractPremium(source) {
  if (!source.exists) {
    return { source: { path: source.path, exists: false }, api: null };
  }
  const context = { window: {} };
  vm.createContext(context);
  try {
    vm.runInContext(source.text, context, { filename: source.path });
  } catch (error) {
    return { source: { path: source.path, exists: true }, api: null, evaluationError: String(error.message).slice(0, 200) };
  }
  const api = context.window.DF22Locale || null;
  return { source: { path: source.path, exists: true }, api };
}

function extractRegistry(source, expandedSource) {
  if (!source.exists) {
    return { source: { path: source.path, exists: false }, registry: null, packs: null, registeredGlobally: null };
  }
  let registry = null;
  try {
    registry = freshRequire(source.absolutePath);
  } catch (error) {
    return { source: { path: source.path, exists: true }, registry: null, packs: null, registeredGlobally: null, evaluationError: String(error.message).slice(0, 200) };
  }
  let packs = null;
  let registeredGlobally = null;
  if (expandedSource && expandedSource.exists) {
    try {
      const expanded = freshRequire(expandedSource.absolutePath);
      packs = expanded.CORE_PACKS && typeof expanded.CORE_PACKS === 'object' ? expanded.CORE_PACKS : null;
      if (typeof expanded.loadAllCorePacks === 'function') {
        registeredGlobally = expanded.loadAllCorePacks(registry);
      }
    } catch (error) {
      packs = null;
      registeredGlobally = null;
    }
  }
  return { source: { path: source.path, exists: true }, registry, packs, registeredGlobally };
}

function normalizeCounts() {
  const counts = {};
  for (const status of CLASSIFICATION_STATUSES) counts[status] = 0;
  return counts;
}

function resolveAppCatalog(dictionaries, selectedKeys, probedLocales) {
  const english = dictionaries && dictionaries.en ? dictionaries.en : null;
  const englishDictionary = {};
  for (const key of selectedKeys) englishDictionary[key] = english ? english[key] : undefined;
  const labels = {};
  for (const key of selectedKeys) {
    const perLocale = {};
    const counts = normalizeCounts();
    const englishValue = english ? english[key] : undefined;
    const baselineExists = typeof englishValue === 'string' && englishValue.trim().length > 0;
    for (const locale of probedLocales) {
      if (locale === 'en') {
        perLocale[locale] = {
          status: STATUS_REFERENCE,
          englishValue: englishValue === undefined ? null : englishValue,
          ownValue: englishValue === undefined ? null : englishValue
        };
        continue;
      }
      const dict = dictionaries ? dictionaries[locale] : null;
      if (!dict || dict === dictionaries.en) {
        counts[baselineExists ? STATUS_FALLBACK : STATUS_MISSING] += 1;
        perLocale[locale] = {
          status: baselineExists ? STATUS_FALLBACK : STATUS_MISSING,
          value: baselineExists ? englishValue : key,
          englishValue: baselineExists ? englishValue : null,
          ownValue: null,
          localizedDictionaryUsed: false
        };
        continue;
      }
      const ownValue = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : undefined;
      if (typeof englishValue !== 'string' || englishValue.trim().length === 0) {
        counts[STATUS_MISSING] += 1;
        perLocale[locale] = {
          status: STATUS_MISSING,
          value: key,
          englishValue: null,
          ownValue: typeof ownValue === 'string' ? ownValue : null,
          localizedDictionaryUsed: true
        };
        continue;
      }
      if (typeof ownValue !== 'string' || ownValue.trim().length === 0) {
        counts[STATUS_FALLBACK] += 1;
        perLocale[locale] = {
          status: STATUS_FALLBACK,
          value: englishValue,
          englishValue,
          ownValue: null,
          localizedDictionaryUsed: true
        };
        continue;
      }
      if (ownValue === englishValue) {
        counts[STATUS_ENGLISH_IDENTICAL] += 1;
        perLocale[locale] = {
          status: STATUS_ENGLISH_IDENTICAL,
          value: ownValue,
          englishValue,
          ownValue,
          localizedDictionaryUsed: true
        };
        continue;
      }
      counts[STATUS_VERIFIED] += 1;
      perLocale[locale] = {
        status: STATUS_VERIFIED,
        value: ownValue,
        englishValue,
        ownValue,
        localizedDictionaryUsed: true
      };
    }
    labels[key] = { english: englishValue === undefined ? null : englishValue, counts, perLocale };
  }
  return {
    baseline: english ? 'app.js const DICT.en' : null,
    localeCount: dictionaries ? Object.keys(dictionaries).length : 0,
    labelCount: selectedKeys.length,
    labels
  };
}

function resolvePremiumCatalog(api, selectedKeys, probedLocales) {
  const translations = api && api.translations ? api.translations : null;
  const englishValueOf = (key) => (translations && translations.en ? translations.en[key] : undefined);
  const labels = {};
  for (const key of selectedKeys) {
    const perLocale = {};
    const counts = normalizeCounts();
    const englishValue = api && api.keys && api.keys.includes(key) ? englishValueOf(key) : englishValueOf(key);
    const baselineExists = typeof englishValue === 'string' && englishValue.trim().length > 0;
    for (const locale of probedLocales) {
      if (locale === 'en') {
        perLocale[locale] = {
          status: STATUS_REFERENCE,
          englishValue: baselineExists ? englishValue : null,
          ownValue: baselineExists ? englishValue : null
        };
        continue;
      }
      const own = translations && translations[locale] ? translations[locale][key] : undefined;
      const ownValue = typeof own === 'string' && own.trim() ? own : null;
      if (!baselineExists) {
        counts[STATUS_MISSING] += 1;
        perLocale[locale] = { status: STATUS_MISSING, value: key, englishValue: null, ownValue, localizedDictionaryUsed: ownValue !== null };
        continue;
      }
      if (ownValue === null) {
        counts[STATUS_FALLBACK] += 1;
        perLocale[locale] = { status: STATUS_FALLBACK, value: englishValue, englishValue, ownValue: null, localizedDictionaryUsed: false };
        continue;
      }
      if (ownValue === englishValue) {
        counts[STATUS_ENGLISH_IDENTICAL] += 1;
        perLocale[locale] = { status: STATUS_ENGLISH_IDENTICAL, value: ownValue, englishValue, ownValue, localizedDictionaryUsed: true };
        continue;
      }
      counts[STATUS_VERIFIED] += 1;
      perLocale[locale] = { status: STATUS_VERIFIED, value: ownValue, englishValue, ownValue, localizedDictionaryUsed: true };
    }
    labels[key] = { english: englishValue === undefined ? null : englishValue, counts, perLocale };
  }
  return {
    baseline: translations ? 'locale_premium_v22.js DF22Locale.translations.en' : null,
    keyCount: api && api.keys ? api.keys.length : 0,
    localeCount: translations ? Object.keys(translations).length : 0,
    labelCount: selectedKeys.length,
    labels
  };
}

function resolveRegistryCatalog(extracted, selectedKeys, probedLocales) {
  const registry = extracted.registry;
  const packs = extracted.packs || {};
  const resolveKey = (key, locale) => {
    if (!registry || typeof registry.translate !== 'function') return key;
    return registry.translate(locale, key);
  };
  const labels = {};
  for (const key of selectedKeys) {
    const perLocale = {};
    const counts = normalizeCounts();
    const englishValue = registry ? resolveKey(key, 'en') : key;
    const baselineExists = registry ? typeof englishValue === 'string' && englishValue !== key && englishValue.trim().length > 0 : false;
    for (const locale of probedLocales) {
      if (locale === 'en') {
        perLocale[locale] = { status: STATUS_REFERENCE, englishValue: baselineExists ? englishValue : null, ownValue: baselineExists ? englishValue : null };
        continue;
      }
      const isExcluded = registry && typeof registry.isExcludedLocale === 'function' && registry.isExcludedLocale(locale);
      if (isExcluded) {
        counts[STATUS_EXCLUDED] += 1;
        perLocale[locale] = { status: STATUS_EXCLUDED, value: null, englishValue: baselineExists ? englishValue : null, ownValue: null, localizedDictionaryUsed: false };
        continue;
      }
      if (!baselineExists) {
        counts[STATUS_MISSING] += 1;
        perLocale[locale] = { status: STATUS_MISSING, value: key, englishValue: null, ownValue: null, localizedDictionaryUsed: false };
        continue;
      }
      const pack = packs[locale] && typeof packs[locale] === 'object' ? packs[locale] : null;
      let ownValue = null;
      if (locale === 'ar') {
        const masterArValue = resolveKey('ar', key);
        ownValue = typeof masterArValue === 'string' && masterArValue.trim() ? masterArValue : null;
      } else if (pack) {
        const packValue = pack[key];
        ownValue = typeof packValue === 'string' && packValue.trim() ? packValue : null;
      }
      if (ownValue !== null && typeof ownValue === 'string') {
        if (ownValue === englishValue) {
          counts[STATUS_ENGLISH_IDENTICAL] += 1;
          perLocale[locale] = { status: STATUS_ENGLISH_IDENTICAL, value: ownValue, englishValue, ownValue, localizedDictionaryUsed: true };
        } else {
          counts[STATUS_VERIFIED] += 1;
          perLocale[locale] = { status: STATUS_VERIFIED, value: ownValue, englishValue, ownValue, localizedDictionaryUsed: true };
        }
        continue;
      }
      counts[STATUS_FALLBACK] += 1;
      perLocale[locale] = {
        status: STATUS_FALLBACK,
        value: englishValue,
        englishValue,
        ownValue: null,
        localizedDictionaryUsed: Boolean(pack),
        localizedCataloguePresent: Boolean(pack)
      };
    }
    labels[key] = { english: baselineExists ? englishValue : null, counts, perLocale };
  }
  return {
    baseline: registry ? 'js/global_i18n_registry.js MASTER_EN + expanded_locales_loader.js CORE_PACKS' : null,
    registeredLocaleCount: packs ? Object.keys(packs).length + 2 : (registry ? 2 : 0),
    loaderStatus: extracted.registeredGlobally ? extracted.registeredGlobally.status : 'LOADER_UNAVAILABLE',
    packLocales: packs ? Object.keys(packs) : [],
    labelCount: selectedKeys.length,
    labels
  };
}

function buildFindings(catalogs, sourcesPresent, appCatalogAvailable, appExtraction) {
  const findings = [];
  for (const catalog of ['app', 'premium', 'registry']) {
    if (!sourcesPresent[catalog]) {
      findings.push({
        code: 'catalog_source_missing',
        severity: 'gap',
        catalog,
        message: 'Catalog source for ' + catalog + ' is absent; no labels were invented for it.'
      });
    }
  }
  if (sourcesPresent.app && !appCatalogAvailable) {
    findings.push({
      code: 'app_dictionary_unavailable',
      severity: 'gap',
      catalog: 'app',
      assembly: appExtraction.assembly || 'unknown',
      evaluationError: appExtraction.evaluationError || null,
      message: 'The app DICT could not be evaluated offline; app-level truth is NOT_TESTED.'
    });
  }
  for (const catalog of Object.keys(catalogs)) {
    const data = catalogs[catalog];
    if (!data || !data.labels) continue;
    for (const [key, entry] of Object.entries(data.labels)) {
      const identical = [];
      const fallbacks = [];
      for (const [locale, record] of Object.entries(entry.perLocale)) {
        if (record.status === STATUS_ENGLISH_IDENTICAL) identical.push(locale);
        if (record.status === STATUS_FALLBACK) fallbacks.push(locale);
      }
      if (identical.length > 0) {
        findings.push({
          code: 'english_identical_labels',
          severity: 'info',
          catalog,
          key,
          locales: identical,
          message: key + ' displays the exact English string in ' + identical.length + ' probed locale(s); NOT pass.'
        });
      }
      if (fallbacks.length > 0) {
        findings.push({
          code: 'english_fallback_labels',
          severity: 'gap',
          catalog,
          key,
          locales: fallbacks,
          message: key + ' falls back to English in ' + fallbacks.length + ' probed locale(s); untranslated, NOT pass.'
        });
      }
    }
  }
  return findings;
}

function summarizeCounts(catalogs) {
  const totals = normalizeCounts();
  const details = {};
  for (const [catalog, data] of Object.entries(catalogs)) {
    const catalogCounts = normalizeCounts();
    if (data && data.labels) {
      for (const entry of Object.values(data.labels)) {
        for (const status of CLASSIFICATION_STATUSES) {
          catalogCounts[status] += entry.counts[status];
          totals[status] += entry.counts[status];
        }
      }
    }
    details[catalog] = catalogCounts;
  }
  return { totals, details };
}

function inspectLanguageTruth(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const files = Object.assign({}, DEFAULT_FILES, options.files || {});
  const selectedLabels = options.selectedLabels || SELECTED_FOCUS_LAB_LABELS;
  const extraLocales = Array.isArray(options.locales) ? options.locales.slice() : [];

  const appSource = readSource(root, files.app, 'app');
  const rowsSource = readSource(root, files.rows, 'rows');
  const extrasSource = readSource(root, files.extras, 'extras');
  const premiumSource = readSource(root, files.premium, 'premium');
  const registrySource = readSource(root, files.registry, 'registry');
  const expandedSource = readSource(root, files.expanded, 'expanded');

  const appExtraction = extractAppDictionaries(appSource, rowsSource, extrasSource);
  const premiumExtraction = extractPremium(premiumSource);
  const registryExtraction = extractRegistry(registrySource, expandedSource);

  const probeSet = new Set(extraLocales.map((code) => String(code).toLowerCase().trim()).filter(Boolean));
  if (appExtraction.dictionaries) {
    for (const code of Object.keys(appExtraction.dictionaries)) probeSet.add(code);
  }
  if (premiumExtraction.api && premiumExtraction.api.translations) {
    for (const code of Object.keys(premiumExtraction.api.translations)) probeSet.add(code);
  }
  const probedLocales = ['en'].concat([...probeSet].sort().filter((code) => code !== 'en'));

  const appCatalog = appExtraction.dictionaries
    ? resolveAppCatalog(appExtraction.dictionaries, selectedLabels.app, probedLocales)
    : null;
  const premiumCatalog = premiumExtraction.api
    ? resolvePremiumCatalog(premiumExtraction.api, selectedLabels.premium, probedLocales)
    : null;
  const registryCatalog = registryExtraction.registry
    ? resolveRegistryCatalog(registryExtraction, selectedLabels.registry, probedLocales)
    : null;

  const catalogs = {};
  if (appCatalog) catalogs.app = appCatalog;
  if (premiumCatalog) catalogs.premium = premiumCatalog;
  if (registryCatalog) catalogs.registry = registryCatalog;
  Object.freeze(catalogs);

  const counts = summarizeCounts(catalogs);
  const sourcesPresent = {
    app: appSource.exists,
    premium: premiumSource.exists,
    registry: registrySource.exists
  };
  const findings = buildFindings(catalogs, sourcesPresent, Boolean(appCatalog), appExtraction);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: 'tools/room6/language_truth.cjs',
    readOnly: true,
    root,
    sources: {
      app: { path: appSource.path, exists: appSource.exists },
      rows: { path: rowsSource.path, exists: rowsSource.exists },
      extras: { path: extrasSource.path, exists: extrasSource.exists },
      premium: { path: premiumSource.path, exists: premiumSource.exists },
      registry: { path: registrySource.path, exists: registrySource.exists },
      expanded: { path: expandedSource.path, exists: expandedSource.exists }
    },
    autoTranslation: 'none',
    selectedLabels: {
      app: selectedLabels.app,
      premium: selectedLabels.premium,
      registry: selectedLabels.registry
    },
    probedLocales,
    catalogs,
    classificationCounts: counts.totals,
    classificationCountsByCatalog: counts.details,
    passStatuses: PASS_STATUSES,
    nonPassStatuses: NON_PASS_STATUSES,
    verdict: {
      acceptance: 'NOT_TESTED',
      autoTranslation: 'none',
      untranslatedPasses: 0,
      untranslatedMarkedPass: false,
      statement:
        'Static truth report only: fallback, English-identical and missing translations are never treated as PASS and no string is auto-translated.'
    },
    findings,
    limitations: [
      'Offline static inspection of shipped catalogues only; browser, WebView and Android runtime rendering are NOT_TESTED.',
      'A locale shown in a language menu is NOT a complete translation; resolved English fallbacks are reported as fallback, never as verified.',
      'English-identical digit or duration tokens (for example 25m) are still reported as englishIdentical; human review decides acceptance.',
      'No application entrypoint, native, persistence, or index.html file is modified; no network access.'
    ]
  };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--locales') {
      options.locales = String(argv[index + 1] === undefined ? '' : argv[index + 1])
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    const match = argument.match(/^--(root|locales)(?:=(.*))?$/);
    if (!match) throw new Error('Unknown argument: ' + argument);
    const value = match[2] !== undefined ? match[2] : argv[index + 1];
    if (value === undefined) throw new Error('Missing value for --' + match[1]);
    if (match[1] === 'locales') {
      options.locales = String(value).split(',').map((item) => item.trim()).filter(Boolean);
    } else {
      options[match[1]] = value;
    }
    if (match[2] === undefined) index += 1;
  }
  return options;
}

function printHelp() {
  process.stdout.write([
    'Usage: node tools/room6/language_truth.cjs [--root DIR] [--locales sw,he]',
    '',
    'Read-only truth report of the actual localized keys of selected user-facing Deep',
    'Focus Lab labels. Classifies verified, englishIdentical, fallback, missing and',
    'excluded per locale. No auto-translation; untranslated is never PASS.'
  ].join('\n') + '\n');
}

function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    printHelp();
    return;
  }
  const report = inspectLanguageTruth(options);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write('language_truth: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  SCHEMA_VERSION,
  DEFAULT_ROOT,
  DEFAULT_FILES,
  DICT_CUTOFF_MARKER,
  SELECTED_FOCUS_LAB_LABELS,
  STATUS_VERIFIED,
  STATUS_ENGLISH_IDENTICAL,
  STATUS_FALLBACK,
  STATUS_MISSING,
  STATUS_EXCLUDED,
  PASS_STATUSES,
  NON_PASS_STATUSES,
  inspectLanguageTruth,
  extractAppDictionaries,
  parseArguments
};
