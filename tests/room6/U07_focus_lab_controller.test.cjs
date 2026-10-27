'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(
  ROOT, 'android', 'app', 'src', 'main', 'assets', 'web', 'js', 'room6', 'focus_lab_controller.js'
);
const SIBLINGS = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'web', 'js', 'room6');

const Controller = require(FILE);
const Read = require(path.join(SIBLINGS, '..', 'room5', 'reading_bookmarks_engine.js'));
const ReadingAdapter = require(path.join(SIBLINGS, 'reading_view_adapter.js'));

function makeDocument() {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the Focus Lab controller');
  };
  function makeNode(tag) {
    const node = {
      tagName: String(tag).toLowerCase(),
      attributes: {},
      children: [],
      parentElement: null,
      parentNode: null,
      textContent: '',
      hidden: false,
      setAttribute(name, value) {
        this.attributes[String(name)] = String(value);
      },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, String(name))
          ? this.attributes[String(name)] : null;
      },
      removeAttribute(name) {
        delete this.attributes[String(name)];
      },
      hasAttribute(name) {
        return Object.prototype.hasOwnProperty.call(this.attributes, String(name));
      },
      appendChild(child) {
        child.parentElement = this;
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
        return child;
      },
      querySelectorAll(selector) {
        const matches = [];
        const key = selector.replace(/^\[|\]$/g, '');
        const walk = (element) => {
          for (const child of element.children) {
            if (child.attributes && child.attributes[key] !== undefined) matches.push(child);
            walk(child);
          }
        };
        walk(this);
        return matches;
      },
      addEventListener(type, listener) {
        this.events_ = this.events_ || new Map();
        if (!this.events_.has(type)) this.events_.set(type, []);
        this.events_.get(type).push(listener);
      },
      removeEventListener(type, listener) {
        if (!this.events_) return;
        const list = this.events_.get(type) || [];
        this.events_.set(type, list.filter((item) => item !== listener));
      },
      dispatchEvent(event) {
        const { type, target } = event;
        let node = target;
        while (node) {
          const list = node.events_ ? node.events_.get(type) : null;
          if (list) for (const listener of list.slice()) listener(event);
          if (node === this && event.bubbles !== true) break;
          node = node.parentElement;
        }
        return true;
      },
      focus() {
        this.focused = true;
      }
    };
    Object.defineProperty(node, 'innerHTML', { get: forbidden, set: forbidden });
    return node;
  }
  return { createElement: makeNode };
}

function clickOn(element, owner) {
  const event = { type: 'click', target: element, preventCount: 0, bubbles: true };
  event.preventDefault = () => { event.preventCount++; };
  owner.dispatchEvent(event);
  return event;
}

const makeBook = () => Read.createBook({
  title: 'Focus Laboratorium', totalPages: 120, currentPage: 12
}).book;

test('controller is offline, pure UMD and exposes the composition factory', () => {
  assert.equal(typeof Controller.createFocusLabController, 'function');
  assert.deepEqual(Controller.VIEWS, ['plans', 'reading', 'intentions', 'sports', 'projects']);
  assert.equal(Controller.DEFAULT_VIEW, 'plans');
  const source = fs.readFileSync(FILE, 'utf8');
  assert.equal(/innerHTML/.test(source), false, 'controller source must never mention innerHTML');
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false);
  assert.equal(/EmployeeNotification|NativeBridge|AndroidNode|requireAndroidNative/.test(source), false);
});

test('it runs with absolutely no optional adapters, no native and no storage', () => {
  const doc = makeDocument();
  const controller = Controller.createFocusLabController({
    documentFactory: doc, navigationModule: null, domModule: null,
    registryModule: null, readingModule: null
  });
  assert.deepEqual(controller.adapterSnapshot, {
    navigation: 'absent',
    dom: 'absent',
    registry: 'absent',
    reading: 'absent'
  }, 'missing optional modules are controlled explicitly, independently of checkout contents');
  assert.deepEqual(Object.keys(controller.getState()).sort(), ['activeView', 'error', 'staged']);
  assert.equal(controller.getActiveView(), 'plans');
  assert.equal(controller.getAdapter('reading'), null);
  assert.equal(controller.getAdapter('navigation'), null);
  assert.equal(controller.composeRegistrySnapshot(), null);
  assert.equal(Object.isFrozen(controller.getState()), true);
  assert.equal(Object.isFrozen(controller.adapterSnapshot), true);
});

