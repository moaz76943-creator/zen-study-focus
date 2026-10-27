'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_PATH = '../../tools/termux_room5/mobile_a11y_lint.mjs';
const MODULE_FILE = path.join(__dirname, MODULE_PATH);

function byId(report, id) {
  return report.elements.find((element) => element.id === id);
}

test('accessible labels and 44px touch targets produce a clean PASS', async () => {
  const { lintHtml } = await import(MODULE_PATH);
  const html = `<!doctype html>
<html>
<head>
  <style>.ignored{width:1px;height:1px}</style>
  <script>const fake = "<button>fake</button>";</script>
</head>
<body>
  <button id="save" style="width:44px;height:44px">Save</button>
  <label for="email">Email</label>
  <input id="email" type="email" style="width:240px;height:44px">
  <a id="home" href="/home" aria-label="Home" style="width:48px;height:48px"><svg viewBox="0 0 1 1"></svg></a>
  <label>Remember <input id="remember" type="checkbox" style="width:44px;height:44px"></label>
  <button id="close" aria-labelledby="close-label" style="width:44px;height:44px"><span id="close-label">Close</span></button>
  <button id="icon" style="width:44px;height:44px"><img src="x.png" alt="Settings"></button>
  <input id="submit" type="submit" style="width:80px;height:44px">
</body>
</html>`;

  const report = lintHtml(html);
  assert.equal(report.status, 'PASS');
  assert.equal(report.ok, true);
  assert.deepEqual(report.findings, []);
  assert.equal(report.counts.errors, 0);
  assert.equal(report.counts.warnings, 0);
  assert.equal(report.counts.interactive, 7);
  assert.equal(report.counts.labeled, 7);
  assert.equal(report.counts.unlabeled, 0);
  assert.equal(byId(report, 'close').name, 'Close');
  assert.equal(byId(report, 'icon').name, 'Settings');
  assert.equal(byId(report, 'submit').name, 'Submit');
});

test('buttons, links and form controls without an accessible name fail closed', async () => {
  const { lintHtml, RULES } = await import(MODULE_PATH);
  const html = `
    <button id="empty" style="width:44px;height:44px"><svg width="24" height="24"></svg></button>
    <input id="search" type="search" placeholder="Search" style="width:200px;height:44px">
    <a id="link" href="/x" style="width:44px;height:44px"></a>
    <button id="spaces" aria-label="   " style="width:44px;height:44px"><span>   </span></button>
    <button id="titled" title="Menu" style="width:44px;height:44px"></button>
    <button id="text" style="width:44px;height:44px">OK</button>`;

  const report = lintHtml(html);
  assert.equal(report.status, 'FAIL');
  assert.equal(report.ok, false);
  assert.equal(report.counts.interactive, 6);
  assert.equal(report.counts.unlabeled, 4);
  assert.equal(report.counts.labeled, 2);
  assert.deepEqual(report.findings.map((finding) => finding.id), ['empty', 'search', 'link', 'spaces']);
  for (const finding of report.findings) {
    assert.equal(finding.rule, RULES.LABEL_MISSING);
    assert.equal(finding.severity, 'error');
  }
  assert.equal(byId(report, 'titled').name, 'Menu');
  assert.equal(byId(report, 'text').name, 'OK');
});

