'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MODULE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'web',
  'js',
  'room6',
  'focus_lab_dom.js'
);

const LabDom = require(MODULE_PATH);

const HOSTILE_LABEL = '<img src=x onerror=alert(1)> unfinished language drill"';
const HOSTILE_BODY = 'nice note \u202Eeval(bad)\u202C<script>alert(1)</script> keep going \u0007';
const TASK_ID = 'task_from_note_1700000000000_42';
const NOTE_ID = 'note_5';

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be touched by focus_lab_dom');
  };
  const createElement = (tag) => {
    const node = {
      tagName: String(tag).toLowerCase(),
      children: [],
      attributes: {},
      textContent: '',
      parentNode: null,
      parentElement: null,
      listeners: {},
      setAttribute(name, value) {
        this.attributes[String(name)] = String(value);
      },
      getAttribute(name) {
        const key = String(name);
        return key in this.attributes ? this.attributes[key] : null;
      },
      appendChild(child) {
        child.parentNode = this;
        child.parentElement = this;
        this.children.push(child);
        return child;
      },
      addEventListener(type, listener) {
        (this.listeners[type] = this.listeners[type] || []).push(listener);
      },
      removeEventListener(type, listener) {
        const list = this.listeners[type] || [];
        const at = list.indexOf(listener);
        if (at >= 0) list.splice(at, 1);
      },
      dispatch(event) {
        let node = event.target;
        const path = [];
        while (node) {
          path.push(node);
          node = node.parentElement;
        }
        for (const ancestor of path) {
          for (const listener of (ancestor.listeners[event.type] || []).slice()) {
            listener(event);
          }
        }
      }
    };
    Object.defineProperty(node, 'innerHTML', { get: forbidden, set: forbidden });
    Object.defineProperty(node, 'outerHTML', { get: forbidden, set: forbidden });
    return node;
  };

  const click = (target) => {
    const event = { type: 'click', target, defaultPrevented: false };
    let root = target;
    let fired = false;
    while (root && !fired) {
      const list = (root.listeners.click || []).slice();
      for (const listener of list) {
        listener(event);
        fired = true;
      }
      root = root.parentElement;
    }
    return event;
  };

  return { createElement, click };
};

const taskIn = (root, nth) => root.children[nth];
const byClass = (node, className) => node.children.find((child) => child.attributes.class === className);

test('module exposes only safe factories and pure helpers', () => {
  assert.deepEqual(Object.keys(LabDom).sort(), [
    'ACTIONS', 'MAX_LABEL_LENGTH', 'createFocusLabDom', 'resolveDocument', 'sanitizeLabel'
  ]);
  assert.equal(LabDom.MAX_LABEL_LENGTH, 300);
  assert.deepEqual(LabDom.ACTIONS, {
    ADD_TASK: 'add-task',
    TOGGLE_TASK: 'toggle-task',
    REMOVE_TASK: 'remove-task',
    OPEN_NOTE: 'open-note',
    DELETE_NOTE: 'delete-note'
  });
  assert.throws(() => LabDom.createFocusLabDom({}), /document factory/i);
});

test('sanitizeLabel strips control and bidi-override characters and caps length', () => {
  assert.equal(LabDom.sanitizeLabel(`  ${HOSTILE_BODY}  `), 'nice note eval(bad)<script>alert(1)</script> keep going');
  assert.equal(LabDom.sanitizeLabel(null), '');
  assert.equal(LabDom.sanitizeLabel(42), '42');
  assert.equal(LabDom.sanitizeLabel({ hostile: 'object' }), '', 'objects are not stringified accidentally');
  const long = 'a'.repeat(400);
  const capped = LabDom.sanitizeLabel(long);
  assert.equal(capped.length, 300);
  assert.equal(LabDom.sanitizeLabel('short', 5), 'short');
  assert.equal(LabDom.sanitizeLabel('abcdefgh', 5), 'abcde');
});

