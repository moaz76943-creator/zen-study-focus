/** Deep Focus Room6 U06 — focus_lab_registry regression (offline, node:test). */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REGISTRY_PATH = path.resolve(
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
  'focus_lab_registry.js'
);
const WEB_JS_ROOT = path.resolve(path.dirname(REGISTRY_PATH), '..');
const READING_ADAPTER_PATH = path.join(WEB_JS_ROOT, 'room6', 'reading_view_adapter.js');

const registryModule = require(REGISTRY_PATH);

function loadEngine(declaration) {
  return require(path.join(WEB_JS_ROOT, declaration.enginePath));
}

function createRegistry(options) {
  return registryModule.createFocusLabRegistry(options);
}

test('exports a frozen offline registry API', () => {
  assert.equal(registryModule.REGISTRY_ID, 'focus-lab');
  assert.equal(registryModule.SCHEMA_VERSION, 1);
  assert.equal(registryModule.STATUS_LINKED, 'linked');
  assert.equal(registryModule.STATUS_UNLINKED, 'unlinked');
  assert.equal(registryModule.STATUS_UNAVAILABLE, 'unavailable');
  assert.ok(Object.isFrozen(registryModule));
  assert.ok(typeof registryModule.createFocusLabRegistry === 'function');
  assert.ok(typeof registryModule.describeFeature === 'function');
});

test('declares the merged room3 and room5 engine set exactly once', () => {
  const ids = registryModule.DECLARATION_IDS;
  assert.equal(ids.length, 16);
  assert.equal(new Set(ids).size, ids.length, 'declaration ids must be unique');
  assert.deepEqual(
    ids,
    registryModule.FEATURE_DECLARATIONS.map((declaration) => declaration.id)
  );

  const rooms = registryModule.FEATURE_DECLARATIONS.map((declaration) => declaration.room).sort();
  assert.deepEqual(rooms, [
    'room3', 'room3', 'room3', 'room3', 'room3', 'room3', 'room3', 'room3',
    'room5', 'room5', 'room5', 'room5', 'room5', 'room5', 'room5', 'room5'
  ]);

  const room5Paths = registryModule.FEATURE_DECLARATIONS
    .filter((declaration) => declaration.room === 'room5')
    .map((declaration) => declaration.enginePath)
    .sort();
  assert.deepEqual(room5Paths, [
    'room5/focus_plan_checklist_engine.js',
    'room5/focus_ritual_templates_engine.js',
    'room5/focus_weekly_intentions_engine.js',
    'room5/project_time_budget_engine.js',
    'room5/reading_bookmarks_engine.js',
    'room5/recovery_break_menu_engine.js',
    'room5/sport_interval_builder_engine.js',
    'room5/study_plan_templates_engine.js'
  ]);
});

test('every declared engine path exists and declares only real exports', () => {
  for (const declaration of registryModule.FEATURE_DECLARATIONS) {
    const absolute = path.join(WEB_JS_ROOT, declaration.enginePath);
    assert.ok(fs.existsSync(absolute), `engine file missing: ${declaration.enginePath}`);
    const engine = loadEngine(declaration);
    assert.ok(engine && typeof engine === 'object', `engine is not an object: ${declaration.enginePath}`);
    for (const capability of declaration.requiredCapabilities) {
      const value = engine[capability.name];
      if (capability.kind === 'function') {
        assert.equal(typeof value, 'function', `${declaration.enginePath}#${capability.name}`);
      } else if (capability.kind === 'array') {
        assert.ok(Array.isArray(value), `${declaration.enginePath}#${capability.name}`);
      } else {
        assert.ok(
          typeof value === 'object' && value !== null && !Array.isArray(value),
          `${declaration.enginePath}#${capability.name}`
        );
      }
    }
  }
});

test('describeFeature mirrors declarations without inventing availability', () => {
  for (const declaration of registryModule.FEATURE_DECLARATIONS) {
    const description = registryModule.describeFeature(declaration.id);
    assert.ok(description, declaration.id);
    assert.equal(description.title, declaration.title);
    assert.equal(description.enginePath, declaration.enginePath);
    assert.equal(description.engineGlobalKey, declaration.engineGlobalKey);
    assert.equal(description.focusLabRole, declaration.focusLabRole);
    assert.equal(description.adapterDescription, declaration.adapterDescription);
    assert.deepEqual(
      description.requiredCapabilityNames,
      declaration.requiredCapabilities.map((capability) => capability.name)
    );
    assert.equal(typeof description.available, 'undefined', 'describeFeature must not claim availability');
  }
  assert.equal(registryModule.describeFeature('not-a-feature'), null);
});