test('explicitly small touch targets are reported with measured dimensions', async () => {
  const { lintHtml, RULES } = await import(MODULE_PATH);
  const html = `
    <button id="tiny" style="width:32px;height:32px">A</button>
    <button id="low" style="width:48px;height:20px">B</button>
    <button id="rem" style="width:2.5rem;height:2.5rem">C</button>
    <button id="ok" style="width:44px;height:44px">D</button>
    <button id="none" aria-label="No size">E</button>
    <input id="box" type="checkbox" aria-label="Box" style="width:16px;height:16px">
    <button id="disabled" disabled style="width:10px;height:10px">F</button>
    <button id="attr" aria-label="Attr" width="48" height="48">G</button>`;

  const report = lintHtml(html);
  assert.equal(report.status, 'FAIL');
  assert.equal(report.counts.interactive, 8);
  assert.equal(report.counts.touchTargetsEvaluated, 7);
  assert.equal(report.counts.touchTargetsFullyMeasured, 6);
  assert.equal(report.counts.touchTargetsUnverified, 1);
  assert.equal(report.counts.touchTargetsTooSmall, 4);

  const small = report.findings.filter((finding) => finding.rule === RULES.TOUCH_TARGET_TOO_SMALL);
  assert.deepEqual(small.map((finding) => finding.id), ['tiny', 'low', 'rem', 'box']);
  for (const finding of small) assert.equal(finding.severity, 'error');
  assert.equal(small[0].width, 32);
  assert.equal(small[0].height, 32);
  assert.equal(small[0].minTouchTargetPx, 44);
  assert.equal(small[2].width, 40);
  assert.equal(small[2].height, 40);

  assert.equal(byId(report, 'ok').touchTarget.status, 'ok');
  assert.equal(byId(report, 'none').touchTarget.status, 'unverified');
  assert.equal(byId(report, 'disabled').touchTarget, null);
  assert.equal(byId(report, 'attr').touchTarget.status, 'ok');
  assert.equal(byId(report, 'attr').touchTarget.width, 48);
  assert.equal(byId(report, 'attr').touchTarget.height, 48);

  const strict = lintHtml('<button style="width:44px;height:44px">OK</button>', { minTouchTargetPx: 48 });
  assert.equal(strict.findings.length, 1);
  assert.equal(strict.findings[0].rule, RULES.TOUCH_TARGET_TOO_SMALL);

  const customBase = lintHtml('<button style="width:2.2rem;height:2.2rem">OK</button>', {
    baseFontSizePx: 20,
    minTouchTargetPx: 44
  });
  assert.deepEqual(customBase.findings, []);
});

test('broken label references warn without hiding a usable text name', async () => {
  const { lintHtml, RULES, summarizeA11yReport } = await import(MODULE_PATH);
  const html = `
    <label for="ghost">Ghost</label>
    <input id="name" type="text" aria-label="Name" style="width:200px;height:44px">
    <button id="broken" aria-labelledby="missing" style="width:44px;height:44px">Visible</button>`;

  const report = lintHtml(html);
  assert.equal(report.status, 'WARN');
  assert.equal(report.ok, true);
  assert.equal(report.counts.errors, 0);
  assert.equal(report.counts.warnings, 2);
  assert.deepEqual(report.findings.map((finding) => finding.rule), [
    RULES.LABEL_FOR_MISSING,
    RULES.ARIA_LABELLEDBY_MISSING
  ]);
  for (const finding of report.findings) assert.equal(finding.severity, 'warning');
  assert.equal(byId(report, 'broken').name, 'Visible');
  assert.deepEqual(summarizeA11yReport(report), report.summary);

  const failed = lintHtml('<button id="still" aria-labelledby="missing" style="width:44px;height:44px"></button>');
  assert.equal(failed.status, 'FAIL');
  assert.ok(failed.findings.some((finding) => finding.rule === RULES.LABEL_MISSING));
  assert.ok(failed.findings.some((finding) => finding.rule === RULES.ARIA_LABELLEDBY_MISSING));
});

test('comments and script text never become targets and prototype-like attributes stay inert', async () => {
  const { lintHtml } = await import(MODULE_PATH);
  const html = `<!-- <button>comment</button> -->
    <script>const fake = "<button>script</button>";</script>
    <button id="safe" aria-label="Safe" style="width:44px;height:44px">OK</button>
    <button __proto__="polluted" id="proto" aria-label="Proto" style="width:44px;height:44px">P</button>`;
  const before = html;

  const one = lintHtml(html);
  const two = lintHtml(html);
  assert.deepEqual(one, two);
  assert.equal(JSON.stringify(one), JSON.stringify(two));
  assert.equal(one.status, 'PASS');
  assert.equal(one.counts.interactive, 2);
  assert.deepEqual(one.elements.map((element) => element.id), ['safe', 'proto']);
  assert.equal(html, before);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.getPrototypeOf(one).polluted, undefined);
});

