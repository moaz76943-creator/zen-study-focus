'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const NAV_PATH = path.join(
  __dirname, '..', '..', 'android', 'app', 'src', 'main', 'assets', 'web', 'js', 'room6', 'focus_lab_navigation.js'
);

const file = fs.readFileSync(NAV_PATH, 'utf8');
const Nav = require(NAV_PATH);

// ---------- Minimal offline DOM fake (textContent only, no innerHTML) ----------
function makeElement(attrs, parentDoc) {
  const el = {
    tagName: 'div',
    attributes: {},
    children: [],
    parentNode: null,
    hidden: false,
    tabindexSet: false,
    focused: false,
    listeners: {},
    style: {},
    classList: {
      add(c) { attrs['__class'] = attrs['__class'] || new Set(); attrs['__class'].add(c); },
      removeSet(c) { if (attrs['__class']) attrs['__class'].delete(c); },
      remove(c) { if (attrs['__class']) attrs['__class'].delete(c); }
    },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'tabindex') this.tabindexSet = true; },
    removeAttribute(name) { delete this.attributes[name]; },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    querySelector(sel) {
      // supports [data-fl-heading] within subtree
      for (const child of this.children) {
        if (child.matches && child.matches(sel)) return child;
        const found = child.querySelector && child.querySelector(sel);
        if (found) return found;
      }
      return null;
    },
    querySelectorAll(sel) {
      const hits = [];
      const walk = (node) => {
        if (node.matches && node.matches(sel)) hits.push(node);
        for (const c of node.children) walk(c);
      };
      for (const child of this.children) walk(child);
      return hits;
    },
    focus() { this.focused = true; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      if (!this.listeners[type]) return;
      const i = this.listeners[type].indexOf(fn);
      if (i !== -1) this.listeners[type].splice(i, 1);
    },
    matches(sel) {
      const m = sel.match(/^\[\s*([\w-]+)\s*(?:="?([^"\]]*)"?)?\]\s*$/);
      if (!m) return false;
      const name = m[1];
      if (!Object.prototype.hasOwnProperty.call(this.attributes, name)) return false;
      return m[2] === undefined || m[2] === '' || this.attributes[name] === m[2];
    },
    textContent: ''
  };
  if (attrs) for (const k of Object.keys(attrs)) el.attributes[k] = String(attrs[k]);
  if (parentDoc) parentDoc.register(el);
  return el;
}

function registryDoc() {
  const all = [];
  return {
    all,
    register(el) { all.push(el); },
    createElement() { return makeElement({}, { register: (e) => all.push(e) }); }
  };
}

function buildLabDoc() {
  const doc = registryDoc();
  const root = makeElement({ id: 'fl-nav-root' }, doc);
  const body = makeElement({}, doc);
  body.appendChild(root);
  headOf = null;

  const tabs = {};
  const views = {};
  for (const view of Nav.VIEWS) {
    const section = makeElement({ 'data-fl-view': view }, doc);
    root.appendChild(section);
    const heading = makeElement({ 'data-fl-heading': '' }, doc);
    heading.textContent = view;
    section.appendChild(heading);
    views[view] = section;
    const tab = makeElement({ 'data-fl-tab': view, tabindex: '-1' }, doc);
    root.appendChild(tab);
    tabs[view] = tab;
  }
  // rogue unlisted view must never activate
  const rogue = makeElement({ 'data-fl-view': 'sneaky' }, doc);
  root.appendChild(rogue);
  return { root, tabs, views, rogue, doc };
}

let headOf = null;

// ---------- Pure route parsing ----------
test('U04: parseRoute whitelists only known Focus Lab views', () => {
  for (const v of Nav.VIEWS) assert.equal(Nav.parseRoute('#/' + v), v);
});

test('U04: untrusted routes fall back to default view', () => {
  assert.equal(Nav.parseRoute('#/plans'), 'plans');
  assert.equal(Nav.parseRoute('plans?x=1'), 'plans');
  assert.equal(Nav.parseRoute('#!//study'), 'plans');
  assert.equal(Nav.parseRoute('#/weekly'), 'intentions');
  for (const bad of [null, undefined, '', '#', '//evil', '#/unknown', '#/plans../../x', '42']) {
    assert.ok(Nav.isView(Nav.parseRoute(bad)), 'fallback for ' + String(bad));
  }
});

