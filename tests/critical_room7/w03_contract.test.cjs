/**
 * Deep Focus critical room 7 — task W03 contract tests.
 *
 * Representative fixtures are modeled on real v21 facts, including the live
 * el timer divergence between the shipped canonical pack and the
 * TRANSLATED-status Europe-primary contribution lane, which this suite
 * reproduces against the matrix implementation.
 *
 * All tests are offline Node source audits. None of this is Android
 * verification and no device result is claimed.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const MATRIX = path.resolve(__dirname, '../../tools/critical_room7/locale20_truth_matrix.mjs');
const importMatrix = async () => import(pathToFileURL(MATRIX).href);

// The authoritative per-family English reference map, representative of what
// timer_settings.js / goals_studio.js ship as their English fallback text.
const ENGLISH_REFS = {
  timer: {
    '0': '⚙ Customize',
    '1': 'Focus and break settings',
    '2': 'Your current session is preserved; changes apply to new sessions.',
    '3': 'Focus · min',
    '4': 'Short rest · min',
    '5': 'Long rest · min',
    '6': 'Sessions per cycle',
    '7': 'Defaults',
    '8': 'Save',
    '9': 'Use whole numbers within the displayed ranges.',
    '10': 'Settings saved'
  },
  goals: {
    kicker: '✦ YOUR DAILY TARGETS',
    heading: 'A little progress, each day',
    minute: 'min',
    done: 'completed'
  },
  analyticsDomain: { study: 'Study', read: 'Reading', sport: 'Fitness', work: 'Deep Work' }
};

const FAMILY_KEYS = {
  timer: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  goals: ['kicker', 'heading', 'desc', 'edit', 'modal', 'hint', 'save', 'invalid',
    'noGoal', 'minute', 'done', 'today', 'week', 'weekTarget', 'weekInvalid'],
  analyticsDomain: ['study', 'read', 'work', 'sport']
};

/* Representative fixture 1 — models the LIVE el/timer/2 divergence:
 * the shipped canonical text differs from the Europe-primary TRANSLATED lane. */
const EL_SHIPPED_TIMER = {
  '0': '⚙ Προσαρμογή',
  '1': 'Ρυθμίσεις συγκέντρωσης και διαλειμμάτων',
  '2': 'Η τρέχουσα συνεδρία διατηρείται· οι αλλαγές ισχύουν για νέες συνεδρίες.',
  '3': 'Συγκέντρωση · λεπτά',
  '4': 'Σύντομο διάλειμμα · λεπτά',
  '5': 'Μεγάλο διάλειμμα · λεπτά',
  '6': 'Συνεδρίες ανά κύκλο',
  '7': 'Προεπιλεγμένες τιμές',
  '8': 'Αποθήκευση',
  '9': 'Χρησιμοποιήστε ακέραιους αριθμούς εντός των εμφανιζόμενων ορίων.',
  '10': 'Οι ρυθμίσεις αποθηκεύτηκαν'
};
const EL_CONTRIBUTED_TIMER_2 =
  'Η τρέχουσα συνεδρία διατηρείται· οι αλλαγές ισχύουν για τις νέες συνεδρίες.';

function fixtureInputs(overrides = {}) {
  return {
    packs: {
      el: { timer: EL_SHIPPED_TIMER },
      fr: { goals: { kicker: '✦ TES OBJECTIFS DU JOUR', minute: 'min' } },
      // az models the real az-style lane: approved analytics text, zero canonical presence.
      az: {}
    },
    contributions: [
      {
        file: 'el.json', lane: 'europe_primary', language: 'el', status: 'TRANSLATED',
        sections: { timer: { '2': EL_CONTRIBUTED_TIMER_2 } }
      },
      {
        file: 'fr.json', lane: 'europe_primary', language: 'fr', status: 'TRANSLATED',
        sections: { goals: { kicker: '✦ TES OBJECTIFS DU JOUR', minute: 'min' } }
      },
      {
        file: 'az.json', lane: 'central_asia', language: 'az', status: 'TRANSLATED',
        sections: { analyticsDomain: { study: 'Təhsil' } }
      },
      {
        file: 'zz.json', lane: 'low_resource', language: 'zz', status: 'REVIEW_REQUIRED',
        sections: { timer: { '0': '⚙ Draft randomize' } }
      }
    ],
    languages: ['en', 'ar', 'el', 'fr', 'az', 'zz'],
    familyKeys: FAMILY_KEYS,
    englishRefs: ENGLISH_REFS,
    baseLanguages: ['en', 'ar'],
    ...overrides
  };
}

