'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..', 'android', 'app', 'src', 'main', 'assets', 'web');
const PAGE = path.join(ROOT, 'focus_lab.html');
const html = fs.readFileSync(PAGE, 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const CONTROL_IDS = [
  'study-name', 'study-subject', 'study-template',
  'study-plan-apply', 'study-plan-summary', 'study-plan-days', 'study-plan-error',
  'reading-title', 'reading-total-pages', 'reading-book-open', 'reading-current-page',
  'reading-progress-apply', 'reading-bookmark-page', 'reading-bookmark-label',
  'reading-bookmark-add', 'reading-summary', 'reading-bookmark-list', 'reading-error',
  'intentions-week-start', 'intention-title', 'intention-day', 'intention-minutes',
  'intention-add', 'intentions-summary', 'intention-list', 'intentions-error',
  'sport-template', 'sport-name', 'sport-session-build', 'sport-summary',
  'sport-timeline', 'sport-error',
  'project-name', 'project-budget-minutes', 'project-budget-open',
  'project-log-label', 'project-log-minutes', 'project-log-category',
  'project-session-log', 'project-summary', 'project-error'
];

const CARD_IDS = ['study-plans', 'reading', 'weekly-intentions', 'sports-training', 'projects'];
const CARD_TITLES = ['Study plans', 'Reading', 'Weekly intentions', 'Sports training', 'Projects'];

function tagAttrs() {
  const out = [];
  const pattern = /<(?:[a-zA-Z0-9]+)\b[^>]*>/g;
  const tags = html.match(pattern) || [];
  for (const tag of tags) {
    const attrs = {};
    const attrPattern = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
    let m;
    let match;
    while ((match = attrPattern.exec(tag)) !== null) attrs[match[1]] = match[2];
    out.push({ tag, attrs });
  }
  return out;
}

function scriptTags(source = html) {
  const out = [];
  const pattern = /<script((?:\s[^>]*)?)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = pattern.exec(source)) !== null) {
    const srcMatch = /src\s*=\s*"([^"]*)"/.exec(m[1]);
    out.push({ src: srcMatch ? srcMatch[1] : null, body: m[2] });
  }
  return out;
}

function makeNode(id) {
  const node = {
    kind: 'element',
    tagName: '',
    className: '',
    value: '',
    textContent: '',
    checked: false,
    disabled: false,
    hidden: false,
    type: '',
    children: [],
    parentNode: null,
    attributes: new Map(),
    listeners: new Map(),
    appendChild(child) { child.parentNode = node; node.children.push(child); return child; },
    replaceChildren() { node.children.length = 0; node.textContent = ''; },
    setAttribute(k, v) { node.attributes.set(k, v); node[k] = v; },
    getAttribute(k) { return node.attributes.has(k) ? node.attributes.get(k) : null; },
    removeAttribute(k) { node.attributes.delete(k); },
    addEventListener(type, fn) {
      if (!node.listeners.has(type)) node.listeners.set(type, []);
      node.listeners.get(type).push(fn);
    },
    fire(type) {
      for (const fn of node.listeners.get(type) || []) fn();
    }
  };
  let currentId = id || '';
  Object.defineProperty(node, 'id', {
    get() { return currentId; },
    set(v) {
      currentId = String(v || '');
      if (currentId) registry.set(currentId, node);
    }
  });
  if (currentId) registry.set(currentId, node);
  return node;
}

const registry = new Map();
function byId(id) { return registry.get(id) || null; }

function makeDocument() {
  registry.clear();
  for (const attr of tagAttrs()) {
    if (attr.attrs.id) makeNode(attr.attrs.id);
    if (attr.tag.startsWith('<input') || attr.tag.startsWith('<select') || attr.tag.startsWith('<button')) {
      const existing = attr.attrs.id && registry.get(attr.attrs.id);
      if (existing) {
        existing.tagName = attr.tag.slice(1).toLowerCase();
        existing.kind = attr.tag.startsWith('<button') ? 'button' : 'control';
      }
    }
  }
  return {
    getElementById(id) { return registry.get(id) || null; },
    createElement(tag) {
      const node = makeNode();
      node.tagName = tag;
      return node;
    }
  };
}