test('U04: formatRoute round-trips and resists non-whitelist values', () => {
  assert.equal(Nav.formatRoute('reading'), '#/reading');
  assert.equal(Nav.formatRoute('sneaky'), '#/plans');
});

// ---------- State restoration ----------
test('U04: save/restore active view via store', () => {
  const store = new Map();
  const fake = { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null };
  assert.equal(Nav.resolveActiveView('#/sports', fake), 'sports');
  assert.equal(Nav.loadSavedRoute(fake), 'sports');
  assert.equal(Nav.resolveActiveView('', fake), 'sports');
  // Never persist non-whitelist state
  assert.equal(Nav.resolveActiveView('#/rogue', fake), 'plans');
  assert.notEqual(Nav.loadSavedRoute(fake), 'rogue');
});

test('U04: memory state restoration', () => {
  Nav.saveStateMemory('projects');
  assert.equal(Nav.loadStateMemory(), 'projects');
});

// ---------- applyView on fake DOM ----------
test('U04: applyView toggles only whitelisted views and rogue stays hidden', () => {
  const { root, tabs, views, rogue, doc } = buildLabDoc();
  const res = Nav.applyView(root, 'reading', doc);
  assert.equal(res.view, 'reading');
  for (const v of Nav.VIEWS) {
    assert.equal(views[v].hidden, v !== 'reading');
    assert.equal(views[v].getAttribute('aria-hidden'), v !== 'reading' ? 'true' : 'false');
  }
  assert.equal(tabs.reading.getAttribute('tabindex'), '0');
  assert.equal(tabs.plans.getAttribute('tabindex'), '-1');
  assert.equal(tabs.reading.getAttribute('aria-selected'), 'true');
  // rogue: unlisted view never shown
  assert.equal(rogue.hidden, true);
  assert.equal(Nav.applyView(root, 'sneaky', doc).view, 'plans');
});

// ---------- keyboard-friendly focus ----------
test('U04: focusActiveView focuses the active view heading heading text', () => {
  const { root, views, doc } = buildLabDoc();
  const heading = Nav.focusActiveView(root, 'sports', doc);
  assert.ok(heading, 'heading focused');
  assert.equal(heading.focused, true);
  assert.equal(views.sports.hidden, false);
});

// ---------- binding & hash sync ----------
test('U04: bind applies restored state and keyboard arrows switch tabs', () => {
  const location = { hash: '#/intentions' };
  location.hash = '#/intentions';
  const win = { location, listeners: {}, addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }, removeEventListener() {} };
  Object.defineProperty(win.location, 'hash', {
    set(v) { this._hash = v; }, get() { return this._hash; },
  });
  win.location.hash = '#/intentions';

  const { root, tabs, views, doc } = buildLabDoc();
  const store = {
    data: {},
    setItem(k, v) { this.data[k] = v; },
    getItem(k) { return this.data[k] ?? null; }
  };
  Nav.bind(root, doc, win, store);
  assert.equal(views.intentions.hidden, false);
  assert.equal(views.plans.hidden, true);

  // click another tab -> whitelist passthrough only
  let prevented = false;
  const event = {
    target: tabs.projects,
    preventDefault() { prevented = true; }
  };
  for (const fn of root.listeners['click']) fn(event);
  assert.ok(prevented);
  assert.equal(views.projects.hidden, false);
  assert.equal(win.location.hash, '#/projects');
  assert.equal(store.getItem('fl.activeView'), '#/projects');

  // arrow key navigation from projects wraps back to plans
  const keyEvent = { key: 'ArrowRight', target: tabs.projects, preventDefault() {} };
  for (const fn of root.listeners['keydown']) fn(keyEvent);
  assert.equal(views.plans.hidden, false);
  assert.equal(tabs.plans.focused, true);
  assert.equal(win.location.hash, '#/plans');

  // hashchange -> apply restored state
  win.location.hash = '#/reading';
  for (const fn of win.listeners['hashchange'] || []) fn();
  assert.equal(views.reading.hidden, false);
});

// ---------- invariants ----------
test('U04: module never touches main seven navigation sections', () => {
  assert.ok(!/\[\s*data-section/.test(file) && !/data-app-section/.test(file), 'no data-section selectors');
  assert.ok(file.includes('data-fl-view'));
});

test('U04: implementation uses textContent, no untrusted innerHTML APIs', () => {
  assert.ok(!/\.innerHTML\s*=/.test(file));
  assert.ok(file.includes('textContent'));
});