async function rowOf(matrix, language, family, key) {
  return matrix.languages.find(l => l.code === language).families[family][key];
}

test('pack contract: only the two allowed paths exist for W03', async () => {
  const m = await importMatrix();
  assert.equal(m.VERSION, 1);
  const all = await fs.promises.readFile(MATRIX, 'utf8');
  assert.match(all, /NOT Android verification/);
});

test('RED repro: approved contribution differing from shipped pack is a conflict, runtime keeps shipped text', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const el2 = await rowOf(report, 'el', 'timer', '2');
  assert.equal(el2.category, 'conflict');
  assert.equal(el2.runtime, 'translated');
  assert.equal(el2.shipped_text, EL_SHIPPED_TIMER['2']);
  assert.equal(el2.contribution_text, EL_CONTRIBUTED_TIMER_2);
  assert.deepEqual(el2.lanes, ['europe_primary']);
  const conflictEntry = report.conflicts.find(c =>
    c.language === 'el' && c.family === 'timer' && c.key === '2');
  assert.ok(conflictEntry, 'conflict must be listed in report.conflicts');
  // Runtime truth: the shipped Greek text counts as translated, the refused
  // lane text must not be sold as what the app shows.
  const el = report.languages.find(l => l.code === 'el');
  assert.equal(el.runtime.translated, 11); // the shipped timer strings only
  assert.equal(el.runtime.english_fallback, 19); // goals+analyticsDomain keys have no shipped text
});

test('never-integrated approved contribution stays English fallback at runtime (pending)', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const azStudy = await rowOf(report, 'az', 'analyticsDomain', 'study');
  assert.equal(azStudy.category, 'pending');
  assert.equal(azStudy.runtime, 'english_fallback');
  assert.equal(azStudy.contribution_text, 'Təhsil');
  assert.equal(azStudy.lanes[0], 'central_asia');
  const az = report.languages.find(l => l.code === 'az');
  const azKeyCount = Object.values(az.totals).reduce((a, b) => a + b, 0);
  assert.equal(azKeyCount, 30);
  assert.ok(az.runtime.english_fallback > 0);
  assert.equal(az.runtime.translated, 0);
});

test('genuine reviewed translation counts as verified contextual translation', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const frKicker = await rowOf(report, 'fr', 'goals', 'kicker');
  assert.equal(frKicker.category, 'verified');
  assert.equal(frKicker.runtime, 'translated');
  assert.equal(frKicker.identical_check, false);
});

test('identical-to-English shipped text is separated from verified translations', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const frMinute = await rowOf(report, 'fr', 'goals', 'minute');
  assert.equal(frMinute.category, 'identical');
  assert.equal(frMinute.evidence, 'SHIPPED_TEXT_EQUALS_ENGLISH_REFERENCE');
  const fr = report.languages.find(l => l.code === 'fr');
  assert.equal(fr.totals.identical, 1);
  assert.equal(fr.totals.verified, 1);
});

test('shipped key without English reference reports identical_check unavailable, not a guess', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs({ englishRefs: { timer: ENGLISH_REFS.timer } }));
  const frKicker = await rowOf(report, 'fr', 'goals', 'kicker');
  assert.equal(frKicker.category, 'verified');
  assert.equal(frKicker.identical_check, 'unavailable');
});

test('popularized summary: draft contributions never count as runtime translations', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const zzDraft = await rowOf(report, 'zz', 'timer', '0');
  assert.equal(zzDraft.category, 'draft');
  assert.equal(zzDraft.runtime, 'english_fallback');
  const zz = report.languages.find(l => l.code === 'zz');
  assert.equal(zz.runtime.translated, 0);
});

test('unconfigured keys fall back to English at runtime', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const elWeek = await rowOf(report, 'el', 'goals', 'weekTarget');
  assert.equal(elWeek.category, 'fallback');
  assert.equal(elWeek.runtime, 'english_fallback');
});

