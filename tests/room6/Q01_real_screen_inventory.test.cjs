'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  inspectRepository,
  DEFAULT_INDEX,
  DEFAULT_SCRIPT,
  DEFAULT_FOCUS_LAB
} = require('../../tools/room6/real_screen_inventory.cjs');

const INDEX = `<!doctype html>
<html lang="en" dir="ltr" id="htmlRoot">
<body>
<main class="screen-section active" id="sec-timer">
  <section id="quickTrainingCard" aria-label="Quick training">
    <details id="quickTrainingDetails"></details>
  </section>
</main>
<main class="screen-section" id="sec-tasks">
  <input id="inpTaskDate" type="date">
</main>
<main class="screen-section" id="sec-calendar"></main>
<main class="screen-section" id="sec-notes"></main>
<main class="screen-section" id="sec-sounds"></main>
<main class="screen-section" id="sec-analytics"></main>
<nav class="bottom-nav-capsule" aria-label="Main navigation">
  <button class="bnav-btn" id="navTasks" onclick="switchTab('sec-tasks', this)">Tasks</button>
  <button class="bnav-btn" id="navCalendar" onclick="switchTab('sec-calendar', this)">Calendar</button>
  <button class="bnav-btn" id="navNotes" onclick="switchTab('sec-notes', this)">Notes</button>
  <button class="bnav-btn active" id="navTimer" onclick="switchTab('sec-timer', this)">Timer</button>
  <button class="bnav-btn" id="navTraining" onclick="openQuickTrainingFromNav(this)" aria-label="Quick training">Training</button>
  <button class="bnav-btn" id="navSounds" onclick="switchTab('sec-sounds', this)">Nature</button>
  <button class="bnav-btn" id="navAnalytics" onclick="switchTab('sec-analytics', this)">Analytics</button>
</nav>
</body>
</html>`;

const SCRIPT = `function openQuickTrainingFromNav(btn) {
  switchTab('sec-timer', btn);
  const details = document.getElementById('quickTrainingDetails');
  if (details) details.open = true;
}

function switchTab(secId, btn) {
  document.querySelectorAll('.screen-section').forEach((section) => section.classList.remove('active'));
  document.getElementById(secId).classList.add('active');
}

const taskDateInput = document.getElementById('inpTaskDate');
const legacyQuizHeader = document.getElementById('df-flash-quiz-header');
const modal = document.createElement('div');
modal.innerHTML = '<button id="df-quiz-next-btn"></button>';
`;

const FOCUS_INDEX = INDEX.replace(
  '</nav>',
  '  <a class="bnav-btn" id="navFocusLab" href="focus_lab.html">Focus Lab</a>\n</nav>'
);

const FOCUS_SCRIPT = `${SCRIPT}
const focusLabLink = document.getElementById('navFocusLab');
if (focusLabLink) focusLabLink.setAttribute('aria-current', 'page');
`;

function makeRepo(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room6-q01-'));
  if (options.empty) return { root };
  const web = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'web');
  fs.mkdirSync(web, { recursive: true });
  fs.writeFileSync(path.join(web, 'index.html'), options.index || INDEX, 'utf8');
  fs.writeFileSync(path.join(web, 'app.js'), options.script || SCRIPT, 'utf8');
  if (options.focusLab) fs.writeFileSync(path.join(web, 'focus_lab.html'), options.focusLab, 'utf8');
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

test('inventory reports seven navigation controls but six real screen sections', () => {
  const repo = makeRepo();
  const report = inspectRepository({ root: repo.root });

  assert.deepEqual(report.screenSections.map((section) => section.id), [
    'sec-timer',
    'sec-tasks',
    'sec-calendar',
    'sec-notes',
    'sec-sounds',
    'sec-analytics'
  ]);
  assert.equal(report.navigation.controls.length, 7);
  assert.equal(report.sevenSectionUi.actualScreenSectionCount, 6);
  assert.equal(report.sevenSectionUi.actualNavigationControlCount, 7);
  assert.equal(report.sevenSectionUi.sevenScreenSectionsPresent, false);
  assert.equal(report.sevenSectionUi.sevenNavigationControlsPresent, true);
  assert.deepEqual(report.navigation.sectionsWithoutControl, []);
  assert.deepEqual(report.navigation.missingTargets, []);

  const training = report.navigation.controls.find((control) => control.id === 'navTraining');
  assert.equal(training.targetSection, null);
  assert.equal(training.action, 'openQuickTrainingFromNav');
  assert.equal(training.handlerDefinedInScript, true);

  for (const section of report.screenSections) {
    assert.equal(section.source, DEFAULT_INDEX);
    assert.ok(section.line > 0);
  }
  assert.equal(report.findings.some((finding) => finding.code === 'screen_section_count_mismatch'), true);
});