function installEnginesAndScript() {
  const imported = scriptTags().filter(s => s.src);
  const inline = scriptTags().filter(s => !s.src);
  assert.equal(imported.length, 5, 'focus_lab.html must import the five offline engines');
  assert.equal(inline.length, 1, 'focus_lab.html must carry exactly one inline wiring script');
  const sandbox = {
    console,
    document: makeDocument(),
    window: null
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  withEngineScripts(imported, sandbox);
  vm.runInContext(inline[0].body, sandbox, { filename: 'focus_lab_inline.js' });
  return { sandbox, imported, inline: inline[0] };
}

function withEngineScripts(imported, sandbox) {
  for (const script of imported) {
    const source = fs.readFileSync(path.join(ROOT, script.src), 'utf8');
    vm.runInContext(source, sandbox, { filename: script.src });
  }
}

test('U01 page exists and declares an accessible offline landmark outline', () => {
  assert.ok(fs.existsSync(PAGE), 'focus_lab.html must exist');
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>[^<]*Focus Lab/);
  assert.equal((html.match(/<header\b/g) || []).length, 1);
  assert.equal((html.match(/<nav\b/g) || []).length, 1);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<footer\b/g) || []).length, 1);
  assert.match(html, /aria-label="Focus lab sections"/);
  assert.match(html, /href="#focus-lab-main"/);
  assert.match(html, /href="#focus-lab-main">Skip to main content</);
  const cards = (html.match(/data-focus-card/g) || []).length;
  assert.equal(cards, 5, 'exactly five focus cards must exist');
  assert.deepEqual(CONTROL_IDS, [...new Set(CONTROL_IDS)], 'control id list must not duplicate');
  for (const title of CARD_TITLES) assert.ok(html.includes(title), 'card heading: ' + title);
});