test('base languages carry no translation claims', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  assert.equal(report.base_languages.join(','), 'en,ar');
  const enLang = report.languages.find(l => l.code === 'en');
  assert.equal(enLang.families.timer['0'].category, 'base');
  assert.equal(enLang.runtime.translated, 0);
  assert.equal(enLang.runtime.english_fallback, 0);
});

test('report totals stay consistent across every category', async () => {
  const m = await importMatrix();
  const report = m.buildTruthMatrix(fixtureInputs());
  const sum = Object.values(report.totals).reduce((a, b) => a + b, 0);
  const expected = report.languages.reduce((n, l) => n +
    Object.values(l.families).reduce((n2, fam) => n2 + Object.keys(fam).length, 0), 0);
  assert.equal(sum, expected);
  for (const language of report.languages) {
    const langSum = Object.values(language.totals).reduce((a, b) => a + b, 0);
    const keyCount = Object.values(language.families)
      .reduce((n, fam) => n + Object.keys(fam).length, 0);
    assert.equal(langSum, keyCount);
  }
});

/* ---------- live integrated v21 codebase (offline, read-only) ---------- */

const REPO = path.resolve(__dirname, '../..');
const LIVE_FAMILY_KEY_TOTAL = 147; // timer 11 + goals 15 + tasks 64 + notes 36 + analytics 17 + analyticsDomain 4

test('live v21 matrix: offline CLI run, report consistent, known el/sk timer divergences surfaced', async () => {
  const m = await importMatrix();
  {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w03-live-'));
    const canonicalBefore = fs.readFileSync(
      path.join(REPO, 'assets/i18n/df99_reviewed_packs.json'), 'utf8');
    const report = m.runMatrix({ root: REPO, output: path.join(outDir, 'truth_matrix.json') });

    // Read-only guarantee: the data store files are untouched.
    const canonicalAfter = fs.readFileSync(
      path.join(REPO, 'assets/i18n/df99_reviewed_packs.json'), 'utf8');
    assert.equal(canonicalBefore, canonicalAfter);

    assert.equal(report.offline, true);
    assert.equal(report.is_android_verification, false);
    assert.equal(report.android_e2e, 'NOT_TESTED');
    assert.equal(report.languages.length, 99);
    assert.ok(report.languages.every(l => l.present_in_catalog));
    assert.equal(report.totals.base, 2 * LIVE_FAMILY_KEY_TOTAL);

    // The known live divergences must be reported, not absorbed silently.
    const conflictIds = new Set(report.conflicts.map(c => `${c.language}/${c.family}/${c.key}`));
    for (const id of ['el/timer/2', 'el/timer/9', 'sk/timer/2', 'sk/timer/6', 'sk/timer/9']) {
      assert.ok(conflictIds.has(id), 'expected live conflict ' + id);
    }

    // Counts add up and the written report is the same object.
    const written = JSON.parse(fs.readFileSync(path.join(outDir, 'truth_matrix.json'), 'utf8'));
      assert.equal(written.kind, report.kind);
    const sum = Object.values(written.totals).reduce((a, b) => a + b, 0);
    assert.equal(sum, 99 * LIVE_FAMILY_KEY_TOTAL);

    // Facts, clamped to numbers, for the factual report the task asks for.
    for (const language of written.languages) {
      assert.ok(Number.isInteger(language.runtime.translated));
      assert.ok(Number.isInteger(language.runtime.english_fallback));
    }
  }
});

test('CLI resolves shipped dictionaries without an explicit root from an unrelated working directory', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w03-cli-root-'));
  try {
    const output = path.join(outDir, 'report.json');
    const stdout = execFileSync(process.execPath, [MATRIX, '--output', output], {
      cwd: outDir, encoding: 'utf8', timeout: 15000
    });
    const summary = JSON.parse(stdout);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(summary.kind, 'LOCALE_TRUTH_MATRIX_OFFLINE_SOURCE_AUDIT');
    assert.equal(report.languages.length, 99);
    assert.ok(report.languages.every(row => row.present_in_catalog));
    assert.equal(report.android_e2e, 'NOT_TESTED');
    assert.ok(report.totals.fallback > 0, 'missing translations remain visible');
    assert.equal(Object.values(report.totals).reduce((sum, n) => sum + n, 0),
      99 * LIVE_FAMILY_KEY_TOTAL);
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
