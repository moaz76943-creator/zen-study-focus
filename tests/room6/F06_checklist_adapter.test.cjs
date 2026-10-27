'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ADAPTER_PATH = path.join(
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
  'checklist_adapter.js'
);
const ENGINE_PATH = path.join(
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
  'room5',
  'focus_plan_checklist_engine.js'
);

const Adapter = require(ADAPTER_PATH);
const Engine = require(ENGINE_PATH);

const CHECKLIST_TITLE = 'Evening Reset';

const makeChecklist = () => {
  const created = Engine.createChecklistFromTemplate('plan_deep_block', { title: CHECKLIST_TITLE });
  assert.equal(created.ok, true);
  let checklist = created.checklist;
  checklist = Engine.toggleItem(checklist, checklist.items[0].id).checklist;
  checklist = Engine.toggleItem(checklist, checklist.items[1].id).checklist;
  return checklist;
};

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the focus checklist adapter');
  };
  const createElement = (tag) => {
    const node = {
      tagName: String(tag).toLowerCase(),
      children: [],
      attributes: {},
      textContent: '',
      setAttribute(name, value) {
        this.attributes[String(name)] = String(value);
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      }
    };
    Object.defineProperty(node, 'innerHTML', { get: forbidden, set: forbidden });
    return node;
  };
  return { createElement };
};

const flattenPlan = (node, visit = [], stack = []) => {
  assert.ok(node && typeof node === 'object' && !Array.isArray(node), 'plan nodes are plain objects');
  const expectedKeys = ['attrs', 'children', 'tag', 'text'].filter((key) => key in node).sort();
  assert.deepEqual(Object.keys(node).sort(), expectedKeys);
  assert.equal(typeof node.tag, 'string');
  assert.ok(/^[a-z][a-z0-9-]*$/.test(node.tag), `native tag expected, got ${node.tag}`);
  if ('text' in node) assert.equal(typeof node.text, 'string');
  for (const [name, value] of Object.entries(node.attrs || {})) {
    assert.equal(typeof value, 'string', `attribute ${name} must be a string`);
    assert.ok(!/^(href|src|srcset|style)$/i.test(name), `attribute ${name} is forbidden in the render plan`);
    assert.ok(!/https?:/i.test(String(value)), `attribute ${name} must not embed a URL`);
  }
  visit.push({ node, path: `${stack.join('/')}/${node.tag}` });
  for (const child of node.children || []) flattenPlan(child, visit, stack.concat(node.tag));
  return visit;
};

test('F06 adapter binds the real merged B07 focus plan checklist engine', () => {
  assert.equal(typeof Engine.toggleItem, 'function');
  assert.equal(typeof Engine.clearCompleted, 'function');
  assert.equal(Adapter.schemaVersion, Engine.SCHEMA_VERSION);
  assert.equal(Adapter.schemaVersion, 1);
  assert.equal(Adapter.engine, Engine, 'adapter must operate on the actual engine module, not a mock');
  assert.deepEqual(Adapter.INTENT_TYPES, {
    TOGGLE_ITEM: 'focus-checklist/toggle-item',
    CLEAR_COMPLETED: 'focus-checklist/clear-completed'
  });
  assert.equal(typeof Adapter.createToggleItemIntent, 'function');
  assert.equal(typeof Adapter.createClearCompletedIntent, 'function');
  assert.throws(() => Adapter.createChecklistAdapter(null), /engine/i);
});

test('viewmodel is derived from the engine summary without fabrication', () => {
  const checklist = makeChecklist();
  const before = JSON.stringify(checklist);
  const vm = Adapter.createChecklistViewModel(checklist);
  assert.equal(vm.ok, true);
  assert.equal(Object.isFrozen(vm.viewmodel), true);
  assert.deepEqual(vm.viewmodel.summary, Engine.summarizeChecklist(checklist));
  assert.equal(vm.viewmodel.checklistId, checklist.id);
  assert.equal(vm.viewmodel.title, CHECKLIST_TITLE);
  assert.equal(vm.viewmodel.progress.percentDone, 33.33);
  assert.equal(vm.viewmodel.progress.isStarted, true);
  assert.equal(vm.viewmodel.progress.isComplete, false);
  assert.equal(vm.viewmodel.progress.nextItemId, checklist.items[2].id);
  assert.equal(vm.viewmodel.progress.nextItemLabel, checklist.items[2].text);
  assert.equal(vm.viewmodel.summary.totalMinutes, 11);
  assert.equal(vm.viewmodel.summary.pendingMinutes, 8);
  assert.deepEqual(
    vm.viewmodel.items.map((item) => [item.id, item.text, item.done, item.minutes, item.note]),
    checklist.items.map((item) => [item.id, item.text, item.done, item.minutes, item.note])
  );
  assert.equal(JSON.stringify(checklist), before, 'the source checklist must never be mutated');
});