test('invalid inputs and options fail closed with TypeError', async () => {
  const { lintHtml, formatA11yReport, summarizeA11yReport } = await import(MODULE_PATH);

  assert.throws(() => lintHtml(), TypeError);
  assert.throws(() => lintHtml(null), TypeError);
  assert.throws(() => lintHtml(42), TypeError);
  assert.throws(() => lintHtml('<p></p>', null), TypeError);
  assert.throws(() => lintHtml('', []), TypeError);
  assert.throws(() => lintHtml('', { minTouchTargetPx: '44' }), TypeError);
  assert.throws(() => lintHtml('', { minTouchTargetPx: 0 }), TypeError);
  assert.throws(() => lintHtml('', { baseFontSizePx: NaN }), TypeError);
  assert.throws(() => lintHtml('', { checkLabels: 'yes' }), TypeError);
  assert.throws(() => lintHtml('', { checkTouchTargets: 1 }), TypeError);
  assert.throws(() => formatA11yReport(null), TypeError);
  assert.throws(() => summarizeA11yReport(null), TypeError);

  const empty = lintHtml('');
  assert.equal(empty.status, 'PASS');
  assert.equal(empty.ok, true);
  assert.equal(empty.counts.elements, 0);
  assert.equal(empty.counts.interactive, 0);
  assert.deepEqual(empty.findings, []);
});

test('module is standalone ESM with no networking, storage, clock or dependency side effects', async () => {
  const ns = await import(MODULE_PATH);

  assert.equal(ns.VERSION, 1);
  assert.equal(ns.DEFAULT_MIN_TOUCH_TARGET_PX, 44);
  assert.equal(ns.DEFAULT_BASE_FONT_SIZE_PX, 16);
  assert.equal(Object.isFrozen(ns.DEFAULT_OPTIONS), true);
  assert.equal(Object.isFrozen(ns.RULES), true);
  assert.equal(Object.isFrozen(ns.SEVERITIES), true);
  assert.deepEqual(Object.keys(ns).sort(), [
    'DEFAULT_BASE_FONT_SIZE_PX',
    'DEFAULT_MIN_TOUCH_TARGET_PX',
    'DEFAULT_OPTIONS',
    'RULES',
    'SEVERITIES',
    'VERSION',
    'formatA11yReport',
    'lintHtml',
    'summarizeA11yReport'
  ]);

  const source = fs.readFileSync(MODULE_FILE, 'utf8');
  assert.ok(/^export\s+/m.test(source), 'ESM exports required');
  assert.ok(!/\brequire\s*\(/.test(source), 'no CommonJS require');
  assert.ok(!/^\s*import\s+/m.test(source), 'no imports or external dependencies');
  assert.ok(!/XMLHttpRequest|WebSocket|\bfetch\s*\(/.test(source), 'no networking');
  assert.ok(!/localStorage|sessionStorage|indexedDB/.test(source), 'no persistence');
  assert.ok(!/Date\.now|Math\.random|setTimeout|setInterval/.test(source), 'no clock or scheduling');
  assert.ok(!/node:fs|node:https|node:http|node:net|node:crypto/.test(source), 'no Node runtime modules');

  const { lintHtml, formatA11yReport } = ns;
  const report = lintHtml('<button id="x" style="width:10px;height:10px"></button>');
  const text = formatA11yReport(report);
  assert.equal(typeof text, 'string');
  assert.equal(formatA11yReport(report), text);
  assert.match(text, /Status: FAIL/);
  assert.match(text, /label_missing/);
  assert.match(text, /touch_target_too_small/);
  assert.ok(!/https?:\/\//.test(text), 'report text must not leak URLs');
});