test('current checkout composes all four existing optional modules', () => {
  const controller = Controller.createFocusLabController({ documentFactory: makeDocument() });
  assert.deepEqual(controller.adapterSnapshot, {
    navigation: 'composed', dom: 'composed', registry: 'composed', reading: 'composed'
  });
  for (const name of ['navigation', 'dom', 'registry', 'reading']) {
    assert.ok(controller.getAdapter(name), name + ' module composes');
  }
  assert.ok(controller.composeRegistrySnapshot());
});

test('simulated tab clicks switch views accessibly and nothing mutates without a real event', () => {
  const doc = makeDocument();
  const controller = Controller.createFocusLabController({ documentFactory: doc });
  const root = doc.createElement('main');
  const views = {};
  const tabs = {};
  for (const view of Controller.VIEWS) {
    const section = doc.createElement('section');
    section.setAttribute('data-fl-view', view);
    const heading = doc.createElement('h2');
    heading.textContent = `View: ${view}`;
    section.appendChild(heading);
    root.appendChild(section);
    views[view] = section;
    const tab = doc.createElement('button');
    tab.setAttribute('data-fl-tab', view);
    tab.setAttribute('aria-selected', 'false');
    root.appendChild(tab);
    tabs[view] = tab;
  }
  const rogueTab = doc.createElement('button');
  rogueTab.setAttribute('data-fl-tab', 'plans" onclick="alert(1)');
  root.appendChild(rogueTab);

  const planSnapshot = () => JSON.stringify(root.children.map((child) => ({
    hidden: child.hidden,
    attributes: { ...child.attributes }
  })));
  const beforeTabs = planSnapshot();
  assert.equal(controller.getActiveView(), 'plans', 'bind itself causes no mutation before an event');
  controller.bind(root, null);

  clickOn(tabs.reading, root);
  assert.equal(controller.getActiveView(), 'reading', 'explicit simulated click is an explicit action');
  assert.equal(views.plans.hidden, true);
  assert.equal(views.reading.hidden, false);
  assert.equal(views.reading.attributes['aria-hidden'], 'false');
  assert.equal(views.sports.attributes['aria-hidden'], 'true');
  assert.equal(tabs.reading.attributes['aria-selected'], 'true');
  assert.equal(tabs.reading.attributes.tabindex, '0');
  assert.equal(tabs.plans.attributes['aria-selected'], 'false');
  assert.equal(tabs.plans.attributes.tabindex, '-1');
  assert.equal(views.plans.attributes['data-active'], undefined);
  assert.equal(views.reading.attributes['data-active'], 'true');

  clickOn(rogueTab, root);
  assert.equal(controller.getActiveView(), 'plans', 'non-whitelisted tab falls back to the default view');

  const keyboardEvent = {
    type: 'keydown', key: 'ArrowRight', target: tabs.plans, preventCount: 0
  };
  keyboardEvent.preventDefault = () => { keyboardEvent.preventCount++; };
  root.dispatchEvent(keyboardEvent);
  assert.equal(controller.getActiveView(), 'reading', 'roving keyboard focus switches like a real tablist');
  assert.equal(tabs.reading.focused, true, 'newly active tab receives focus');
  delete tabs.reading.focused;

  assert.notEqual(planSnapshot(), beforeTabs);
});

test('hashchange and direct switchView are explicit and route-safe', () => {
  const doc = makeDocument();
  const memory = new Map();
  const controller = Controller.createFocusLabController({
    documentFactory: doc,
    store: {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => { memory.set(key, String(value)); }
    }
  });
  assert.equal(controller.switchView('intentions'), 'intentions');
  assert.equal(memory.get('fl.activeView'), '#/intentions');
  assert.equal(controller.switchView('#/sports?x=1'), 'sports');
  assert.equal(controller.switchView('junk<script>'), 'plans', 'untrusted route falls back to default');
  assert.equal(controller.switchView('read'), 'reading');

  const root = doc.createElement('main');
  const plans = doc.createElement('section');
  plans.setAttribute('data-fl-view', 'plans');
  const reading = doc.createElement('section');
  reading.setAttribute('data-fl-view', 'reading');
  root.appendChild(plans);
  root.appendChild(reading);
  const plan = controller.applyView(root, 'weekly-reading');
  assert.equal(plan.view, 'plans');
  assert.equal(reading.hidden, true);
  assert.equal(controller.getActiveView(), 'reading', 'applyView renders but must not silently commit state');
});