test('viewmodel normalizes raw user specs through the engine', () => {
  const spec = {
    title: ` ${CHECKLIST_TITLE} `,
    items: [{ text: ' Clear the desk ', minutes: 2 }, { text: 'Log the block' }]
  };
  const vm = Adapter.createChecklistViewModel(spec);
  assert.equal(vm.ok, true);
  assert.equal(vm.viewmodel.title, CHECKLIST_TITLE);
  const twin = Engine.createChecklist({
    title: CHECKLIST_TITLE,
    items: [{ text: 'Clear the desk', minutes: 2 }, { text: 'Log the block' }]
  }).checklist;
  assert.equal(Engine.validateChecklist(twin).ok, true);
  assert.deepEqual(
    vm.viewmodel.items.map((item) => item.id),
    twin.items.map((item) => item.id),
    'ids must come from the real engine'
  );
  const toggled = Adapter.applyIntent(spec, Adapter.createToggleItemIntent(twin.items[0].id));
  assert.equal(toggled.ok, true);
  assert.equal(Engine.validateChecklist(toggled.checklist).ok, true);
});

test('invalid checklists surface real engine errors verbatim', () => {
  const emptyTitle = Adapter.createChecklistViewModel({ title: '   ', items: [{ text: 'x' }] });
  assert.equal(emptyTitle.ok, false);
  assert.deepEqual(
    emptyTitle.errors,
    Engine.createChecklist({ title: '   ', items: [{ text: 'x' }] }).errors
  );
  assert.equal(emptyTitle.errors[0].code, 'TITLE_REQUIRED');
  const emptyItems = Adapter.createChecklistViewModel({ title: 'Valid', items: [] });
  assert.equal(emptyItems.ok, false);
  assert.equal(emptyItems.errors[0].code, 'ITEMS_EMPTY');
  const malformedItems = Adapter.createChecklistViewModel({ title: 'Valid', items: 'nope' });
  assert.equal(malformedItems.ok, false);
  assert.equal(malformedItems.errors[0].code, 'ITEMS_INVALID');
  assert.equal(Engine.summarizeChecklist({ title: '', items: [{ text: 'x' }] }), null);
});

test('toggle intents flip items explicitly with engine semantics and no mutation', () => {
  const checklist = makeChecklist();
  const pendingId = checklist.items[2].id;
  const before = JSON.stringify(checklist);
  assert.equal(checklist.items[2].done, false);

  const on = Adapter.applyIntent(checklist, Adapter.createToggleItemIntent(pendingId));
  assert.equal(on.ok, true);
  assert.equal(on.intentType, 'focus-checklist/toggle-item');
  assert.equal(on.changed, true);
  assert.equal(on.checklist.items[2].done, true);
  assert.equal(JSON.stringify(checklist), before, 'the persisted checklist must never be mutated');
  assert.deepEqual(on.checklist, Engine.toggleItem(checklist, pendingId).checklist);
  assert.equal(Engine.validateChecklist(on.checklist).ok, true);

  const off = Adapter.applyIntent(on.checklist, Adapter.createToggleItemIntent(pendingId));
  assert.equal(off.ok, true);
  assert.equal(off.changed, true);
  assert.equal(off.checklist.items[2].done, false);
  assert.deepEqual(off.checklist, Engine.toggleItem(on.checklist, pendingId).checklist);

  const twin = Engine.toggleItem(checklist, pendingId).checklist;
  const doneId = twin.items[0].id;
  assert.equal(doneId, checklist.items[0].id);

  const missing = Adapter.applyIntent(checklist, Adapter.createToggleItemIntent('pitm_00000000'));
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.errors, Engine.toggleItem(checklist, 'pitm_00000000').errors);
  assert.equal(missing.errors[0].code, 'ITEM_NOT_FOUND');
  assert.equal(JSON.stringify(checklist), before);

  const malformed = Adapter.applyIntent(checklist, { type: Adapter.INTENT_TYPES.TOGGLE_ITEM, itemId: '   ' });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.errors[0].code, 'ITEM_ID_INVALID');
  assert.equal(JSON.stringify(checklist), before);
});

