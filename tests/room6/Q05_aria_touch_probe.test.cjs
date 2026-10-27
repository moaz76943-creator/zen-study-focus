'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SCHEMA_VERSION,
  TOOL_NAME,
  DEFAULT_FOCUS_LAB_HTML,
  DEFAULT_FOCUS_LAB_CSS,
  DEFAULT_ROOM6_JS_DIR,
  MIN_TOUCH_TARGET_PX,
  RUNTIME_NOT_TESTED,
  pxFromLength,
  rootFontSizeFromCss,
  auditFocusLabSources,
  inspectRepository,
  parseArguments
} = require('../../tools/room6/aria_touch_probe.cjs');

const RUNTIME_TOPICS = [
  'screen_reader_accessible_names',
  'rendered_touch_target_size',
  'keyboard_focus_order',
  'zoom_200_percent_reflow',
  'pointer_touch_and_hover_interaction',
  'responsive_width_breakpoints'
];

// Representative Focus Lab page channel-shaped like the standalone focus_lab.html
// (header nav with aria-label, cards with aria-labelledby headings, skip link).
const FIXTURE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deep Focus Lab</title>
<style>
  button { min-height: 2.75rem; font-size: 1rem; }
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<nav class="focus-lab-nav" aria-label="Focus lab sections">
  <a href="#study-plans">Study plans</a>
  <a href="#reading" tabindex="3">Reading</a>
</nav>
<main id="main">
<section class="focus-card" id="study-plans" aria-labelledby="study-plans-heading">
  <h2 id="study-plans-heading">Study plans</h2>
  <button id="study-plan-apply" type="button">Create study plan</button>
  <button id="icon-only" type="button" aria-label="Mark reading as done"></button>
  <button id="unnamed-apply" type="button"></button>
  <button id="labelledby-btn" type="button" aria-labelledby="study-plans-heading"></button>
  <label for="plan-minutes">Planned minutes</label><input id="plan-minutes" type="number">