test('inventory reports the Focus Lab wiring gap without inventing interactions', () => {
  const repo = makeRepo();
  const report = inspectRepository({ root: repo.root });

  assert.equal(report.focusLab.expectedFile, DEFAULT_FOCUS_LAB);
  assert.equal(report.focusLab.expectedFilePresent, false);
  assert.equal(report.focusLab.indexMentionCount, 0);
  assert.equal(report.focusLab.scriptMentionCount, 0);
  assert.deepEqual(report.focusLab.navigationControls, []);
  assert.deepEqual(report.focusLab.linkedFromIndex, []);
  assert.equal(report.focusLab.wiringGap, true);
  assert.ok(report.focusLab.gapReasons.includes('focus_lab_page_missing'));
  assert.ok(report.focusLab.gapReasons.includes('no_navigation_target'));
  assert.ok(report.focusLab.gapReasons.includes('no_index_asset_link'));
  assert.ok(report.findings.some((finding) => finding.code === 'focus_lab_wiring_gap'));
});

test('inventory detects a real Focus Lab page linked by navigation', () => {
  const repo = makeRepo({
    index: FOCUS_INDEX,
    script: FOCUS_SCRIPT,
    focusLab: '<!doctype html><html lang="en"><body><main id="focusLabMain">Focus Lab</main></body></html>'
  });
  const report = inspectRepository({ root: repo.root });

  assert.equal(report.focusLab.expectedFilePresent, true);
  assert.ok(report.focusLab.indexMentionCount >= 1);
  assert.equal(report.focusLab.scriptMentionCount, 1);
  assert.equal(report.focusLab.wiringGap, false);
  assert.equal(report.focusLab.navigationControls.length, 1);
  assert.equal(report.focusLab.navigationControls[0].id, 'navFocusLab');
  assert.equal(report.focusLab.linkedFromIndex.length, 1);
  assert.equal(report.focusLab.linkedFromIndex[0].href, 'focus_lab.html');
});

test('script DOM inventory separates index ids, script-created ids and unresolved ids', () => {
  const repo = makeRepo();
  const report = inspectRepository({ root: repo.root });
  const inventory = report.scriptDom;

  assert.ok(inventory.referencedIds.includes('inpTaskDate'));
  assert.ok(inventory.referencedIds.includes('df-flash-quiz-header'));
  assert.deepEqual(inventory.missingFromIndex.map((entry) => entry.id), ['df-flash-quiz-header']);
  assert.equal(inventory.missingFromIndex[0].source, DEFAULT_SCRIPT);
  assert.ok(inventory.missingFromIndex[0].lines[0] > 0);
  assert.ok(inventory.declaredInScript.some((entry) => entry.id === 'df-quiz-next-btn'));
  assert.equal(inventory.missingFromIndex.some((entry) => entry.id === 'df-quiz-next-btn'), false);
  assert.equal(inventory.declaredInScript.some((entry) => entry.id === 'inpTaskDate'), false);
});

test('inventory is read-only and returns plain serializable evidence', () => {
  const repo = makeRepo();
  const before = snapshot(repo.root);
  const report = inspectRepository({ root: repo.root });
  const after = snapshot(repo.root);

  assert.deepEqual(after, before);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.readOnly, true);
  assert.equal(JSON.parse(JSON.stringify(report)).schemaVersion, 1);
  assert.equal(report.sources.index.path, DEFAULT_INDEX);
  assert.equal(report.sources.script.path, DEFAULT_SCRIPT);
  assert.ok(report.limitations.some((item) => /runtime/i.test(item)));
});

test('missing sources are reported honestly instead of being fabricated', () => {
  const repo = makeRepo({ empty: true });
  const report = inspectRepository({ root: repo.root });

  assert.equal(report.sources.index.exists, false);
  assert.equal(report.sources.script.exists, false);
  assert.deepEqual(report.screenSections, []);
  assert.deepEqual(report.navigation.controls, []);
  assert.equal(report.sevenSectionUi.actualScreenSectionCount, 0);
  assert.equal(report.focusLab.wiringGap, true);
  assert.ok(report.focusLab.gapReasons.includes('index_missing'));
  assert.ok(report.findings.some((finding) => finding.code === 'source_missing' && finding.source === DEFAULT_INDEX));
  assert.ok(report.findings.some((finding) => finding.code === 'source_missing' && finding.source === DEFAULT_SCRIPT));
});

test('CLI emits the same structured JSON inventory', () => {
  const repo = makeRepo();
  const tool = path.resolve(__dirname, '../../tools/room6/real_screen_inventory.cjs');
  const result = spawnSync(process.execPath, [tool, '--root', repo.root], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.screenSections.length, 6);
  assert.equal(report.navigation.controls.length, 7);
  assert.equal(report.focusLab.wiringGap, true);
});

test('real integrated v21 web asset, when present, matches the six-section and Focus Lab gap facts', (t) => {
  const root = path.resolve(__dirname, '..', '..');
  if (!fs.existsSync(path.join(root, DEFAULT_INDEX))) {
    t.skip('integrated web asset is not present in this worktree');
    return;
  }
  const report = inspectRepository({ root });
  assert.equal(report.screenSections.length, 6);
  assert.deepEqual(report.screenSections.map((section) => section.id), [
    'sec-timer',
    'sec-tasks',
    'sec-calendar',
    'sec-notes',
    'sec-sounds',
    'sec-analytics'
  ]);
  assert.equal(report.navigation.controls.length, 7);
  assert.equal(report.focusLab.indexMentionCount, 0);
  assert.equal(report.focusLab.wiringGap, true);
});