test('error panel is actionable: retry fires only through a real simulated click on the retry button', () => {
  const doc = makeDocument();
  const controller = Controller.createFocusLabController({ documentFactory: doc });
  const owner = doc.createElement('div');
  let retryCount = 0;
  const panel = controller.mountErrorPanel(owner, {
    code: 'ENGINE_LINK_FAILED',
    message: 'Could not link the reading engine'
  }, () => { retryCount++; });

  assert.equal(panel.tagName, 'section');
  assert.equal(panel.attributes['data-focus-lab-error-code'], 'ENGINE_LINK_FAILED');
  const message = panel.children[0];
  assert.equal(message.attributes.role, 'alert');
  assert.equal(message.textContent, 'Could not link the reading engine');
  const retryButton = panel.children[1];
  assert.equal(retryButton.textContent, 'Retry');
  assert.equal(retryButton.tagName, 'button');
  assert.equal(retryButton.attributes.type, 'button');
  assert.equal(retryButton.attributes['data-focus-lab-error-action'], 'focus-lab-error-retry');
  assert.equal(retryCount, 0, 'mounting an error panel must not pre-fire the retry action');

  clickOn(message, panel);
  assert.equal(retryCount, 0, 'clicking the message, not the retry button, must not retry');

  clickOn(owner, panel);
  assert.equal(retryCount, 0);

  clickOn(retryButton, panel);
  assert.equal(retryCount, 1, 'exactly one explicit retry per retry click');

  const dismissButton = panel.children[2];
  clickOn(dismissButton, panel);
  assert.equal(retryCount, 1);
  assert.equal(controller.getState().error, null, 'dismiss clears the error record');
  assert.deepEqual(owner.children, [], 'dismiss removes the panel from the DOM');
});

test('whole view state stays frozen: no mutation staged or applied without explicit user action', () => {
  const doc = makeDocument();
  const controller = Controller.createFocusLabController({ documentFactory: doc });
  const book = makeBook();
  const bookBefore = JSON.stringify(book);

  const staged = controller.stageAction('reading-intent', {
    book, intent: ReadingAdapter.createProgressIntent(40)
  });
  assert.equal(staged.applied, false);
  assert.equal(JSON.stringify(book), bookBefore, 'staging must not touch the book');
  assert.equal(controller.getState().staged.kind, 'reading-intent');

  assert.equal(controller.getState().activeView, 'plans');
  controller.parseRoute('sport');
  assert.equal(controller.getActiveView(), 'plans', 'parsing routes must never commit');

  const outcome = controller.commitStaged();
  assert.equal(outcome.ok, true);
  assert.equal(outcome.applied, true);
  assert.equal(outcome.detail.ok, true);
  assert.equal(outcome.detail.book.currentPage, 40, 'only the explicit commit mutated anything');
  assert.equal(controller.getState().staged, null);

  controller.stageAction('reading-intent', { book, intent: ReadingAdapter.createProgressIntent(41) });
  const discarded = controller.discardStaged();
  assert.equal(discarded.ok, true);
  assert.equal(discarded.discarded.kind, 'reading-intent');
  assert.equal(JSON.stringify(book), bookBefore, 'discarding a staged record must still not touch the book');
});

test('commitStaged gates reading intents that the real adapter rejects, and unknown controllers fail fast', () => {
  const doc = makeDocument();
  const controller = Controller.createFocusLabController({ documentFactory: doc });
  const book = makeBook();
  const before = JSON.stringify(book);
  controller.stageAction('reading-intent', { book, intent: ReadingAdapter.createProgressIntent(Number.NaN) });
  const outcome = controller.commitStaged();
  assert.equal(outcome.applied, false, 'rejected intent must not be applied');
  assert.equal(outcome.detail.ok, false);
  assert.equal(JSON.stringify(book), before);
  assert.equal(controller.commitStaged().ok, false, 'the gate consumed the staged record');

  const noDoc = Controller.createFocusLabController({ documentFactory: doc });
  assert.throws(() => Controller.createFocusLabController({ documentFactory: null }), /document/i);
  assert.equal(typeof noDoc.bind, 'function');
});