</section>
</main>
</body>
</html>`;

const FIXTURE_CSS_CLEAN = `html { font-size: 100%; }
button {
  font: inherit;
  font-size: 1rem;
  min-height: 2.75rem; /* 44 CSS px equivalent */
  padding: 0.5rem 0.875rem;
  border: 1px solid transparent;
}
a.focus-lab-nav-link { padding: 0.5rem 0.875rem; }
:focus-visible { outline: 3px solid #1b4db3; outline-offset: 2px; }
@media (max-width: 320px) {
  .focus-lab-row { flex-basis: 100%; }
  button { min-height: 2.75rem; padding-block: 0.5rem; }
}
`;

const FIXTURE_CSS_CLAIMS = FIXTURE_CSS_CLEAN + `
.focus-lab-list button { min-height: 2.25rem; }
.focus-meter { height: 28px; overflow: hidden; }
.meter-label { font-size: 14px; }
`;

const FIXTURE_JS = {
  clean: `function addToggle(doc, label) {
  const toggle = doc.createElement('button');
  toggle.textContent = label;
  toggle.setAttribute('class', 'intention-toggle');
  return toggle;
}
`
};

// FLAWED_JS: dynamically created buttons with no demonstrable name channel
// plus an untrusted innerHTML assignment the probe must surface as a warning.
const FLAWED_JS = `function addToggle(doc) {
  const toggle = doc.createElement('button');
  doc.body.innerHTML = '<b>oops</b>';
  return toggle;
}
`;

// Same page without the demo flaws (deliberate tabindex and unnamed button):
const CLEAN_HTML = FIXTURE_HTML
  .replace(' tabindex="3"', '')
  .replace(/<button id="unnamed-apply"[\s\S]*?<\/button>\n/, '');

test('probe metadata and read-only contract', () => {
  assert.equal(SCHEMA_VERSION, 1);
  assert.equal(TOOL_NAME, 'aria_touch_probe');
  assert.equal(MIN_TOUCH_TARGET_PX, 44);
  assert.deepEqual(RUNTIME_TOPICS, RUNTIME_NOT_TESTED.map((item) => item.topic));
  for (const item of RUNTIME_NOT_TESTED) {
    assert.equal(item.status, 'NOT_TESTED');
    assert.ok(item.reason.includes('NOT_TESTED'));
  }
});

test('accessible names resolve strictly from source channels, never innerHTML', () => {
  const report = auditFocusLabSources({
    html: FIXTURE_HTML,
    css: FIXTURE_CSS_CLAIMS,
    jsSources: [{ path: 'js/room6/focus_lab_registrar.js', text: FIXTURE_JS.clean }]
  });
  assert.equal(report.accessibleNames.buttonsAudited, 4);
  const byId = new Map(report.accessibleNames.named.map((entry) => [entry.id, entry]));
  assert.deepEqual(
    byId.get('study-plan-apply'),
    { id: 'study-plan-apply', line: 20, source: 'text', value: 'Create study plan' }
  );
  assert.equal(byId.get('icon-only').source, 'aria-label');
  assert.equal(byId.get('icon-only').value, 'Mark reading as done');
  assert.equal(byId.get('labelledby-btn').source, 'aria-labelledby');
  assert.equal(byId.get('labelledby-btn').value, 'Study plans');
  assert.deepEqual(report.accessibleNames.unnamed, [{ id: 'unnamed-apply', line: 22 }]);
  const labelledInput = report.focusOrder.focusables.find((entry) => entry.id === 'plan-minutes');
  assert.equal(labelledInput.nameResolved, true); // <label for> channel respected
  assert.equal(report.summary.inputsAudited, 1);
});

test('44 CSS px touch-target expectation converts objectively and flags short rules', () => {
  assert.equal(pxFromLength('2.75rem', 16), 44);
  assert.equal(pxFromLength('44px', 16), 44);
  assert.equal(pxFromLength('2.75rem'), 44);
  assert.equal(pxFromLength('50%', 16), null);
  assert.equal(pxFromLength('calc(2.75rem)', 16), null);
  assert.equal(rootFontSizeFromCss('html { font-size: 87.5%; }') === 14, true);
  assert.equal(rootFontSizeFromCss('html { font-size: 18px; }'), 18);
  const report = auditFocusLabSources({ html: FIXTURE_HTML, css: FIXTURE_CSS_CLAIMS });
  assert.equal(report.touchTargets.rootFontSizePx, 16);
  assert.equal(report.touchTargets.rulesAudited, 4); // inline + base + media + list rules
  assert.equal(report.summary.touchRulesBelowTarget, 1);
  assert.equal(report.touchTargets.fixedHeightTrap.length, 0); // .focus-meter is not touch-relevant
  assert.deepEqual(report.touchTargets.belowTarget, [
    { rule: '.focus-lab-list button', line: 16, minCsPx: 36 }
  ]);
});

test('a clean source sheet earns the verified 44 CSS px claim', () => {
  const report = auditFocusLabSources({ html: FIXTURE_HTML, css: FIXTURE_CSS_CLEAN });
  assert.ok(report.verified.some((check) => check.code === 'all_declared_control_min_heights_meet_44_css_px'));
  assert.equal(report.summary.touchRulesBelowTarget, 0);
  assert.equal(
    report.findings.some((finding) => finding.code === 'touch_target_below_44'),
    false
  );
});

test('44 px sizing claims stay honest when the source cannot demonstrate them', () => {
  const covered = auditFocusLabSources({
    html: CLEAN_HTML,
    css: 'button.equal { padding-block: 1.375rem; }' // 22+22 = 44 CSS px of padding alone
  });
  assert.equal(covered.touchTargets.rulesAudited, 2); // inline style + added rule, both covered
  assert.equal(covered.summary.touchRulesBelowTarget, 0);
  assert.equal(covered.findings.some((finding) => finding.code === 'touch_target_size_not_demonstrable'), false);

  const unverifiable = auditFocusLabSources({
    html: CLEAN_HTML,
    css: 'button { padding: 0.25rem; }'
  });
  const warn = unverifiable.findings.find((finding) => finding.code === 'touch_target_size_not_demonstrable');
  assert.equal(warn.severity, 'warn'); // honest unprovable case, not a fail
  assert.deepEqual(warn.evidence.rule, 'button');
  assert.equal(unverifiable.summary.touchRulesBelowTarget, 0);

  const nonsizes = auditFocusLabSources({
    html: CLEAN_HTML,
    css: 'button { min-height: max(2.75rem, 3vw); width: 50%; }'
  });
  const medialess = nonsizes.findings.filter((finding) => finding.code === 'touch_target_size_not_demonstrable');
  assert.equal(medialess.length, 1); // only the file rule is unprovable; the inline min-height passes
  assert.equal(nonsizes.touchTargets.rulesAudited, 2);
});

test('focus order claims: DOM order only, positive tabindex fails, :focus-visible asserted', () => {
  const report = auditFocusLabSources({ html: FIXTURE_HTML, css: FIXTURE_CSS_CLEAN });
  assert.equal(report.focusOrder.focusVisibleDeclared, true);
  assert.equal(report.focusOrder.tabOrderAssertable, false);
  assert.equal(report.focusOrder.positiveTabindex.length, 1);
  assert.deepEqual(
    {
      tag: report.focusOrder.positiveTabindex[0].tag,
      value: report.focusOrder.positiveTabindex[0].value,
      line: report.focusOrder.positiveTabindex[0].line
    },
    { tag: 'a', value: 3, line: 15 }
  );
  const order = report.focusOrder.focusables.map((entry) => entry.tag);
  assert.equal(order.indexOf('button') > order.indexOf('a'), true); // inventoried in DOM order

  const okReport = auditFocusLabSources({
    html: CLEAN_HTML,
    css: FIXTURE_CSS_CLEAN
  });
  assert.equal(okReport.focusOrder.tabOrderAssertable, true);
  assert.equal(
    okReport.findings.some((finding) => finding.code === 'positive_tabindex_breaks_focus_order'),
    false
  );

  const withoutFocusVisible = auditFocusLabSources({ html: FIXTURE_HTML, css: 'button { min-height: 2.75rem; }' });
  assert.equal(withoutFocusVisible.focusOrder.focusVisibleDeclared, false);
  assert.ok(
    withoutFocusVisible.findings.some(
      (finding) => finding.code === 'focus_visible_styles_absent' && finding.severity === 'fail'
    )
  );
});

test('200% zoom friendliness: relative sizing verified, fixed clipping fails, px text warns', () => {
  const report = auditFocusLabSources({ html: FIXTURE_HTML, css: FIXTURE_CSS_CLAIMS });
  assert.ok(report.verified.some((check) => check.code === 'control_font_size_relative'));
  assert.ok(
    report.findings.some(
      (finding) => finding.code === 'fixed_height_overflow_clip_risk' && finding.severity === 'fail'
    )
  );
  const pxWarn = report.findings.find((finding) => finding.code === 'fixed_px_font_size');
  assert.equal(pxWarn.severity, 'warn'); // warn is separate from fails
  assert.equal(report.zoom.fixedClipRisk.length, 1);
  assert.equal(report.zoom.fixedClipRisk[0].height, '28px');
  assert.deepEqual(report.zoom.fixedPxFontSizes, [
    { rule: '.meter-label', line: 18, font: '14px' }
  ]);
  assert.equal(report.summary.failedFindings, 4);
  assert.equal(report.summary.warnFindings, 1); // fixed px text warns, never fails

  const clean = auditFocusLabSources({
    html: CLEAN_HTML,
    css: FIXTURE_CSS_CLEAN,
    jsSources: [{ path: 'js/room6/adapter.js', text: FIXTURE_JS.clean }]
  });
  assert.equal(clean.zoom.fixedClipRisk.length, 0);
  assert.equal(clean.summary.failedFindings, 0);
  assert.equal(clean.summary.warnFindings, 0);
  assert.ok(clean.verified.some((check) => check.code === 'no_fixed_height_overflow_clip_risk'));
});

test('dynamic room6 buttons: named channels verified, unknown flagged, innerHTML sinks warned', () => {
  const clean = auditFocusLabSources({
    html: CLEAN_HTML,
    css: FIXTURE_CSS_CLEAN,
    jsSources: [{ path: 'js/room6/focus_lab_dom.js', text: FIXTURE_JS.clean }]
  });
  assert.equal(clean.dynamicButtons.length, 1);
  assert.equal(clean.dynamicButtons[0].nameAssigned, 'yes');
  assert.ok(clean.verified.some((check) => check.code === 'js_avoids_untrusted_innerhtml'));

  const risky = auditFocusLabSources({
    html: CLEAN_HTML,
    css: FIXTURE_CSS_CLEAN,
    jsSources: [{ path: 'js/room6/focus_lab_dom.js', text: FLAWED_JS }]
  });
  assert.equal(risky.dynamicButtonNameUnknownCount, 1);
  assert.ok(risky.findings.some((finding) => finding.code === 'dynamic_button_name_not_demonstrable'));
  assert.deepEqual(risky.innerHtmlSinks, [
    { source: 'js/room6/focus_lab_dom.js', line: 3, sink: 'innerHTML' }
  ]);
  assert.ok(risky.findings.some((finding) => finding.code === 'untrusted_innerhtml_sink'));
});

test('report distinguishes source_tested vs not_testable_here and never claims runtime', () => {
  const report = auditFocusLabSources({
    html: FIXTURE_HTML,
    css: FIXTURE_CSS_CLAIMS,
    jsSources: []
  });
  for (const entry of report.findings) {
    assert.ok(
      ['source_tested', 'not_testable_here'].includes(entry.status),
      'unexpected status: ' + entry.status
    );
  }
  for (const item of report.runtime) {
    assert.equal(item.status, 'NOT_TESTED');
  }
  const codes = new Set(report.findings.map((finding) => finding.code));
  // A null JS channel reports absence rather than fabricating a scan:
  const absentJs = auditFocusLabSources({ html: FIXTURE_HTML, css: FIXTURE_CSS_CLEAN });
  assert.ok(absentJs.findings.some((finding) => finding.status === 'not_testable_here' && finding.code === 'source_missing'));
  assert.equal(codes.has('accessible_name_missing'), true);
  const allAbsent = auditFocusLabSources({});
  assert.equal(allAbsent.summary.buttonsAudited, 0);
  assert.equal(allAbsent.summary.verifiedCount, 0);
  assert.equal(allAbsent.summary.notTestedRuntimeCount, RUNTIME_TOPICS.length);
  assert.ok(allAbsent.findings.filter((finding) => finding.code === 'source_missing').length >= 2);
});

// ---------------------------------------------------------------------------
// Repository-level integration (temp dirs only; the real checkout stays intact)
// ---------------------------------------------------------------------------

const WEB = path.join('android', 'app', 'src', 'main', 'assets', 'web');

function makeRepo(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room6-q05-'));
  const web = path.join(root, WEB);
  const htmlPath = path.join(web, 'focus_lab.html');
  const cssPath = path.join(web, 'css', 'focus_lab.css');
  const controllerPath = path.join(web, 'js', 'room6', 'focus_lab_dom.js');
  if (options.html !== false) {
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, options.html || CLEAN_HTML, 'utf8');
  }
  if (options.css !== false) {
    fs.mkdirSync(path.dirname(cssPath), { recursive: true });
    fs.writeFileSync(cssPath, options.css || FIXTURE_CSS_CLEAN, 'utf8');
  }
  if (options.js !== false) {
    fs.mkdirSync(path.dirname(controllerPath), { recursive: true });
    fs.writeFileSync(controllerPath, options.js || FIXTURE_JS.clean, 'utf8');
  }
  return { root, htmlPath, cssPath, controllerPath };
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

test('inspectRepository audits a real offline Focus Lab page and is strictly read-only', () => {
  const repo = makeRepo();
  const before = snapshot(repo.root);
  const report = inspectRepository({ root: repo.root });
  const after = snapshot(repo.root);

  assert.deepEqual(after, before); // read-only: nothing written, no mtime drift
  assert.equal(report.readOnly, true);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.sources.html.exists, true);
  assert.equal(report.sources.css.exists, true);
  assert.equal(report.sources.js.length, 1);
  assert.equal(report.sources.js[0].path, DEFAULT_ROOM6_JS_DIR + '/focus_lab_dom.js');
  assert.equal(report.summary.buttonsAudited, 3);
  assert.equal(report.summary.unnamedButtons, 0);
  assert.equal(report.summary.failedFindings, 0);
  assert.equal(report.summary.verifiedCount >= 5, true);
  assert.ok(report.verified.some((check) => check.code === 'all_declared_buttons_have_accessible_names'));
  assert.ok(report.verified.some((check) => check.code === 'no_positive_tabindex_declared'));
  assert.equal(report.focusOrder.tabOrderAssertable, true);
  assert.equal(report.summary.notTestedRuntimeCount, RUNTIME_TOPICS.length);
  assert.ok(report.limitations.some((item) => /modified/.test(item)));
});

test('absent Focus Lab assets are reported honestly instead of fabricated', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room6-q05-empty-'));
  const report = inspectRepository({ root });
  assert.equal(report.sources.html.exists, false);
  assert.equal(report.sources.css.exists, false);
  assert.deepEqual(report.accessibleNames.buttonsAudited, 0);
  assert.equal(report.summary.verifiedCount, 0);
  const sourceMissing = report.findings.filter(
    (finding) => finding.code === 'source_missing' && finding.status === 'not_testable_here'
  );
  assert.ok(sourceMissing.length >= 2);
  assert.equal(report.summary.failedFindings, 0);
  assert.equal(report.summary.notTestedRuntimeCount, RUNTIME_TOPICS.length);
});

test('the checked-out Focus Lab facts in this worktree are reported truthfully', () => {
  const root = path.resolve(__dirname, '..', '..');
  const report = inspectRepository({ root });
  const expected = {
    html: fs.existsSync(path.join(root, DEFAULT_FOCUS_LAB_HTML)),
    css: fs.existsSync(path.join(root, DEFAULT_FOCUS_LAB_CSS))
  };
  assert.equal(report.sources.html.exists, expected.html);
  assert.equal(report.sources.css.exists, expected.css);
  assert.equal(report.readOnly, true);
  assert.equal(report.focusOrder.orderBasis.length > 0, true);
  if (!expected.html) {
    // Nothing was invented for an absent page in this worktree:
    assert.equal(report.summary.buttonsAudited, 0);
    assert.ok(report.findings.some(
      (finding) => finding.code === 'source_missing' && finding.status === 'not_testable_here'
    ));
  } else {
    assert.ok(report.summary.buttonsAudited > 0);
  }
  assert.equal(report.summary.notTestedRuntimeCount, RUNTIME_TOPICS.length);
});

test('CLI prints the same structured JSON report and honours --summary/--help', () => {
  const repo = makeRepo();
  const tool = path.resolve(__dirname, '../../tools/room6/aria_touch_probe.cjs');
  const baseline = spawnSync(process.execPath, [tool, '--root', repo.root], { encoding: 'utf8' });
  assert.equal(baseline.status, 0, baseline.stderr);
  const report = JSON.parse(baseline.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.summary.buttonsAudited, 3);
  assert.equal(report.summary.notTestedRuntimeCount, RUNTIME_TOPICS.length);

  const summary = spawnSync(process.execPath, [tool, '--root', repo.root, '--summary'], { encoding: 'utf8' });
  assert.equal(summary.status, 0, summary.stderr);
  assert.ok(summary.stdout.includes('buttons audited: 3'));
  assert.ok(summary.stdout.includes('NOT_TESTED'));

  const help = spawnSync(process.execPath, [tool, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.ok(help.stdout.includes('NOT_TESTED'));

  const bad = spawnSync(process.execPath, [tool, '--nonsense', repo.root], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /aria_touch_probe/);

  const parsed = parseArguments(['--root=x', '--summary']);
  assert.deepEqual(parsed, { root: 'x', summary: true });
  assert.throws(() => parseArguments(['--nope']), /Unknown argument/);
});
