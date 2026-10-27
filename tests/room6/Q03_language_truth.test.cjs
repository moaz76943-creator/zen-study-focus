'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inspectLanguageTruth,
  DEFAULT_FILES,
  SELECTED_FOCUS_LAB_LABELS,
  STATUS_VERIFIED,
  STATUS_ENGLISH_IDENTICAL,
  STATUS_FALLBACK,
  STATUS_MISSING,
  STATUS_EXCLUDED,
  PASS_STATUSES,
  NON_PASS_STATUSES
} = require('../../tools/room6/language_truth.cjs');

const APP = `const DICT = {
  en: {
    title: 'Focus Lab', sub: 'Study, Workout, Reading & Deep Work',
    navTimer: 'Timer', navTasks: 'Tasks', navCalendar: 'Calendar',
    navNotes: 'Notes', navSounds: 'Nature', navAnalytics: 'Analytics',
    domStudy: 'Study', domSport: 'Workout', domRead: 'Reading', domWork: 'Deep Work',
    modeFocus: '25m', modeShort: '5m', modeLong: '15m', modeCustom: 'Custom',
    startFocusAchieve: 'Plan • Execute • Achieve', btnSave: 'Save & Apply', btnCancel: 'Cancel',
    calcOutTpl: 'At this pace you finish your target in {d} days!',
    sounds: { ocean: 'Ocean Waves', rain: 'Soft Forest Rain' }
  },
  ar: {
    title: 'مختبر التركيز', sub: 'دراسة، رياضة، قراءة وعمل عميق',
    navTimer: 'المؤقت', navTasks: 'المهام', navCalendar: 'التقويم',
    navNotes: 'الملاحظات', navSounds: 'الطبيعة', navAnalytics: 'التحليلات',
    domStudy: 'دراسة', domSport: 'رياضة', domRead: 'قراءة', domWork: 'عمل عميق',
    modeFocus: '25د', modeShort: '5د', modeLong: '15د',
    startFocusAchieve: 'خطط • نفذ • أنجز', btnSave: 'حفظ وتطبيق', btnCancel: 'إلغاء',
    calcOutTpl: 'بهذا المعدل ستنجز هدفك خلال {d} أيام!',
    sounds: { ocean: 'أمواج المحيط', rain: 'مطر الغابة الناعم' }
  },
  es: {
    title: 'Focus Lab',
    sub: 'Estudio, Deporte, Lectura y Trabajo Profundo',
    navTimer: 'Reloj', navTasks: 'Tareas', navCalendar: 'Agenda',
    navNotes: 'Notas', navSounds: 'Natura', navAnalytics: 'Análisis',
    domStudy: 'Estudio', domSport: 'Deporte', domRead: 'Lectura',
    modeFocus: '25m', modeShort: '5m', modeLong: '15m', modeCustom: 'Personal',
    startFocusAchieve: 'Planifica • Ejecuta • Logra', btnSave: 'Guardar y Aplicar', btnCancel: 'Cancelar',
    calcOutTpl: 'A este ritmo completarás tu meta en {d} días!',
    sounds: { ocean: 'Olas del Océano', rain: 'Lluvia del Bosque' }
  }
};
const OTHER_LANGS = [
  { c: 'kk', t: 'KK Focus', s: 'KK Sub', nav: ['K1','K2','K3','K4','K5','K6'], dom: ['ka','kb','kc','kd'] },
  { c: 'zz', t: 'ZZ Focus', s: 'ZZ Sub', nav: ['Z1','Z2','Z3','Z4','Z5','Z6'], dom: ['za','zb','zc','zd'] }
];
const EXTRA_NATIVE_LOCALE = { kk: 'en' };
const EXTRA_SOUND_IDS = Object.keys(DICT.en.sounds);
OTHER_LANGS.forEach(item => {
  const keys = window.ZEN_LOCALE_FIELD_KEYS || [];
  const row = window.ZEN_LOCALE_ROWS && window.ZEN_LOCALE_ROWS[item.c];
  const extra = window.ZEN_LOCALE_EXTRAS && window.ZEN_LOCALE_EXTRAS[item.c];
  if (!row || row.length !== keys.length || !extra ||
      extra.sounds.length !== EXTRA_SOUND_IDS.length ||
      extra.tasks.length !== 4 || extra.notes.length !== 3) {
    console.error('Incomplete localization pack', item.c);
    DICT[item.c] = DICT.en;
    return;
  }
  const text = Object.fromEntries(keys.map((k, i) => [k, row[i]]));
  const locale = EXTRA_NATIVE_LOCALE[item.c] || item.c;
  const weekdays = Array.from({length: 7}, (_, d) => {
    return new Intl.DateTimeFormat(locale, {weekday:'short', calendar:'gregory', timeZone:'UTC'}).format(new Date(Date.UTC(2023, 0, 1 + d, 12)));
  });
  const months = Array.from({length: 12}, (_, m) => {
    return new Intl.DateTimeFormat(locale, {month:'long', calendar:'gregory', timeZone:'UTC'}).format(new Date(Date.UTC(2023, m, 1, 12)));
  });
  DICT[item.c] = {
    ...text,
    title: item.t, sub: item.s,
    navTimer: item.nav[0], navTasks: item.nav[1], navCalendar: item.nav[2],
    navNotes: item.nav[3], navSounds: item.nav[4], navAnalytics: item.nav[5],
    domStudy: item.dom[0], domSport: item.dom[1], domRead: item.dom[2], domWork: item.dom[3],
    modeFocus: '25m', modeShort: '5m', modeLong: '15m',
    weekdays, months,
    sounds: Object.fromEntries(EXTRA_SOUND_IDS.map((key,i) => [key, extra.sounds[i]])),
    sampleTasks: extra.tasks,
    sampleNotes: extra.notes.map(([t,b]) => ({t,b}))
  };
});
let todayISO = '2026-01-01';
`;