test('createElement allows only safe tags and attributes, text via textContent', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const el = lab.createElement('p', { class: 'label', 'aria-label': HOSTILE_LABEL }, HOSTILE_LABEL);
  assert.equal(el.tagName, 'p');
  assert.equal(el.textContent, HOSTILE_LABEL, 'untrusted markup stays inert text');
  assert.equal(el.attributes['aria-label'], HOSTILE_LABEL);
  assert.equal(el.children.length, 0, 'labels never spawn child elements');
  assert.throws(() => lab.createElement('script', {}, 'x'), /safe tag list/i);
  assert.throws(() => lab.createElement('img', {}, 'x'), /safe tag list/i);
  assert.throws(() => lab.createElement('button', { onclick: 'alert(1)' }, 'x'), /inline event/i);
  assert.throws(() => lab.createElement('p', { href: 'javascript:alert(1)' }, 'x'), /forbidden/i);
  assert.throws(() => lab.createElement('p', { style: 'x' }, 'x'), /forbidden/i);
  assert.throws(() => lab.createElement('p', {}, 42), /textContent/i);
});

test('renderTaskList renders untrusted labels inert and as accessible rows', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const list = lab.renderTaskList(
    [
      { id: TASK_ID, title: ` ${HOSTILE_LABEL} ` },
      { id: 'task_done', label: 'Vocabulary review done', completed: true }
    ],
    { ariaLabel: 'Focus Lab tasks' }
  );
  assert.equal(list.tagName, 'ul');
  assert.equal(list.attributes['aria-label'], 'Focus Lab tasks');
  assert.equal(list.children.length, 2);

  const hostileRow = list.children[0];
  assert.equal(hostileRow.attributes['data-task-id'], TASK_ID);
  assert.equal(hostileRow.attributes['aria-label'].startsWith('Focus Lab task: '), true);
  const label = byClass(hostileRow, 'focus-lab-task-label');
  assert.equal(label.attributes.dir, 'auto');
  assert.equal(label.textContent, HOSTILE_LABEL, 'label is plain text, never markup');
  const toggle = byClass(hostileRow, 'focus-lab-task-toggle');
  assert.equal(toggle.attributes['data-action'], LabDom.ACTIONS.TOGGLE_TASK);
  assert.equal(toggle.attributes['aria-label'], `Toggle task: ${HOSTILE_LABEL}`);
  const remove = byClass(hostileRow, 'focus-lab-task-remove');
  assert.equal(remove.attributes['data-action'], LabDom.ACTIONS.REMOVE_TASK);
  assert.equal(remove.attributes['aria-label'], `Remove task: ${HOSTILE_LABEL}`);

  const doneRow = list.children[1];
  const doneLabel = byClass(doneRow, 'focus-lab-task-label is-complete');
  assert.equal(doneLabel.attributes.class, 'focus-lab-task-label is-complete');
  assert.equal(byClass(doneRow, 'focus-lab-task-toggle').textContent, '\u2611');

  const collectAttrs = (node) => {
    const found = [Object.entries(node.attributes || {})];
    for (const child of node.children || []) found.push(...collectAttrs(child));
    return found;
  };
  const attributeEntries = collectAttrs(list).flat();
  for (const [name, value] of attributeEntries) {
    assert.equal(/^on/i.test(name), false, `attribute ${name} must never be an event handler`);
    assert.equal(/javascript:/i.test(value), false, `attribute ${name} must not host script URLs`);
  }
  assert.equal(label.textContent.includes('onerror'), true, 'the hostile label stays visible as inert text, not as markup');
});

test('renderNoteCard keeps note body as inert textContent with aria-labels', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const card = lab.renderNoteCard({
    id: NOTE_ID,
    title: ` ${HOSTILE_LABEL} `,
    body: HOSTILE_BODY
  });
  assert.equal(card.tagName, 'article');
  assert.equal(card.attributes['data-note-id'], NOTE_ID);
  const title = byClass(card, 'focus-lab-note-title');
  assert.equal(title.textContent, HOSTILE_LABEL);
  const body = byClass(card, 'focus-lab-note-body');
  assert.equal(body.textContent, 'nice note eval(bad)<script>alert(1)</script> keep going');
  assert.equal(body.attributes['aria-label'], 'Note body: nice note eval(bad)<script>alert(1)</script> keep going');
  const open = byClass(card, 'focus-lab-note-open');
  assert.equal(open.attributes['data-action'], LabDom.ACTIONS.OPEN_NOTE);
  assert.equal(open.attributes['data-note-id'], NOTE_ID);
  const del = byClass(card, 'focus-lab-note-delete');
  assert.equal(del.attributes['aria-label'], `Delete note: ${HOSTILE_LABEL}`);
  assert.throws(() => LabDom.createFocusLabDom(doc).renderNoteCard(null), /note record/i);
});