test('clear-completed intent resets done items through the engine only', () => {
  const checklist = makeChecklist();
  const before = JSON.stringify(checklist);
  const cleared = Adapter.applyIntent(checklist, Adapter.createClearCompletedIntent());
  assert.equal(cleared.ok, true);
  assert.equal(cleared.intentType, 'focus-checklist/clear-completed');
  assert.equal(cleared.changed, true);
  assert.deepEqual(
    cleared.checklist.items.map((item) => item.done),
    checklist.items.map(() => false)
  );
  assert.deepEqual(cleared.checklist, Engine.clearCompleted(checklist).checklist);
  assert.equal(Engine.validateChecklist(cleared.checklist).ok, true);
  assert.equal(JSON.stringify(checklist), before);

  const stalled = Adapter.applyIntent(cleared.checklist, Adapter.createClearCompletedIntent());
  assert.equal(stalled.ok, true);
  assert.equal(stalled.changed, false, 'clearing with nothing done is honest no-op');
  assert.equal(JSON.stringify(stalled.checklist), JSON.stringify(cleared.checklist));

  const allDone = checklist.items.reduce(
    (acc, item) => (item.done ? acc : Engine.toggleItem(acc, item.id).checklist),
    checklist
  );
  assert.equal(Adapter.createChecklistViewModel(allDone).viewmodel.progress.isComplete, true);
  const reopened = Adapter.applyIntent(allDone, Adapter.createClearCompletedIntent());
  assert.equal(Adapter.createChecklistViewModel(reopened.checklist).viewmodel.progress.percentDone, 0);
});

test('toggle works on schema-wrapped documents through the engine migration path', () => {
  const checklist = makeChecklist();
  const pendingId = checklist.items[2].id;
  const versioned = { schemaVersion: 1, checklist };
  const toggled = Adapter.applyIntent(versioned, Adapter.createToggleItemIntent(pendingId));
  assert.equal(toggled.ok, true);
  assert.equal(toggled.checklist.items[2].done, true);
  assert.equal(Engine.validateChecklist(toggled.checklist).ok, true);

  const legacy = {
    schemaVersion: 0,
    name: ` ${CHECKLIST_TITLE} `,
    tasks: [{ label: ' Clear the desk ', minutes: 2, done: true }]
  };
  const vm = Adapter.createChecklistViewModel(legacy);
  assert.equal(vm.ok, true);
  assert.equal(vm.viewmodel.title, CHECKLIST_TITLE);
  assert.equal(vm.viewmodel.items[0].done, true);
  assert.equal(vm.viewmodel.items[0].text, 'Clear the desk');
});

test('unknown or malformed intents are rejected without touching the checklist', () => {
  const checklist = makeChecklist();
  const before = JSON.stringify(checklist);
  const hijack = Adapter.applyIntent(checklist, { type: 'focus-checklist/delete-everything' });
  assert.equal(hijack.ok, false);
  assert.deepEqual(hijack.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);
  assert.equal(Adapter.applyIntent(checklist, null).ok, false);
  assert.equal(Adapter.applyIntent(checklist, {}).ok, false);
  assert.equal(JSON.stringify(checklist), before);
});