test('U01 page only links local assets and every reference resolves on disk', () => {
  assert.doesNotMatch(html, /(?:src|href)\s*=\s*"https?:/);
  assert.doesNotMatch(html, /(?:src|href)\s*=\s*"(?:https?:)?\/\/[^"]*"/);
  const refs = [];
  for (const { attrs } of tagAttrs()) {
    for (const key of ['src', 'href']) {
      const value = attrs[key];
      if (value && !value.startsWith('#')) refs.push({ key, value });
    }
  }
  assert.ok(refs.length >= 7, 'page must reference the local styles, engines and library');
  for (const ref of refs) {
    const target = path.resolve(ROOT, ref.value);
    assert.ok(fs.existsSync(target), ref.key + '="' + ref.value + '" must exist offline');
  }
  const styles = refs.filter(r => r.value.endsWith('.css')).map(r => r.value);
  assert.ok(styles.includes('design_tokens_v22.css'), 'local design tokens must be linked');
  assert.ok(styles.includes('ui_components_v22.css'), 'local component styles must be linked');
  for (const script of scriptTags().filter(s => s.src)) {
    assert.ok(/^[a-zA-Z0-9/._-]+$/.test(script.src), 'script src must be a plain local path: ' + script.src);
    assert.ok(fs.existsSync(path.join(ROOT, script.src)), 'imported script must exist: ' + script.src);
  }
});

test('U01 exposes real named controls and never adds an eighth main-app section', () => {
  for (const id of CONTROL_IDS) {
    assert.ok(new RegExp('id="' + id + '"').test(html), 'named control must exist: #' + id);
  }
  const navLinks = [...html.matchAll(/<a href="#([a-z-]+)">/g)].map(m => m[1]);
  for (const cardId of CARD_IDS) {
    assert.ok(navLinks.includes(cardId), 'nav must link to card #' + cardId);
    assert.ok(new RegExp('id="' + cardId + '"').test(html), 'card target must exist: #' + cardId);
  }
  assert.doesNotMatch(indexHtml, /focus_lab/i, 'main app index.html must not gain a focus lab section');
  assert.ok(indexHtml.indexOf('focus-lab') === -1, 'main app keeps its own sections without focus lab markup');
});

test('U01 imports five local engines that expose their browser globals', () => {
  const imported = scriptTags().filter(s => s.src);
  const expectedPaths = [
    'js/room5/study_plan_templates_engine.js',
    'js/room5/reading_bookmarks_engine.js',
    'js/room5/focus_weekly_intentions_engine.js',
    'js/room5/sport_interval_builder_engine.js',
    'js/room5/project_time_budget_engine.js'
  ];
  assert.deepEqual(imported.map(s => s.src), expectedPaths);
  const sandbox = { console, window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  withEngineScripts(imported, sandbox);
  assert.equal(typeof sandbox.window.StudyPlanTemplatesEngine, 'object');
  assert.equal(typeof sandbox.window.DeepFocusReadingBookmarks, 'object');
  assert.equal(typeof sandbox.window.DeepFocusWeeklyIntentions, 'object');
  assert.equal(typeof sandbox.window.SportIntervalBuilderEngine, 'object');
  assert.equal(typeof sandbox.window.ProjectTimeBudgetEngine, 'object');
});

test('U01 wires every named control with real click or change handlers', () => {
  const engineGlobals = ['StudyPlanTemplatesEngine', 'DeepFocusReadingBookmarks', 'DeepFocusWeeklyIntentions', 'SportIntervalBuilderEngine', 'ProjectTimeBudgetEngine'];
  const { sandbox } = installEnginesAndScript();
  for (const name of engineGlobals) {
    assert.equal(typeof sandbox.window[name], 'object', 'engine must be importable at runtime: ' + name);
  }
  const buttons = [
    'study-plan-apply', 'reading-book-open', 'reading-progress-apply', 'reading-bookmark-add',
    'intention-add', 'sport-session-build', 'project-budget-open', 'project-session-log'
  ];
  for (const id of buttons) {
    const node = byId(id);
    assert.ok(node, 'control must exist at runtime: #' + id);
    assert.ok(node.listeners.has('click') && node.listeners.get('click').length > 0, 'control must be wired: #' + id);
  }
});

test('U01 study plan card creates a real plan from templates and rejects blanks', () => {
  installEnginesAndScript();
  const apply = byId('study-plan-apply');
  apply.fire('click');
  assert.match(byId('study-plan-error').textContent, /plan name/);
  assert.equal(byId('study-plan-days').children.length, 0);
  byId('study-name').value = 'Exam Math';
  byId('study-subject').value = 'Linear algebra';
  byId('study-template').value = 'plan_exam_cram';
  byId('study-plan-error').textContent = '';
  apply.fire('click');
  assert.equal(byId('study-plan-error').textContent, '');
  assert.match(byId('study-plan-summary').textContent, /Exam Math.*focused minutes per week/);
  const dayItems = byId('study-plan-days').children;
  assert.equal(dayItems.length, 5);
  assert.match(dayItems[0].textContent, /^mon/);
  assert.match(dayItems[0].textContent, /min break/);
});

test('U01 reading card tracks progress and bookmarks via control clicks', () => {
  installEnginesAndScript();
  byId('reading-progress-apply').fire('click');
  assert.match(byId('reading-error').textContent, /Start a book/);
  byId('reading-title').value = '<img src=x onerror=alert(1)>';
  byId('reading-total-pages').value = '240';
  byId('reading-book-open').fire('click');
  assert.equal(byId('reading-error').textContent, '');
  assert.match(byId('reading-summary').textContent, /page 0 of 240/);
  byId('reading-current-page').value = '80';
  byId('reading-progress-apply').fire('click');
  assert.match(byId('reading-summary').textContent, /page 80 of 240 \(33\.33% complete\)/);
  byId('reading-bookmark-page').value = '42';
  byId('reading-bookmark-label').value = 'Key chapter';
  byId('reading-bookmark-add').fire('click');
  const bookmarks = byId('reading-bookmark-list').children;
  assert.equal(bookmarks.length, 1);
  assert.equal(bookmarks[0].textContent, 'page 42 — Key chapter');
  byId('reading-bookmark-page').value = '9999';
  byId('reading-bookmark-label').value = 'Beyond the end';
  byId('reading-bookmark-add').fire('click');
  assert.match(byId('reading-error').textContent, /between 1 and/);
  assert.equal(byId('reading-bookmark-list').children.length, 1);
});

test('U01 weekly intentions card adds, completes and removes intentions', () => {
  installEnginesAndScript();
  assert.match(byId('intentions-week-start').value, /^\d{4}-\d{2}-\d{2}$/);
  byId('intention-add').fire('click');
  assert.match(byId('intentions-error').textContent, /intention/);
  byId('intention-title').value = 'Review German verbs';
  byId('intention-day').value = 'mon';
  byId('intention-minutes').value = '30';
  byId('intention-add').fire('click');
  byId('intention-title').value = 'Read one chapter';
  byId('intention-day').value = 'fri';
  byId('intention-minutes').value = '900';
  byId('intention-add').fire('click');
  assert.match(byId('intentions-error').textContent, /between 1 and 600/);
  byId('intention-minutes').value = '20';
  byId('intention-add').fire('click');
  assert.equal(byId('intentions-error').textContent, '');
  assert.equal(byId('intention-list').children.length, 2);
  assert.match(byId('intentions-summary').textContent, /0 of 2 intentions done; 0 of 50 planned minutes completed/);
  assert.equal(byId('intention-done-0').checked, false);
  byId('intention-done-0').checked = true;
  byId('intention-done-0').fire('change');
  assert.match(byId('intentions-summary').textContent, /^1 of 2/);
  byId('intention-remove-0').fire('click');
  assert.equal(byId('intention-list').children.length, 1);
  assert.match(byId('intention-list').children[0].textContent, /^fri: Read one chapter/);
});

test('U01 sports card builds a real timeline from local templates', () => {
  installEnginesAndScript();
  byId('sport-session-build').fire('click');
  assert.match(byId('sport-error').textContent, /Name the session/);
  byId('sport-template').value = 'int_hiit_8round';
  byId('sport-name').value = 'Morning HIIT';
  byId('sport-session-build').fire('click');
  assert.equal(byId('sport-error').textContent, '');
  const steps = byId('sport-timeline').children;
  assert.ok(steps.length >= 17, 'HIIT template expands into warmup, 8 work/rest rounds and cooldown');
  assert.match(steps[0].textContent, /Warmup 1 — 5 min \(0-5/);
  const last = steps[steps.length - 1].textContent;
  assert.match(last, /min \(\d+-\d+, intensity/);
  const summary = byId('sport-summary').textContent;
  assert.match(summary, /Morning HIIT: 25 min total, including 8 hard minutes across 17 steps/);
});

test('U01 projects card enforces a real time budget with logged sessions', () => {
  installEnginesAndScript();
  byId('project-session-log').fire('click');
  assert.match(byId('project-error').textContent, /Open a project budget/);
  byId('project-name').value = 'Deck rebuild';
  byId('project-budget-minutes').value = '600';
  byId('project-budget-open').fire('click');
  assert.match(byId('project-summary').textContent, /Deck rebuild: 600 of 600 minutes left \(0% used/);
  byId('project-session-log').fire('click');
  assert.match(byId('project-error').textContent, /Describe what you worked on/);
  byId('project-log-label').value = 'Core layout';
  byId('project-log-minutes').value = '90';
  byId('project-log-category').value = 'focus';
  byId('project-session-log').fire('click');
  assert.equal(byId('project-error').textContent, '');
  const summary = byId('project-summary').textContent;
  assert.match(summary, /510 of 600 minutes left \(15% used, 1 session/);
  byId('project-log-minutes').value = '1000';
  byId('project-session-log').fire('click');
  assert.match(byId('project-summary').textContent, /over budget by 490 minutes/);
});

test('U01 renders untrusted text through textContent only and networks nowhere', () => {
  const { inline } = installEnginesAndScript();
  assert.doesNotMatch(inline.body, /innerHTML|outerHTML|document\.write/);
  assert.match(inline.body, /\.textContent\s*=/, 'rendering must go through textContent');
  assert.doesNotMatch(inline.body, /fetch\s*\(|XMLHttpRequest|WebSocket|\.open\s*\(|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(inline.body, /https?:\/\//);
  installEnginesAndScript();
  byId('study-name').value = '<img src=x onerror=alert(1)>';
  byId('study-subject').value = 'Linear algebra';
  byId('study-template').value = 'plan_exam_cram';
  byId('study-plan-apply').fire('click');
  const summary = byId('study-plan-summary').textContent;
  assert.ok(summary.startsWith('<img src=x onerror=alert(1)> ('), 'untrusted input must stay raw text');
});


test('script fixture reader rejects custom tag names and accepts case-insensitive script tags', () => {
  assert.deepEqual(scriptTags('<script-extra>throw new Error("not executable");</script>'), []);
  assert.deepEqual(scriptTags('<script:extra>throw new Error("not executable");</script>'), []);
  assert.deepEqual(scriptTags('<SCRIPT type="text/javascript">true;</SCRIPT  >'), [{src: null, body: 'true;'}]);
});
