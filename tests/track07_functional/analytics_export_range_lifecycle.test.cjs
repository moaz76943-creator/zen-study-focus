'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Studio = require('../../android/app/src/main/assets/web/analytics_studio.js');

function mountWithPendingExport(onExport, locale = 'de') {
  const doc = {createElement(tag) {return {
    tagName: tag.toUpperCase(), children: [], style: {}, attributes: {}, events: {},
    value: '', textContent: '',
    setAttribute(key, value) {this.attributes[key] = value;},
    getAttribute(key) {return this.attributes[key];},
    addEventListener(key, handler) {this.events[key] = handler;},
    appendChild(child) {this.children.push(child);
      if (this.tagName === 'SELECT' && !this.value) this.value = child.value;
      return child;},
    append(...children) {this.children.push(...children);},
    replaceChildren(...children) {this.children = children;},
    remove() {this.removed = true;}
  };}};
  const target = {ownerDocument: doc, appendChild(child) {this.child = child;}};
  const studio = Studio.mount(target, () => ({
    sessionHistory: [{id: 'real-1', date: '2026-10-19', domain: 'study', minutes: 25}],
    tasksList: []
  }), {locale, today: '2026-10-20', startDate: '2026-10-01',
    endDate: '2026-10-20', onExport});
  const filters = target.child.children.find(x => x.className === 'dfa-filters');
  const fields = filters.children.filter(x => x.tagName === 'LABEL')
    .map(label => label.children[0]);
  const button = filters.children.find(x => x.tagName === 'BUTTON');
  return {studio, host:target.child, domain:fields[0], grouping:fields[1], start: fields[2], end: fields[3], button};
}

test('invalid date disables CSV button even before any export', () => {
  let submitted = 0;
  const ui = mountWithPendingExport(() => {submitted++; return {status: 'saved'};});
  ui.start.value = '2030-10-20';
  ui.start.events.change();
  assert.equal(ui.button.disabled, true, 'Invalid dates must not expose an enabled export action');
  ui.button.events.click();
  assert.equal(submitted, 0);
  ui.start.value = '2026-10-18';
  ui.start.events.change();
  assert.equal(ui.button.disabled, false, 'Repairing dates must re-enable the export action');
  ui.studio.destroy();
});

test('late native SAF receipt cannot re-enable export for a newly invalid date range', async () => {
  let finish;
  let submitted = 0;
  const ui = mountWithPendingExport(() => {
    submitted++;
    return new Promise(resolve => {finish = resolve;});
  });
  const pending = ui.button.events.click();
  assert.equal(ui.button.disabled, true, 'Native save is still pending');
  ui.start.value = '2030-10-20';
  ui.start.events.change();
  finish({status: 'saved'});
  await pending;
  assert.equal(submitted, 1);
  assert.equal(ui.button.disabled, true, 'Late saved receipt must not override invalid range');
  ui.start.value = '2026-10-18';
  ui.start.events.change();
  assert.equal(ui.button.disabled, false);
  ui.studio.destroy();
});

test('10,000 genuine focus IDs produce exactly 10,000 CSV rows, not duplicated or sample minutes', () => {
  const Core = require('../../android/app/src/main/assets/web/analytics_core_v21.js');
  const Canonical = require('../../android/app/src/main/assets/web/analytics_recovery_core.js');
  const history = Array.from({length: 10000}, (_, i) => ({
    id: 'recorded-' + i, date: i % 2 ? '2026-10-18' : '2026-10-19',
    minutes: 1, domain: i % 2 ? 'work' : 'study'
  }));
  history.push({...history[0], minutes: 900}, {
    id: 'sample-not-credited', date: '2026-10-19',
    domain: 'study', minutes: 600, isDemo: true
  });
  const snapshot = {sessionHistory: history, tasksList: []};
  const range = {today: '2026-10-20', startDate: '2026-10-18', endDate: '2026-10-20'};
  const report = Core.buildReport(snapshot, range);
  const canonical = Canonical.buildReport(snapshot, range);
  assert.equal(report.totals.sessions, 10000);
  assert.equal(report.totals.minutes, 10000);
  assert.equal(canonical.totals.minutes, 10000, 'Both screen engines must agree on real minutes');
  assert.equal(canonical.totals.sessions, 10000);
  assert.equal(report.quality.duplicates, 1);
  assert.equal(report.quality.samples, 1);
  assert.equal(snapshot.sessionHistory.length, 10002, 'Source history never rewritten');
  const csv = Core.toCSV(report, 'sessions');
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines.length, 10001, 'CSV header plus exactly one row per valid unique session');
  assert.match(lines[0], /"minutes"/);
  const exported = lines.slice(1).reduce((sum, row) => sum + Number(row.split(',')[3].replaceAll('"', '')), 0);
  assert.equal(exported, report.totals.minutes, 'CSV exported duration equals dashboard');
  assert.doesNotMatch(csv, /[\u0660-\u0669\u06f0-\u06f9]/, 'CSV numerals are always 0–9');
});