const ROWS = `window.ZEN_LOCALE_FIELD_KEYS = ["modeCustom"];
window.ZEN_LOCALE_ROWS = { kk: ["مخصص كي"] };
window.ZEN_LOCALE_EXTRAS = {
  kk: {
    sounds: ["موجة كي", "مطر كي"],
    tasks: ["مهمة 1", "مهمة 2", "مهمة 3", "مهمة 4"],
    notes: [["ملاحظة 1", "وصف 1"], ["ملاحظة 2", "وصف 2"], ["ملاحظة 3", "وصف 3"]]
  }
};
`;

const PREMIUM = `(function(global) {
  'use strict';
  const keys = Object.freeze([
    'start','pause','resume','reset','focus','shortBreak','longBreak','quickTraining','timerLabel'
  ]);
  const rows = {
    en: ['Start','Pause','Resume','Reset','Focus','Short break','Long break','Quick training','Focus timer'],
    ar: ['بدء','إيقاف مؤقت','استئناف','إعادة ضبط','تركيز','راحة قصيرة','راحة طويلة','تدريب سريع','مؤقت التركيز'],
    es: ['Iniciar','Pausar','Reanudar','Reiniciar','Concentración','Descanso corto','Descanso largo','Entrenamiento rápido','Temporizador de concentración'],
    fr: ['Démarrer','Pause','Reprendre','Réinitialiser','Concentration','Pause courte','Pause longue','Entraînement rapide','Minuteur de concentration'],
    id: ['Mulai','Jeda','Lanjutkan','Atur ulang','Fokus','Istirahat singkat','Istirahat panjang','Latihan cepat','Pengatur waktu fokus'],
    nl: ['Starten','Pauzeren','Hervatten','Resetten','Focus','Korte pauze','Lange pauze','Snelle training','Focustimer']
  };
  const translations = {};
  for (const [code, values] of Object.entries(rows)) {
    translations[code] = Object.freeze(Object.fromEntries(keys.map((k, i) => [k, values[i]])));
  }
  Object.freeze(translations);
  const rtl = Object.freeze(['ar', 'fa', 'ur']);
  const dir = code => rtl.includes(code) ? 'rtl' : 'ltr';
  const t = (code, key) => {
    if (!keys.includes(key)) return null;
    return (translations[code] || translations.en)[key];
  };
  global.DF22Locale = Object.freeze({ keys, translations, dir, t });
})(typeof window === 'undefined' ? {} : window);
`;