test('render plan is a declarative innerHTML-free DOM contract', () => {
  const checklist = makeChecklist();
  const vm = Adapter.createChecklistViewModel(checklist).viewmodel;
  const plan = Adapter.safeRenderPlan(vm);
  const nodes = flattenPlan(plan);
  assert.equal(plan.tag, 'section');
  assert.equal(plan.attrs['aria-label'], CHECKLIST_TITLE);
  assert.equal('dir' in plan.attrs, false, 'direction must stay inherited unless explicitly requested');
  const rtlPlan = Adapter.safeRenderPlan(vm, { dir: 'rtl' });
  assert.equal(rtlPlan.attrs.dir, 'rtl');
  const text = (at) => nodes[at].node.text;
  assert.equal(text(1), CHECKLIST_TITLE);
  assert.equal(text(2), '2 of 6 done - 33.33%');
  const progressNode = nodes.find((entry) => entry.node.tag === 'progress');
  assert.deepEqual(progressNode.node.attrs, { class: 'focus-checklist-progress-bar', max: '6', value: '2' });
  const listNode = nodes.find((entry) => entry.node.tag === 'ul');
  assert.equal(listNode.node.children.length, 6);
  const listItems = listNode.node.children;
  assert.deepEqual(
    listItems.map((li) => li.attrs['data-item-id']),
    vm.items.map((item) => item.id)
  );
  const doneItem = listItems.find((li) => li.attrs.class === 'focus-checklist-item is-done');
  const pendingItem = listItems.find((li) => li.attrs.class === 'focus-checklist-item is-pending');
  const findByClass = (subtree, className) => {
    const seen = [];
    const walk = (node) => {
      if (node.attrs && node.attrs.class === className) seen.push(node);
      for (const child of node.children || []) walk(child);
    };
    walk(subtree);
    return seen[0];
  };
  assert.equal(doneItem.children.find((child) => child.tag === 'input').attrs.checked, 'checked');
  assert.equal('checked' in pendingItem.children.find((child) => child.tag === 'input').attrs, false);
  assert.equal(findByClass(pendingItem, 'focus-checklist-item-text').text, vm.items[2].text);
  assert.equal(findByClass(pendingItem, 'focus-checklist-item-minutes').text, '3 min');
  assert.equal(findByClass(doneItem, 'focus-checklist-item-minutes'), undefined);
  const setAttributeNames = new Set(nodes.flatMap((entry) => Object.keys(entry.node.attrs || {})));
  assert.equal(setAttributeNames.has('style'), false);
  assert.equal(JSON.stringify(plan).includes('http'), false);
});

test('mounting uses only safe DOM primitives and textContent, never innerHTML', () => {
  const checklist = makeChecklist();
  const plan = Adapter.safeRenderPlan(Adapter.createChecklistViewModel(checklist).viewmodel);
  const doc = makeFakeDocument();
  const root = Adapter.mountChecklistView(doc.createElement('div'), plan, doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes['aria-label'], CHECKLIST_TITLE);
  assert.equal('dir' in root.attributes, false);
  assert.equal(root.children.length, 4);
  assert.equal(root.children[0].textContent, CHECKLIST_TITLE);
  assert.equal(root.children[1].textContent, '2 of 6 done - 33.33%');
  assert.equal(root.children[2].attributes.value, '2');
  assert.equal(root.children[3].children.length, 6);
  const firstLi = root.children[3].children[0];
  assert.equal(firstLi.children[0].tagName, 'input');
  assert.equal(firstLi.children[0].attributes.checked, 'checked');
  assert.equal(firstLi.children[1].children[0].textContent, checklist.items[0].text);
  const pendingLi = root.children[3].children[2];
  assert.equal('checked' in pendingLi.children[0].attributes, false);
  assert.equal(pendingLi.children[1].children[0].textContent, checklist.items[2].text);
  assert.equal(pendingLi.children[1].children[1].textContent, '3 min');
  const rtlRoot = Adapter.mountChecklistView(doc.createElement('div'), Adapter.safeRenderPlan(Adapter.createChecklistViewModel(checklist).viewmodel, { dir: 'rtl' }), doc);
  assert.equal(rtlRoot.attributes.dir, 'rtl');
  assert.throws(() => Adapter.mountChecklistView(doc.createElement('div'), plan, null), /document/i);
});

test('adapter source stays offline, persistence-free and innerHTML-free', () => {
  const source = fs.readFileSync(ADAPTER_PATH, 'utf8');
  assert.equal(/innerHTML/.test(source), false);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|WebSocket|importScripts/.test(source), false);
  assert.equal(/https?:\/\//.test(source), false);
  const requireArgs = [...source.matchAll(/require\(\s*([^)]+?)\s*\)/g)].map((match) => match[1]);
  assert.ok(requireArgs.length >= 1, 'adapter must load the engine module via require');
  const targets = new Set();
  for (const arg of requireArgs) {
    const literal = arg.match(/^['"]([^'"]+)['"]$/);
    if (literal) {
      targets.add(literal[1]);
      continue;
    }
    const declared = source.match(new RegExp(`(?:const|let|var)\\s+${arg.trim()}\\s*=\\s*['"]([^'"]+)['"]`));
    assert.ok(declared, `require target ${arg} must resolve to a local module path`);
    targets.add(declared[1]);
  }
  assert.deepEqual([...targets], ['../room5/focus_plan_checklist_engine.js']);
  for (const target of targets) {
    assert.equal(fs.existsSync(path.join(path.dirname(ADAPTER_PATH), target)), true, 'engine module must exist');
  }
});