test('credited local dates remain stable across DST boundaries and leap day', () => {
  const Core = require('../../android/app/src/main/assets/web/analytics_core_v21.js');
  const sessions = [
    {id: 'berlin-dst', date: '2026-03-29', minutes: 60, domain: 'study',
      startedAt: '2026-03-29T01:30:00+01:00', endedAt: '2026-03-29T03:30:00+02:00',
      timeEvidence: 'timer-monotonic-v1'},
    {id: 'leap', date: '2028-02-29', minutes: 15, domain: 'read'}
  ];
  const original = JSON.stringify(sessions);
  const march = Core.buildReport({sessionHistory: sessions}, {
    today: '2026-03-29', startDate: '2026-03-28', endDate: '2026-03-29'
  });
  assert.equal(march.totals.minutes, 60);
  assert.deepEqual(march.sessions.map(x => x.date), ['2026-03-29']);
  assert.equal(march.daily.find(x => x.key === '2026-03-29').minutes, 60);
  const leap = Core.yearHeatmap({sessionHistory: sessions}, 2028, {today: '2028-02-29'});
  assert.equal(leap.length, 366);
  assert.equal(leap.find(x => x.key === '2028-02-29').minutes, 15);
  assert.equal(JSON.stringify(sessions), original, 'Date calculations must not rewrite personal history');
  assert.throws(() => Core.buildReport({sessionHistory: sessions}, {
    today: '2026-03-29', startDate: '2026-03-30', endDate: '2026-03-29'
  }), RangeError);
});

test('all 20 locales use the same validated historical minutes without rewriting session IDs', () => {
  const Locale = require('../../android/app/src/main/assets/web/localization_20_recovery.js');
  assert.equal(Locale.LANGUAGES.length, 20);
  for (const code of Locale.LANGUAGES) {
    const ui = mountWithPendingExport(() => ({status: 'failed'}), code);
    assert.equal(ui.studio.getReport().totals.minutes, 25, code);
    assert.equal(ui.studio.getReport().sessions[0].id, 'real-1', code);
    ui.studio.destroy();
  }
});

test('Studio supplies functioning Today/7-day/30-day/custom and Reset controls in 20 locales', () => {
  const Locale = require('../../android/app/src/main/assets/web/localization_20_recovery.js');
  for (const language of Locale.LANGUAGES) {
    const ui = mountWithPendingExport(() => ({status: 'cancelled'}), language);
    const bar = ui.host.children.find(node => node.className === 'dfa-range-presets');
    assert.ok(bar, language + ' lacks date-range shortcuts');
    const actions = Object.fromEntries(bar.children.map(node => [
      node.getAttribute('data-action'), node
    ]));
    assert.deepEqual(Object.keys(actions), ['today', 'last7', 'last30', 'custom', 'reset'],
      language + ' must provide all five controls in a stable sequence');
    for (const key of Object.keys(actions)) {
      assert.ok(actions[key].textContent, language + '/' + key + ' empty untranslated label');
      assert.equal(actions[key].type, 'button');
      assert.equal(typeof actions[key].events.click, 'function');
    }
    actions.today.events.click();
    assert.equal(ui.start.value, '2026-10-20');
    assert.equal(ui.end.value, '2026-10-20');
    assert.equal(ui.studio.getReport().totals.minutes, 0, language + ' Today filters real sessions');

    actions.last7.events.click();
    assert.equal(ui.start.value, '2026-10-14');
    assert.equal(ui.end.value, '2026-10-20');
    assert.equal(ui.studio.getReport().totals.minutes, 25, language + ' 7-day total');

    actions.last30.events.click();
    assert.equal(ui.start.value, '2026-09-21');
    assert.equal(ui.end.value, '2026-10-20');
    assert.equal(ui.studio.getReport().totals.minutes, 25, language + ' 30-day total');

    ui.domain.value = 'read'; ui.domain.events.change();
    assert.equal(ui.studio.getReport().totals.minutes, 0, language + ' activity filter');
    ui.start.value = '2026-10-19'; ui.start.events.change();
    actions.custom.events.click();
    assert.equal(ui.start.value, '2026-10-19', language + ' Custom must preserve explicit dates');
    assert.equal(ui.end.value, '2026-10-20');

    actions.reset.events.click();
    assert.equal(ui.domain.value, 'all', language + ' Reset clears activity');
    assert.equal(ui.grouping.value, 'daily', language + ' Reset clears grouping');
    assert.equal(ui.start.value, '2026-09-21', language + ' Reset restores 30-day default');
    assert.equal(ui.end.value, '2026-10-20', language + ' Reset restores end');
    assert.equal(ui.studio.getReport().totals.minutes, 25);
    assert.doesNotMatch(bar.children.map(e => e.textContent).join(' '),
      /[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/,language+' Western numerals');
    ui.studio.destroy();
  }
});

test('native saved receipt from an older date/domain filter must not claim the newer report was exported', async () => {
  let finish;
  const ui=mountWithPendingExport(()=>new Promise(resolve=>{finish=resolve;}),'de');
  const status=ui.host.children.find(e=>e.attributes?.role==='status');
  const first=ui.button.events.click();
  assert.equal(ui.button.disabled,true);
  ui.domain.value='read';
  ui.domain.events.change();
  assert.equal(ui.studio.getReport().totals.minutes,0);
  finish({status:'saved'});
  await first;
  assert.doesNotMatch(status.textContent,/✓/,
    'Historical CSV receipt must not announce success for the currently filtered report');
  assert.equal(ui.button.disabled,false,'Valid new range can export again');
  ui.studio.destroy();
});