const REGISTRY = `(function (global) {
  'use strict';
  var EXCLUDED_LOCALES = ['he', 'iw'];
  var MASTER_EN = {
    app_name: 'Deep Focus',
    timer_start: 'Start Focus',
    timer_pause: 'Pause',
    timer_resume: 'Resume',
    timer_reset: 'Reset',
    today_focus: "Today's Focus",
    priority_high: 'High Priority'
  };
  var MASTER_AR = {
    app_name: 'التركيز العميق',
    timer_start: 'بدء التركيز',
    timer_pause: 'إيقاف مؤقت',
    timer_resume: 'استئناف',
    timer_reset: 'إعادة ضبط',
    today_focus: 'تركيز اليوم',
    priority_high: 'أولوية عالية'
  };
  var DICTIONARIES = { en: MASTER_EN, ar: MASTER_AR };
  function isExcludedLocale(localeCode) {
    if (!localeCode || typeof localeCode !== 'string') return false;
    var norm = localeCode.toLowerCase().trim().split('-')[0].split('_')[0];
    return EXCLUDED_LOCALES.indexOf(norm) !== -1;
  }
  function registerDictionary(localeCode, translations) {
    if (!localeCode || typeof localeCode !== 'string') return false;
    if (isExcludedLocale(localeCode)) return false;
    var norm = localeCode.toLowerCase().trim().split('-')[0].split('_')[0];
    DICTIONARIES[norm] = Object.assign({}, translations || {});
    return true;
  }
  function translate(localeCode, key) {
    if (!key || typeof key !== 'string') return '';
    var target = (localeCode && !isExcludedLocale(localeCode))
      ? String(localeCode).toLowerCase().trim().split('-')[0].split('_')[0]
      : 'en';
    if (DICTIONARIES[target] && DICTIONARIES[target][key]) return DICTIONARIES[target][key];
    if (MASTER_EN[key]) return MASTER_EN[key];
    if (MASTER_AR[key]) return MASTER_AR[key];
    return key;
  }
  var engine = { isExcludedLocale, registerDictionary, translate };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.GlobalI18nRegistry = engine;
  }
})(typeof window !== 'undefined' ? window : this);
`;

const EXPANDED = `(function (global) {
  'use strict';
  var CORE_PACKS = {
    fr: {
      app_name: 'Concentration Profonde',
      timer_start: 'Démarrer',
      timer_pause: 'Pause',
      timer_resume: 'Reprendre',
      timer_reset: 'Réinitialiser',
      today_focus: 'Objectif du Jour',
      priority_high: 'Haute Priorité'
    },
    id: {
      app_name: 'Fokus Mendalam',
      timer_start: 'Mulai Fokus',
      timer_pause: 'Jeda'
    }
  };
  function loadAllCorePacks(registryInstance) {
    var reg = registryInstance;
    if (!reg || typeof reg.registerDictionary !== 'function') return { loadedCount: 0, status: 'REGISTRY_NOT_FOUND' };
    var count = 0;
    for (var key of Object.keys(CORE_PACKS)) {
      if (reg.registerDictionary(key, CORE_PACKS[key])) count++;
    }
    return { loadedCount: count, status: 'PACKS_LOADED_SUCCESS' };
  }
  var engine = { CORE_PACKS, loadAllCorePacks };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.ExpandedLocalesLoader = engine;
  }
})(typeof window !== 'undefined' ? window : this);
`;

function makeRepo(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room6-q03-'));
  if (options.empty) return { root };
  const web = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'web');
  fs.mkdirSync(path.join(web, 'js'), { recursive: true });
  fs.writeFileSync(path.join(web, 'app.js'), options.app || APP, 'utf8');
  fs.writeFileSync(path.join(web, 'locale_rows.js'), options.rows || ROWS, 'utf8');
  if (options.extras) fs.writeFileSync(path.join(web, 'locale_extras.js'), options.extras, 'utf8');
  fs.writeFileSync(path.join(web, 'locale_premium_v22.js'), options.premium || PREMIUM, 'utf8');
  fs.writeFileSync(path.join(web, 'js', 'global_i18n_registry.js'), options.registry || REGISTRY, 'utf8');
  fs.writeFileSync(path.join(web, 'js', 'expanded_locales_loader.js'), options.expanded || EXPANDED, 'utf8');
  return { root };
}