test('fs probe marks only the real F01 reading adapter as linked', () => {
  const registry = createRegistry();
  assert.equal(registry.probeMode, 'fs');
  assert.equal(registry.counts.total, 16);

  const reading = registry.getFeature('reading-bookmarks');
  assert.ok(reading);
  assert.equal(reading.status, 'linked');
  assert.equal(reading.available, true);
  assert.equal(reading.adapter.linked, true);
  assert.equal(reading.adapter.status, 'existing');
  assert.equal(reading.adapter.path, 'room6/reading_view_adapter.js');
  assert.equal(reading.adapter.factoryName, 'createReadingViewAdapter');
  assert.ok(fs.existsSync(READING_ADAPTER_PATH));

  for (const feature of registry.features) {
    assert.equal(feature.engine.loaded, true, `${feature.id} engine must load`);
    assert.deepEqual(feature.capabilities.missing, [], `${feature.id} must not miss capabilities`);
    assert.equal(feature.available, true, `${feature.id} engine file exists so availability is real`);
    assert.equal(feature.reason, null, `${feature.id} should carry no failure reason`);
    if (feature.id !== 'reading-bookmarks') {
      assert.equal(feature.status, 'unlinked', `${feature.id} has no room6 adapter yet`);
      assert.equal(feature.adapter.linked, false, `${feature.id} adapter must not be claimed linked`);
      assert.equal(feature.adapter.loaded, false);
      assert.notEqual(feature.adapter.status, 'existing');
      assert.ok(
        feature.adapter.description.indexOf('Existing') !== 0,
        `${feature.id} description must not claim an existing adapter`
      );
    }
  }

  assert.equal(registry.counts.byStatus.linked, 1);
  assert.equal(registry.counts.byStatus.unlinked, 15);
  assert.equal(registry.counts.byStatus.unavailable, undefined);
  assert.equal(registry.counts.byRoom.room3, 8);
  assert.equal(registry.counts.byRoom.room5, 8);

  const linkable = registry.listLinkable();
  assert.equal(linkable.length, 15);
  assert.ok(linkable.every((feature) => feature.available && feature.status === 'unlinked'));
  assert.ok(!linkable.some((feature) => feature.id === 'reading-bookmarks'));
  assert.equal(registry.listByRoom('room5').length, 8);
  assert.equal(registry.listByStatus('linked').length, 1);
  assert.equal(registry.getFeature('missing-feature'), null);
  assert.ok(Object.isFrozen(registry));
  assert.ok(Object.isFrozen(reading));
  assert.ok(Object.isFrozen(reading.adapter));
  assert.ok(Object.isFrozen(reading.capabilities));
});

test('global probe reports unavailable instead of inventing loaded engines', () => {
  const registry = createRegistry({ probeMode: 'global', globalScope: {} });
  assert.equal(registry.probeMode, 'global');
  assert.equal(registry.counts.byStatus.unavailable, 16);
  for (const feature of registry.features) {
    assert.equal(feature.status, 'unavailable');
    assert.equal(feature.available, false);
    assert.equal(feature.reason, 'engine_global_missing');
    assert.equal(feature.adapter.linked, false);
  }
  assert.equal(registry.listLinkable().length, 0);
});

test('global probe links real engine globals mapped by declaration key', () => {
  const scope = {};
  for (const declaration of registryModule.FEATURE_DECLARATIONS) {
    scope[declaration.engineGlobalKey] = loadEngine(declaration);
  }
  const registry = createRegistry({ probeMode: 'global', globalScope: scope });
  assert.equal(registry.counts.byStatus.unavailable, undefined);
  for (const feature of registry.features) {
    assert.equal(feature.available, true, `${feature.id} global key must resolve to a real engine`);
    assert.equal(feature.engine.loaded, true);
    assert.deepEqual(feature.capabilities.missing, []);
    assert.equal(feature.status, 'unlinked', 'global probing never invents an adapter link');
  }
});

test('global probe marks capability gaps instead of pretending success', () => {
  const scope = {};
  for (const declaration of registryModule.FEATURE_DECLARATIONS) {
    scope[declaration.engineGlobalKey] = {};
  }
  const registry = createRegistry({ probeMode: 'global', globalScope: scope });
  for (const feature of registry.features) {
    const declaration = registryModule.describeFeature(feature.id);
    assert.equal(feature.status, 'unavailable');
    assert.equal(feature.available, false);
    assert.equal(feature.reason, 'engine_capabilities_missing');
    assert.deepEqual(feature.capabilities.missing, declaration.requiredCapabilityNames);
  }
});

test('fs probe against an empty engines root marks engine_file_missing honestly', () => {
  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'focus-lab-u06-'));
  try {
    const registry = createRegistry({ enginesRoot: emptyRoot, adaptersRoot: emptyRoot });
    assert.equal(registry.counts.byStatus.unavailable, 16);
    assert.equal(registry.counts.byStatus.linked, undefined);
    assert.equal(registry.listLinkable().length, 0);
    for (const feature of registry.features) {
      assert.equal(feature.status, 'unavailable');
      assert.equal(feature.available, false);
      assert.equal(feature.reason, 'engine_file_missing');
      assert.equal(feature.engine.loaded, false);
      assert.equal(feature.adapter.linked, false);
      assert.ok(feature.adapter.description.length > 40, `${feature.id} keeps a usable adapter description`);
    }
  } finally {
    fs.rmSync(emptyRoot, { recursive: true, force: true });
  }
});

test('registry never touches storage or mutates globals', () => {
  let storageReads = 0;
  const trap = {
    get(target, property) {
      if (property === 'localStorage' || property === 'sessionStorage') storageReads += 1;
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  };
  const scope = new Proxy({}, trap);
  const beforeGlobals = Object.keys(globalThis).sort().join(',');
  const registry = createRegistry({ probeMode: 'global', globalScope: scope });
  assert.equal(registry.features.length, 16);
  assert.equal(storageReads, 0, 'storage properties must never be read');
  assert.equal(Object.keys(globalThis).sort().join(','), beforeGlobals, 'globals must not change');
});

test('source is textContent-safe by construction: no DOM or storage APIs', () => {
  const source = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const forbidden = [
    'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write',
    'localStorage', 'sessionStorage', 'XMLHttpRequest', 'fetch(',
    'setTimeout', 'setInterval', 'require(\'node:http'
  ];
  for (const token of forbidden) {
    assert.ok(source.indexOf(token) === -1, `source must not contain ${token}`);
  }
  assert.ok(source.indexOf('textContent') !== -1, 'adapter descriptions should state textContent rendering');
});
