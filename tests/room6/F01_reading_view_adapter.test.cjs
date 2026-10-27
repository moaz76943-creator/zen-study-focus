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
  'reading_view_adapter.js'
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
  'reading_bookmarks_engine.js'
);

const Adapter = require(ADAPTER_PATH);
const Read = require(ENGINE_PATH);

const BOOK_TITLE = 'Deutsch A1 · Lesebuch';
const ARABIC_MARKER_LABEL = 'النصف';

const makeBook = () => {
  let book = Read.createBook({ title: ` ${BOOK_TITLE} `, totalPages: 320, currentPage: 80 }).book;
  for (const marker of [
    { page: 42, label: 'Kapitel 1 Start' },
    { page: 160, label: ` ${ARABIC_MARKER_LABEL} ` },
    { page: 300, label: 'Wortliste' }
  ]) {
    book = Read.addBookmark(book, marker).book;
  }
  return book;
};

const makeFakeDocument = () => {
  const forbidden = () => {
    throw new Error('innerHTML must never be used by the reading view adapter');
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

test('F01 adapter binds the real merged B03 reading bookmarks engine', () => {
  assert.equal(Adapter.schemaVersion, Read.SCHEMA_VERSION);
  assert.equal(Adapter.schemaVersion, 1);
  assert.equal(Adapter.engine, Read, 'adapter must operate on the actual engine module, not a mock');
  assert.deepEqual(Adapter.INTENT_TYPES, {
    PROGRESS: 'reading-view/progress',
    REGRESS: 'reading-view/progress-regress',
    ADD_MARKER: 'reading-view/add-marker',
    REMOVE_MARKER: 'reading-view/remove-marker'
  });
  for (const factory of ['createProgressIntent', 'createRegressIntent', 'createAddMarkerIntent', 'createRemoveMarkerIntent']) {
    assert.equal(typeof Adapter[factory], 'function');
  }
  assert.throws(() => Adapter.createReadingViewAdapter(null), /engine/i);
});

test('viewmodel is derived from the engine summary without fabrication', () => {
  const book = makeBook();
  const before = JSON.stringify(book);
  const vm = Adapter.createReadingViewModel(book);
  assert.equal(vm.ok, true);
  assert.equal(Object.isFrozen(vm.viewmodel), true);
  assert.deepEqual(vm.viewmodel.summary, Read.summarizeBook(book));
  assert.equal(vm.viewmodel.bookId, book.id);
  assert.equal(vm.viewmodel.title, BOOK_TITLE);
  assert.equal(vm.viewmodel.totalPages, 320);
  assert.equal(vm.viewmodel.currentPage, 80);
  assert.equal(vm.viewmodel.progress.percentComplete, 25);
  assert.equal(vm.viewmodel.progress.remainingPages, 240);
  assert.equal(vm.viewmodel.progress.isStarted, true);
  assert.equal(vm.viewmodel.progress.isComplete, false);
  assert.deepEqual(
    vm.viewmodel.markers.map((marker) => [marker.id, marker.page, marker.label]),
    book.bookmarks.map((marker) => [marker.id, marker.page, marker.label])
  );
  assert.deepEqual(
    vm.viewmodel.markers.map((marker) => marker.percentPosition),
    [13.13, 50, 93.75]
  );
  assert.equal(vm.viewmodel.markers[1].label, ARABIC_MARKER_LABEL);
  assert.equal(JSON.stringify(book), before, 'the source book must never be mutated');
});

test('viewmodel normalizes raw user specs through the engine', () => {
  const vm = Adapter.createReadingViewModel({
    title: ` ${BOOK_TITLE} `,
    totalPages: 320,
    currentPage: 80,
    bookmarks: [{ page: 160, label: ` ${ARABIC_MARKER_LABEL} ` }]
  });
  assert.equal(vm.ok, true);
  assert.equal(vm.viewmodel.title, BOOK_TITLE);
  assert.equal(vm.viewmodel.markers[0].label, ARABIC_MARKER_LABEL);
  const expected = Read.createBook({
    title: BOOK_TITLE,
    totalPages: 320,
    currentPage: 80,
    bookmarks: [{ page: 160, label: ARABIC_MARKER_LABEL }]
  });
  assert.equal(vm.viewmodel.bookId, expected.book.id, 'ids must come from the real engine');
  assert.equal(Read.validateBook(Read.createBook(vm.viewmodel).book).ok, true);
});

test('invalid books surface real engine errors verbatim', () => {
  const emptyTitle = Adapter.createReadingViewModel({ title: '   ', totalPages: 20 });
  assert.equal(emptyTitle.ok, false);
  assert.equal(emptyTitle.errors[0].code, 'INVALID_SPEC');
  const nonCanonical = Adapter.createReadingViewModel({
    schemaVersion: 1,
    title: BOOK_TITLE,
    totalPages: 320,
    currentPage: 80,
    bookmarks: [],
    strayField: true
  });
  assert.equal(nonCanonical.ok, false);
  assert.equal(nonCanonical.errors[0].code, 'NON_CANONICAL_BOOK');
  assert.equal(Read.summarizeBook({ title: '', totalPages: 20 }), null);
});

test('progress intents move pages with engine semantics and honest changed flags', () => {
  const book = makeBook();
  const forward = Adapter.applyIntent(book, Adapter.createProgressIntent(120));
  assert.equal(forward.ok, true);
  assert.equal(forward.intentType, 'reading-view/progress');
  assert.equal(forward.book.currentPage, 120);
  assert.equal(forward.changed, true);

  const stalled = Adapter.applyIntent(forward.book, Adapter.createProgressIntent(10));
  assert.equal(stalled.ok, true);
  assert.equal(stalled.book.currentPage, 120, 'regression needs an explicit intent');
  assert.equal(stalled.changed, false);

  const regressed = Adapter.applyIntent(forward.book, Adapter.createRegressIntent(10));
  assert.equal(regressed.ok, true);
  assert.equal(regressed.intentType, 'reading-view/progress-regress');
  assert.equal(regressed.book.currentPage, 10);
  assert.equal(regressed.changed, true);

  const clamped = Adapter.applyIntent(regressed.book, Adapter.createProgressIntent(500));
  assert.equal(clamped.book.currentPage, 320);
  assert.equal(clamped.changed, true);

  const invalid = Adapter.applyIntent(clamped.book, Adapter.createProgressIntent(Number.NaN));
  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.errors, Read.updateProgress(clamped.book, Number.NaN).errors);
  assert.equal(invalid.errors[0].code, 'INVALID_PAGE');

  const complete = Adapter.createReadingViewModel(clamped.book).viewmodel;
  assert.equal(complete.progress.percentComplete, 100);
  assert.equal(complete.progress.remainingPages, 0);
  assert.equal(complete.progress.isComplete, true);
});

test('marker intents add, replace and remove through the engine only', () => {
  const book = makeBook();
  const added = Adapter.applyIntent(book, Adapter.createAddMarkerIntent(200, ' Wortschatz '));
  assert.equal(added.ok, true);
  assert.equal(added.intentType, 'reading-view/add-marker');
  assert.equal(added.book.bookmarks.length, 4);
  const appended = added.book.bookmarks.find((marker) => marker.page === 200);
  assert.equal(appended.label, 'Wortschatz');
  const twin = Read.addBookmark(book, { page: 200, label: 'Wortschatz' }).book.bookmarks.find((m) => m.page === 200);
  assert.equal(appended.id, twin.id, 'marker ids must be engine-generated');
  assert.equal(Read.validateBook(added.book).ok, true);

  const replaced = Adapter.applyIntent(added.book, Adapter.createAddMarkerIntent(200, 'Revision nötig'));
  assert.equal(replaced.ok, true);
  assert.equal(replaced.book.bookmarks.length, 4, 'same-page markers replace instead of duplicate');
  assert.equal(replaced.book.bookmarks.find((marker) => marker.page === 200).label, 'Revision nötig');
  assert.equal(replaced.changed, true);

  const missing = Adapter.applyIntent(replaced.book, Adapter.createRemoveMarkerIntent('bm_00000000'));
  assert.equal(missing.ok, false);
  assert.equal(missing.errors[0].code, 'BOOKMARK_NOT_FOUND');

  const removed = Adapter.applyIntent(replaced.book, Adapter.createRemoveMarkerIntent(replaced.book.bookmarks[0].id));
  assert.equal(removed.ok, true);
  assert.equal(removed.book.bookmarks.length, 3);
  assert.equal(removed.changed, true);
  assert.equal(Read.validateBook(removed.book).ok, true);
});

test('unknown or malformed intents are rejected without touching the book', () => {
  const book = makeBook();
  const before = JSON.stringify(book);
  const hijack = Adapter.applyIntent(book, { type: 'reading-view/delete-everything' });
  assert.equal(hijack.ok, false);
  assert.deepEqual(hijack.errors, [{ code: 'UNKNOWN_INTENT', field: 'type' }]);
  assert.equal(Adapter.applyIntent(book, null).ok, false);
  assert.equal(Adapter.applyIntent(book, {}).ok, false);
  assert.equal(JSON.stringify(book), before);
});

test('render plan is a declarative innerHTML-free DOM contract', () => {
  const vm = Adapter.createReadingViewModel(Adapter.applyIntent(makeBook(), Adapter.createProgressIntent(120)).book);
  const plan = Adapter.safeRenderPlan(vm.viewmodel);
  const nodes = flattenPlan(plan);
  assert.equal(plan.tag, 'section');
  assert.equal(plan.attrs['aria-label'], BOOK_TITLE);
  assert.equal('dir' in plan.attrs, false, 'direction must stay inherited unless explicitly requested');
  const rtlPlan = Adapter.safeRenderPlan(vm.viewmodel, { dir: 'rtl' });
  assert.equal(rtlPlan.attrs.dir, 'rtl');
  const text = (at) => nodes[at].node.text;
  assert.equal(text(1), BOOK_TITLE);
  assert.equal(text(2), 'Page 120 of 320 - 37.5%');
  const progressNode = nodes.find((entry) => entry.node.tag === 'progress');
  assert.deepEqual(progressNode.node.attrs, { class: 'reading-view-progress-bar', max: '320', value: '120' });
  const listNode = nodes.find((entry) => entry.node.tag === 'ol');
  assert.equal(listNode.node.children.length, 3);
  const listItems = listNode.node.children;
  assert.deepEqual(listItems.map((li) => li.attrs['data-marker-id']), vm.viewmodel.markers.map((marker) => marker.id));
  const labelSpan = listItems[1].children.find((child) => child.attrs.class === 'reading-view-marker-label');
  assert.equal(labelSpan.attrs.dir, 'auto', 'marker labels keep per-item RTL detection');
  assert.equal(labelSpan.text, ARABIC_MARKER_LABEL);
  const setAttributeNames = new Set(nodes.flatMap((entry) => Object.keys(entry.node.attrs || {})));
  assert.equal(setAttributeNames.has('style'), false);
  assert.equal(JSON.stringify(plan).includes('http'), false);
});

test('mounting uses only safe DOM primitives and preserves RTL inheritance', () => {
  const vm = Adapter.createReadingViewModel(makeBook());
  const doc = makeFakeDocument();
  const root = Adapter.mountProgressView(doc.createElement('div'), Adapter.safeRenderPlan(vm.viewmodel), doc);
  assert.equal(root.tagName, 'section');
  assert.equal(root.attributes['aria-label'], BOOK_TITLE);
  assert.equal('dir' in root.attributes, false);
  assert.equal(root.children.length, 4);
  assert.equal(root.children[0].textContent, BOOK_TITLE);
  assert.equal(root.children[2].attributes.value, '80');
  assert.equal(root.children[3].children.length, 3);
  assert.equal(root.children[3].children[1].children[1].textContent, ARABIC_MARKER_LABEL);
  const rtlRoot = Adapter.mountProgressView(doc.createElement('div'), Adapter.safeRenderPlan(vm.viewmodel, { dir: 'rtl' }), doc);
  assert.equal(rtlRoot.attributes.dir, 'rtl');
  assert.throws(() => Adapter.mountProgressView(doc.createElement('div'), Adapter.safeRenderPlan(vm.viewmodel), null), /document/i);
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
  assert.deepEqual([...targets], ['../room5/reading_bookmarks_engine.js']);
  for (const target of targets) {
    assert.equal(fs.existsSync(path.join(path.dirname(ADAPTER_PATH), target)), true, 'engine module must exist');
  }
});