function snapshot(root) {
  const output = {};
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else output[path.relative(root, full)] = {
        content: fs.readFileSync(full, 'utf8'),
        mtimeMs: fs.statSync(full).mtimeMs
      };
    }
  };
  visit(root);
  return output;
}

const GHOST_SELECTION = Object.freeze({
  app: Object.freeze(['ghostKey']),
  premium: Object.freeze(['ghostKey']),
  registry: Object.freeze(['ghostKey'])
});

test('fixture app labels classify verified, English-identical and fallback per real catalogue state', () => {
  const repo = makeRepo();
  const report = inspectLanguageTruth({ root: repo.root });
  const app = report.catalogs.app;

  assert.deepEqual(report.probedLocales, ['en', 'ar', 'es', 'fr', 'id', 'kk', 'nl', 'zz']);
  assert.equal(app.localeCount, 5);
  assert.equal(app.labels.title.perLocale.ar.status, STATUS_VERIFIED);
  assert.equal(app.labels.title.perLocale.ar.value, 'مختبر التركيز');
  assert.equal(app.labels.title.perLocale.es.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(app.labels.title.perLocale.es.value, 'Focus Lab');
  assert.equal(app.labels.domWork.perLocale.es.status, STATUS_FALLBACK);
  assert.equal(app.labels.domWork.perLocale.es.value, 'Deep Work');
  assert.equal(app.labels.modeCustom.perLocale.ar.status, STATUS_FALLBACK);
  assert.equal(app.labels.modeFocus.perLocale.es.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(app.labels.modeFocus.perLocale.kk.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(app.labels.modeCustom.perLocale.kk.status, STATUS_VERIFIED);
  assert.equal(app.labels.modeCustom.perLocale.kk.ownValue, 'مخصص كي');
  assert.equal(app.labels.title.perLocale.zz.status, STATUS_FALLBACK);
  assert.equal(app.labels.title.counts[STATUS_FALLBACK], 4);
  assert.equal(app.labels.title.counts[STATUS_VERIFIED], 2);
  assert.equal(app.labels.title.counts[STATUS_ENGLISH_IDENTICAL], 1);

  const premium = report.catalogs.premium;
  assert.equal(premium.labels['shortBreak'].perLocale.ar.status, STATUS_VERIFIED);
  assert.equal(premium.labels['shortBreak'].perLocale.es.status, STATUS_VERIFIED);
  assert.equal(premium.labels['shortBreak'].perLocale.kk.status, STATUS_FALLBACK);
  assert.equal(premium.labels.focus.perLocale.nl.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(premium.labels.focus.perLocale.fr.status, STATUS_VERIFIED);
  assert.equal(premium.keyCount, 9);

  const registry = report.catalogs.registry;
  assert.equal(registry.packLocales.includes('fr'), true);
  assert.equal(registry.packLocales.includes('id'), true);
  assert.equal(registry.labels.timer_start.perLocale.ar.status, STATUS_VERIFIED);
  assert.equal(registry.labels.timer_pause.perLocale.fr.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(registry.labels.timer_pause.perLocale.fr.value, 'Pause');
  assert.equal(registry.labels.timer_start.perLocale.fr.status, STATUS_VERIFIED);
  assert.equal(registry.labels.timer_start.perLocale.id.status, STATUS_VERIFIED);
  assert.equal(registry.labels.timer_start.perLocale.es.status, STATUS_FALLBACK);
  assert.equal(report.catalogs.registry.labels['today_focus'].perLocale.kk.status, STATUS_FALLBACK);
  for (const entry of Object.values(report.catalogs.registry.labels)) {
    assert.equal(entry.perLocale.en.status, 'englishBaselineAllLocales');
  }
});

test('excluded and additional requested locales stay honest, never PASS', () => {
  const repo = makeRepo();
  const report = inspectLanguageTruth({ root: repo.root, locales: ['sw', 'he'] });
  assert.equal(report.probedLocales.includes('sw'), true);
  assert.equal(report.probedLocales.includes('he'), true);

  const registry = report.catalogs.registry;
  assert.equal(registry.labels.timer_start.perLocale.sw.status, STATUS_FALLBACK);
  assert.equal(registry.labels.timer_start.perLocale.sw.value, 'Start Focus');
  assert.equal(registry.labels.timer_start.perLocale.he.status, STATUS_EXCLUDED);

  const app = report.catalogs.app;
  assert.equal(app.labels.title.perLocale.sw.status, STATUS_FALLBACK);
  assert.equal(app.labels.title.perLocale.he.status, STATUS_FALLBACK);

  const excludedFinding = report.findings.find((finding) =>
    finding.code === 'english_fallback_labels' && finding.locales.includes('sw'));
  assert.ok(excludedFinding, 'sw fallback finding recorded');
  assert.ok(report.findings.some((finding) => finding.code === 'english_identical_labels'));
  assert.ok(report.verdict.statement.includes('never treated as PASS') || report.verdict.statement.includes('NOT'), report.verdict.statement);
});

test('keys absent from the English baseline are classified missing, not verified and not pass', () => {
  const repo = makeRepo();
  const report = inspectLanguageTruth({ root: repo.root, selectedLabels: GHOST_SELECTION });

  assert.equal(report.catalogs.app.labels.ghostKey.english, null);
  assert.equal(report.catalogs.app.labels.ghostKey.perLocale.ar.status, STATUS_MISSING);
  assert.equal(report.catalogs.app.labels.ghostKey.perLocale.ar.value, 'ghostKey');
  assert.equal(report.catalogs.premium.labels.ghostKey.perLocale.fr.status, STATUS_MISSING);
  assert.equal(report.catalogs.registry.labels.ghostKey.perLocale.ar.status, STATUS_MISSING);
  assert.equal(report.classificationCounts[STATUS_MISSING], 21);
  assert.equal(report.classificationCounts[STATUS_VERIFIED], 0);
});

test('report is read-only, serializable and honest about static limits', () => {
  const repo = makeRepo();
  const before = snapshot(repo.root);
  const report = inspectLanguageTruth({ root: repo.root });
  const after = snapshot(repo.root);

  assert.deepEqual(after, before);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.readOnly, true);
  assert.equal(report.autoTranslation, 'none');
  assert.equal(report.verdict.autoTranslation, 'none');
  assert.equal(report.verdict.untranslatedMarkedPass, false);
  assert.equal(report.verdict.untranslatedPasses, 0);
  assert.equal(report.verdict.acceptance, 'NOT_TESTED');
  assert.deepEqual(report.passStatuses, PASS_STATUSES);
  assert.equal(PASS_STATUSES.length, 0);
  assert.equal(JSON.parse(JSON.stringify(report)).schemaVersion, 1);
  assert.ok(report.limitations.some((item) => /NOT_TESTED/.test(item)));
  assert.ok(report.limitations.some((item) => /fallback/.test(item)));
});

test('classification statuses are exhaustive per locale and never ambiguous', () => {
  const repo = makeRepo();
  const report = inspectLanguageTruth({ root: repo.root });
  const statusesInReport = new Set();
  for (const catalog of Object.values(report.catalogs)) {
    for (const entry of Object.values(catalog.labels)) {
      for (const record of Object.values(entry.perLocale)) {
        statusesInReport.add(record.status);
      }
    }
  }
  assert.ok(statusesInReport.has(STATUS_VERIFIED));
  assert.ok(statusesInReport.has(STATUS_ENGLISH_IDENTICAL));
  assert.ok(statusesInReport.has(STATUS_FALLBACK));
  assert.ok(statusesInReport.has('englishBaselineAllLocales'));
  for (const status of NON_PASS_STATUSES) {
    assert.notEqual(status, 'PASS');
  }
});

test('selected labels cover all three real catalogues of the app', () => {
  assert.equal(typeof SELECTED_FOCUS_LAB_LABELS.app[0], 'string');
  assert.equal(SELECTED_FOCUS_LAB_LABELS.premium.length, 9);
  assert.equal(SELECTED_FOCUS_LAB_LABELS.registry.length, 7);
});

test('missing catalog sources are reported honestly instead of fabricating labels', () => {
  const repo = makeRepo({ empty: true });
  const report = inspectLanguageTruth({ root: repo.root });

  assert.equal(report.sources.app.exists, false);
  assert.equal(report.sources.premium.exists, false);
  assert.equal(report.sources.registry.exists, false);
  assert.deepEqual(Object.keys(report.catalogs), []);
  assert.ok(report.findings.some((finding) => finding.code === 'catalog_source_missing' && finding.catalog === 'app'));
  assert.ok(report.findings.some((finding) => finding.code === 'catalog_source_missing' && finding.catalog === 'registry'));
  assert.equal(report.classificationCounts[STATUS_VERIFIED], 0);
  assert.equal(report.verdict.acceptance, 'NOT_TESTED');
});

test('app cutoff marker failure disables app truth without inventing entries', () => {
  const repo = makeRepo({ app: 'const DICT = { en: { title: "T" } };\n' });
  const report = inspectLanguageTruth({ root: repo.root });

  assert.ok(report.findings.some((finding) => finding.code === 'app_dictionary_unavailable'));
  assert.equal(report.catalogs.app, undefined);
  assert.ok(report.catalogs.premium);
  assert.ok(report.catalogs.registry);
});

test('CLI emits the same structured JSON truth report', () => {
  const repo = makeRepo();
  const tool = path.resolve(__dirname, '../../tools/room6/language_truth.cjs');
  const result = spawnSync(process.execPath, [tool, '--root', repo.root, '--locales', 'he'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.autoTranslation, 'none');
  assert.deepEqual(report.selectedLabels, SELECTED_FOCUS_LAB_LABELS);
  assert.ok(report.probedLocales.includes('he'));
  assert.ok(report.findings.some((finding) => finding.locales && finding.locales.includes('he')));
});

test('real integrated web asset, when present, matches the actual localized-key facts', (t) => {
  const root = path.resolve(__dirname, '..', '..');
  if (!fs.existsSync(path.join(root, DEFAULT_FILES.app))) {
    t.skip('integrated web asset is not present in this worktree');
    return;
  }
  const report = inspectLanguageTruth({ root, locales: ['sw', 'he'] });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.readOnly, true);
  for (const source of ['app', 'rows', 'extras', 'premium', 'registry', 'expanded']) {
    assert.equal(report.sources[source].exists, true, source);
  }
  assert.equal(report.catalogs.app.localeCount, 20);
  assert.equal(report.probedLocales.length, 22);
  assert.equal(report.probedLocales[0], 'en');
  assert.ok(report.probedLocales.includes('ar'));
  assert.ok(report.probedLocales.includes('sw') && report.probedLocales.includes('he'));

  const app = report.catalogs.app;
  assert.equal(app.labels.navTimer.perLocale.ar.status, STATUS_VERIFIED);
  assert.equal(app.labels.navTimer.perLocale.ar.value, 'المؤقت');
  assert.equal(app.labels.title.perLocale.fr.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(app.labels.modeFocus.perLocale.fr.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(app.labels.title.perLocale.sw.status, STATUS_FALLBACK);
  assert.equal(app.labels.title.perLocale.he.status, STATUS_FALLBACK);

  const premium = report.catalogs.premium;
  assert.equal(premium.labels.focus.perLocale.ar.status, STATUS_VERIFIED);
  assert.equal(premium.labels.focus.perLocale.ar.value, 'تركيز');

  const registry = report.catalogs.registry;
  assert.equal(registry.labels.timer_start.perLocale.ar.status, STATUS_VERIFIED);
  assert.equal(registry.labels.timer_pause.perLocale.fr.status, STATUS_ENGLISH_IDENTICAL);
  assert.equal(registry.labels.timer_start.perLocale.sw.status, STATUS_FALLBACK);
  assert.equal(registry.labels.timer_start.perLocale.sw.value, 'Start Focus');
  assert.equal(registry.labels.timer_start.perLocale.he.status, STATUS_EXCLUDED);

  assert.ok(report.classificationCounts[STATUS_VERIFIED] > 0);
  assert.ok(report.classificationCounts[STATUS_ENGLISH_IDENTICAL] > 0);
  assert.ok(report.classificationCounts[STATUS_FALLBACK] > 0);
  assert.equal(report.classificationCounts[STATUS_MISSING], 0);
  assert.equal(report.verdict.untranslatedMarkedPass, false);
  assert.equal(report.verdict.acceptance, 'NOT_TESTED');
  assert.ok(report.findings.some((finding) => finding.code === 'english_identical_labels'));
  assert.ok(report.findings.some((finding) => finding.code === 'english_fallback_labels'));
});