test('mount requires a real element and appends via appendChild only', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const container = doc.createElement('div');
  const el = lab.createElement('p', {}, 'plain text is safe');
  assert.equal(lab.mount(container, el), el);
  assert.equal(container.children[0].textContent, 'plain text is safe');
  assert.throws(() => lab.mount(null, el), /target/i);
  assert.throws(() => LabDom.createFocusLabDom(null).mount(container, el), /document/i);
});

test('event delegation resolves data-action without inline handlers and can detach', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const list = lab.renderTaskList([{ id: TASK_ID, title: 'Grammar: past tense' }]);
  const seen = [];
  let deletes = 0;
  let opens = 0;
  const detach = lab.delegateEvents(list, {
    [LabDom.ACTIONS.TOGGLE_TASK]: (payload) => seen.push(['toggle', payload.id]),
    [LabDom.ACTIONS.REMOVE_TASK]: (payload) => seen.push(['remove', payload.id]),
    [LabDom.ACTIONS.DELETE_NOTE]: () => { deletes += 1; }
  });
  doc.click(byClass(list.children[0], 'focus-lab-task-toggle'));
  doc.click(byClass(list.children[0], 'focus-lab-task-remove'));
  doc.click(byClass(list.children[0], 'focus-lab-task-label'));
  assert.deepEqual(seen, [['toggle', TASK_ID], ['remove', TASK_ID]], 'delegation bubbles to the clicked action button only');
  assert.equal(deletes, 0, 'note actions cannot fire inside the task list');

  detach();
  assert.equal(list.listeners.click.length, 0, 'detach removes the delegated listener');
  assert.equal(seen.length, 2, 'no events after detach');
  assert.throws(() => lab.delegateEvents(null, {}), /root element/i);
  assert.throws(() => lab.delegateEvents(list, null), /handler map/i);
});

test('resolveActionTarget walks up safely and ignores non-action targets', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const container = lab.createElement('div', { 'data-action': 'add-task', 'data-task-id': 'root' });
  const inner = lab.createElement('span', {}, 'inner');
  container.appendChild(inner);
  assert.deepEqual(
    { action: lab.resolveActionTarget(inner, container).action, id: lab.resolveActionTarget(inner, container).element.getAttribute('data-task-id') },
    { action: 'add-task', id: 'root' }
  );
  assert.equal(lab.resolveActionTarget(null, container), null);
});

test('document-level delegation still works for a whole panel', () => {
  const doc = makeFakeDocument();
  const lab = LabDom.createFocusLabDom(doc);
  const panel = doc.createElement('section');
  const card = lab.renderNoteCard({ id: NOTE_ID, title: 'Declension drills', body: 'finish dative' });
  panel.appendChild(card);
  const opened = [];
  const detach = lab.delegateEvents(panel, {
    [LabDom.ACTIONS.OPEN_NOTE]: (payload) => opened.push(payload.noteId),
    [LabDom.ACTIONS.ADD_TASK]: () => opened.push('never')
  });
  doc.click(byClass(card, 'focus-lab-note-open'));
  assert.deepEqual(opened, [NOTE_ID]);
  detach();
  assert.equal(panel.listeners.click.length, 0);
});

test('focus_lab_dom source stays offline, event-delegation-only and innerHTML-free', () => {
  const source = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.equal(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB|Cookies/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts|EventSource|navigator\.sendBeacon/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false, 'no network endpoints hide in the source');
  assert.equal(/\seval\s*\(|new\s+Function/.test(source), false);
  assert.equal(/setAttribute\(\s*['"]on|\.on[A-Z]\w*\s*=/.test(source), false, 'no inline event handlers are ever set');
  const requireArgs = [...source.matchAll(/require\(\s*([^)]+?)\s*\)/g)];
  assert.equal(requireArgs.length, 0, 'the renderer is dependency-free, offline and loads nothing');
  assert.equal(/addEventListener/.test(source), true, 'events flow through delegated addEventListener');
});
