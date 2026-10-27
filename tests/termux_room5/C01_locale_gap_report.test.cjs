'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const MODULE_PATH = '../../tools/termux_room5/locale_gap_report.mjs';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

test('fallback and identical values are never counted as verified contextual translations', async () => {
  const { buildLocaleGapReport } = await import(MODULE_PATH);
  const baseline = {
    nav: { timer: 'Timer', tasks: 'Tasks', notes: 'Notes' },
    app: { name: 'Deep Focus' }
  };
  const locales = {
    ar: {
      status: 'REVIEW_REQUIRED',
      sections: {
        nav: { timer: 'المؤقت', tasks: '' }
      }
    },
    fr: {
      sections: {
        nav: {
          timer: { text: 'Minuteur', status: 'VERIFIED' },
          tasks: { text: 'Tâches', status: 'TRANSLATED' },
          notes: { text: 'Notes', status: 'VERIFIED' }
        },
        app: { name: { text: 'Concentration profonde', status: 'MACHINE_DRAFT' } }
      }
    }
  };

  const report = buildLocaleGapReport({ baseline, locales, fallbackLocale: 'en' });
  assert.deepEqual(report.locales.map((locale) => locale.code), ['ar', 'fr']);

  const ar = report.locales[0];
  assert.equal(ar.counts.verified, 0);
  assert.equal(ar.counts.review_required, 1);
  assert.equal(ar.counts.fallback, 3);
  assert.deepEqual(ar.keys.verified, []);
  assert.deepEqual(ar.keys.fallback, ['app.name', 'nav.notes', 'nav.tasks']);
  assert.equal(ar.coverage.verified, 0);
  assert.equal(ar.coverage.fallback, 0.75);
  assert.equal(ar.gaps.find((gap) => gap.key === 'nav.tasks').reason, 'empty_value');
  assert.equal(ar.gaps.find((gap) => gap.key === 'nav.notes').reason, 'missing_key');

  const fr = report.locales[1];
  assert.deepEqual(fr.keys.verified, ['nav.timer']);
  assert.deepEqual(fr.keys.translated, ['nav.tasks']);
  assert.deepEqual(fr.keys.identical, ['nav.notes']);
  assert.deepEqual(fr.keys.machine_draft, ['app.name']);
  assert.equal(fr.counts.verified, 1);
  assert.equal(fr.counts.fallback, 0);
  assert.equal(fr.counts.total, 4);
  assert.equal(fr.coverage.verified, 0.25);
  assert.equal(fr.coverage.explicit, 1);
  assert.equal(fr.coverage.fallback, 0);

  const summary = report.summary;
  assert.equal(summary.totals.verified, 1);
  assert.equal(summary.totals.fallback, 3);
  assert.equal(summary.totals.identical, 1);
});

test('a locale with no entries exposes every key as fallback rather than inheriting coverage', async () => {
  const { buildLocaleGapReport } = await import(MODULE_PATH);
  const baseline = { nav: { timer: 'Timer', tasks: 'Tasks' }, app: { name: 'Deep Focus' } };

  const report = buildLocaleGapReport({ baseline, locales: { de: {} } });
  const de = report.locales[0];

  assert.equal(de.code, 'de');
  assert.equal(de.counts.total, 3);
  assert.equal(de.counts.verified, 0);
  assert.equal(de.counts.fallback, 3);
  assert.equal(de.coverage.verified, 0);
  assert.equal(de.coverage.fallback, 1);
  assert.deepEqual(de.keys.fallback, ['app.name', 'nav.tasks', 'nav.timer']);
  assert.deepEqual(de.gaps.map((gap) => gap.reason), ['missing_key', 'missing_key', 'missing_key']);
});

test('prototype-like keys and malformed entries are audited without mutation or pollution', async () => {
  const { buildLocaleGapReport } = await import(MODULE_PATH);
  const baseline = deepFreeze(JSON.parse(
    '{"__proto__":"Base proto","constructor":"Base ctor","prototype":"Base prototype","safe":"Safe"}'
  ));
  const locales = deepFreeze({
    xx: JSON.parse(
      '{"__proto__":{"text":"Tr proto","status":"VERIFIED"},"constructor":"","prototype":42,"safe":"Sûr"}'
    )
  });
  const before = JSON.stringify({ baseline, locales });

  const report = buildLocaleGapReport({ baseline, locales });
  const xx = report.locales[0];

  assert.deepEqual(xx.keys.verified, ['__proto__']);
  assert.deepEqual(xx.keys.fallback, ['constructor']);
  assert.deepEqual(xx.keys.invalid, ['prototype']);
  assert.deepEqual(xx.keys.unspecified, ['safe']);
  assert.equal(xx.counts.verified, 1);
  assert.equal(xx.counts.total, 4);
  assert.equal(JSON.stringify({ baseline, locales }), before);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.getPrototypeOf(report).polluted, undefined);
});

test('reports are deterministic, status matching is explicit, and unknown statuses are not verified', async () => {
  const { buildLocaleGapReport, summarizeLocaleGapReport } = await import(MODULE_PATH);
  const baseline = { b: 'B', a: 'A' };
  const one = buildLocaleGapReport({
    baseline,
    locales: {
      zz: { status: 'APPROVED', sections: { b: 'B!', a: 'A!' } },
      aa: { sections: { b: { text: 'B2', status: 'VERIFIED' }, a: { text: 'A2', status: 'TRANSLATED' } } }
    }
  });
  const two = buildLocaleGapReport({
    baseline: { a: 'A', b: 'B' },
    locales: {
      aa: { sections: { a: { status: 'TRANSLATED', text: 'A2' }, b: { status: 'VERIFIED', text: 'B2' } } },
      zz: { sections: { a: 'A!', b: 'B!' }, status: 'APPROVED' }
    }
  });

  assert.deepEqual(one, two);
  assert.equal(JSON.stringify(one), JSON.stringify(two));
  assert.deepEqual(one.locales.map((locale) => locale.code), ['aa', 'zz']);
  assert.deepEqual(one.locales[1].keys.unspecified, ['a', 'b']);
  assert.equal(one.locales[1].counts.verified, 0);
  assert.deepEqual(summarizeLocaleGapReport(one), one.summary);
  assert.equal(one.summary.totals.locales, 2);
  assert.equal(one.summary.totals.verified, 1);
});

test('invalid inputs fail closed with TypeError instead of producing a misleading report', async () => {
  const { buildLocaleGapReport, flattenDictionary } = await import(MODULE_PATH);

  assert.throws(() => buildLocaleGapReport(), TypeError);
  assert.throws(() => buildLocaleGapReport({ baseline: null, locales: {} }), TypeError);
  assert.throws(() => buildLocaleGapReport({ baseline: {}, locales: [] }), TypeError);
  assert.throws(() => flattenDictionary('not-an-object'), TypeError);
});
