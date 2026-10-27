'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SCHEMA_VERSION,
  ROOM3_ENGINES,
  ROOM5_ENGINES,
  collectIndexScripts,
  inspectRepository,
  DEFAULT_INDEX
} = require('../../tools/room6/feature_link_gap.cjs');

const WEB = path.join('android', 'app', 'src', 'main', 'assets', 'web');
const SLASH = (segments) => segments.join('/');

function engineWebFile(engineMap, feature) {
  return path.join(WEB, engineMap[feature].split('/').join(path.sep));
}

function makeRepo(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room6-q02-'));
  const web = path.join(root, WEB);
  const indexScripts = options.indexScripts || ['app.js'];
  fs.mkdirSync(path.join(web, 'js', 'room5'), { recursive: true });
  fs.writeFileSync(
    path.join(web, 'index.html'),
    `<!doctype html>
<html lang="en">
<body>
  <main class="screen-section active" id="sec-timer"></main>
${indexScripts.map((src) => `  <script src="${src}"></script>`).join('\n')}
</body>
</html>
`,
    'utf8'
  );
  for (const src of indexScripts) {
    const body = options.scriptBodies && options.scriptBodies[src] !== undefined
      ? options.scriptBodies[src]
      : '// stub\n';
    fs.writeFileSync(path.join(web, src.split('/').join(path.sep)), body, 'utf8');
  }
  if (options.writeRoom3 !== false) {
    for (const [feature, file] of Object.entries(ROOM3_ENGINES)) {
      const target = path.join(web, file.split('/').join(path.sep));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(
        target,
        `(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.Room3_${feature}=factory();}})(this,function(){return {};});\n`,
        'utf8'
      );
    }
  }
  if (options.writeRoom5 !== false) {
    for (const [feature, file] of Object.entries(ROOM5_ENGINES)) {
      fs.writeFileSync(
        path.join(web, file.split('/').join(path.sep)),
        `(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Room5_${feature}=api;})(globalThis,function(){return {};});\n`,
        'utf8'
      );
    }
  }
  for (const file of options.drop || []) {
    fs.rmSync(path.join(root, file.split('/').join(path.sep)));
  }
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

test('collectIndexScripts reads every <script src> with source line numbers', () => {
  const html = `<!doctype html><body>
<script src="app.js"></script>
<script src="js/some_engine.js" defer></script>
<script>inline()</script>
</body></html>`;
  const scripts = collectIndexScripts(html);

  assert.deepEqual(
    scripts.map((script) => script.src),
    ['app.js', 'js/some_engine.js', '']
  );
  assert.equal(scripts[1].defer, true);
  assert.equal(scripts[2].inline, true);
  assert.equal(scripts[2].src, '');
  assert.ok(scripts[1].line >= 2);
});

test('engines present in the shipped asset tree but absent from shipped index.html are source-only', () => {
  const repo = makeRepo();
  const report = inspectRepository({ root: repo.root });

  assert.equal(report.index.exists, true);
  assert.equal(report.index.scriptTagCount, 1);
  assert.deepEqual(report.index.staticScriptSrcs, ['app.js']);

  for (const engine of report.room3) {
    assert.equal(engine.exists, true, engine.feature);
    assert.equal(engine.status, 'present_source_only', engine.feature);
    assert.equal(engine.staticLoaded, false, engine.feature);
    assert.equal(engine.nodeExports, true, engine.feature);
    assert.equal(engine.runtimeStatus, 'NOT_TESTED', engine.feature);
  }
  for (const engine of report.room5) {
    assert.equal(engine.exists, true, engine.feature);
    assert.equal(engine.status, 'present_source_only', engine.feature);
    assert.equal(engine.runtimeStatus, 'NOT_TESTED', engine.feature);
  }
  assert.deepEqual(report.summary.room3, {
    total: 16,
    present: 16,
    missing: 0,
    loaded: 0,
    sourceOnly: 16
  });
  assert.deepEqual(report.summary.room5, {
    total: 8,
    present: 8,
    missing: 0,
    loaded: 0,
    sourceOnly: 8
  });
  assert.equal(report.linkGaps.room3NotLoaded.length, 16);
  assert.equal(report.linkGaps.room5NotLoaded.length, 8);
  assert.ok(report.findings.some((finding) => finding.code === 'room3_engines_source_only' && finding.count === 16));
  assert.ok(report.findings.some((finding) => finding.code === 'room5_engines_source_only' && finding.count === 8));
});

test('a script tag in shipped index.html marks that engine loaded_static', () => {
  const engineSrc = ROOM5_ENGINES.B08;
  const repo = makeRepo({ indexScripts: ['app.js', engineSrc] });
  const report = inspectRepository({ root: repo.root });

  const weekly = report.room5.find((engine) => engine.feature === 'B08');
  assert.equal(weekly.status, 'loaded_static');
  assert.equal(weekly.staticLoaded, true);
  assert.equal(weekly.runtimeStatus, 'NOT_TESTED');
  assert.ok(report.index.staticScriptSrcs.includes(engineSrc));
  assert.equal(report.summary.room5.loaded, 1);
  assert.equal(report.summary.room5.sourceOnly, 7);
  const room5Gap = report.findings.find((finding) => finding.code === 'room5_engines_source_only');
  assert.ok(room5Gap);
  assert.ok(!room5Gap.features.includes('B08'));
});

test('a loaded script that dynamically injects an engine is reported loaded_dynamic only', () => {
  const loader = `function boot() {
  var tag = document.createElement('script');
  tag.src = 'js/leitner_box_flashcard_engine.js';
  document.head.appendChild(tag);
}`;
  const repo = makeRepo({ scriptBodies: { 'app.js': loader } });
  const report = inspectRepository({ root: repo.root });

  const leitner = report.room3.find((engine) => engine.feature === 'C04');
  assert.equal(leitner.status, 'loaded_dynamic');
  assert.equal(leitner.staticLoaded, false);
  assert.equal(leitner.dynamicLoaded, true);
  assert.equal(leitner.runtimeStatus, 'NOT_TESTED');
  assert.equal(report.index.staticScriptSrcs.includes(ROOM3_ENGINES.C04), false);
  assert.equal(report.summary.room3.loaded, 1);
});

test('missing engine sources are reported honestly instead of being invented as available', () => {
  const repo = makeRepo({
    drop: [
      SLASH(['android', 'app', 'src', 'main', 'assets', 'web', ROOM3_ENGINES.C01]),
      SLASH(['android', 'app', 'src', 'main', 'assets', 'web', ROOM5_ENGINES.B08])
    ]
  });
  const report = inspectRepository({ root: repo.root });

  const c01 = report.room3.find((engine) => engine.feature === 'C01');
  const b08 = report.room5.find((engine) => engine.feature === 'B08');
  assert.equal(c01.exists, false);
  assert.equal(c01.status, 'present_source_only');
  assert.equal(b08.exists, false);
  assert.ok(report.findings.some((finding) => finding.code === 'engine_source_missing' && finding.feature === 'C01'));
  assert.ok(report.findings.some((finding) => finding.code === 'engine_source_missing' && finding.feature === 'B08'));
  const missingC01 = report.findings.find((finding) => finding.code === 'engine_source_missing' && finding.feature === 'C01');
  assert.equal(missingC01.source, SLASH(['android', 'app', 'src', 'main', 'assets', 'web', ROOM3_ENGINES.C01]));
});

test('inspection is read-only and returns serializable JSON evidence', () => {
  const repo = makeRepo();
  const before = snapshot(repo.root);
  const report = inspectRepository({ root: repo.root });
  const after = snapshot(repo.root);

  assert.deepEqual(after, before);
  assert.equal(report.schemaVersion, SCHEMA_VERSION);
  assert.equal(report.readOnly, true);
  assert.equal(JSON.parse(JSON.stringify(report)).schemaVersion, SCHEMA_VERSION);
  assert.ok(report.limitations.some((item) => /NOT_TESTED/.test(item)));
  assert.ok(report.limitations.some((item) => /runtime pass/i.test(item)));
});

test('missing index.html is disclosed without fabricating loaded-script claims', () => {
  const repo = makeRepo();
  fs.unlinkSync(path.join(repo.root, WEB, 'index.html'));
  const report = inspectRepository({ root: repo.root });

  assert.equal(report.index.exists, false);
  assert.equal(report.index.scriptTagCount, 0);
  assert.deepEqual(report.index.staticScriptSrcs, []);
  assert.equal(report.findings.some((finding) => finding.code === 'index_missing'), true);
});

test('CLI emits the same structured JSON report', () => {
  const repo = makeRepo();
  const tool = path.resolve(__dirname, '../../tools/room6/feature_link_gap.cjs');
  const result = spawnSync(process.execPath, [tool, '--root', repo.root], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.generatedBy, 'tools/room6/feature_link_gap.cjs');
  assert.equal(report.counts.room3, 16);
  assert.equal(report.counts.room5, 8);
  assert.equal(report.summary.room5.loaded, 0);
  assert.equal(report.summary.room3.sourceOnly, 16);
});

test('real integrated v21 web asset matches the source-present / index-unloaded facts', (t) => {
  const root = path.resolve(__dirname, '..', '..');
  if (!fs.existsSync(path.join(root, DEFAULT_INDEX))) {
    t.skip('integrated web asset is not present in this worktree');
    return;
  }
  const report = inspectRepository({ root });

  assert.equal(report.index.exists, true);
  assert.equal(report.counts.room3, 16);
  assert.equal(report.counts.room5, 8);
  assert.equal(report.summary.room3.present, 16);
  assert.equal(report.summary.room5.present, 8);
  assert.equal(report.summary.room3.loaded, 0);
  assert.equal(report.summary.room5.loaded, 0);
  const engineSrc = report.index.staticScriptSrcs.filter((src) => /engine\.js$/.test(src));
  assert.deepEqual(engineSrc, []);
  assert.ok(report.findings.some((finding) => finding.code === 'room3_engines_source_only'));
  assert.ok(report.findings.some((finding) => finding.code === 'room5_engines_source_only'));
  for (const engine of [...report.room3, ...report.room5]) {
    assert.equal(engine.runtimeStatus, 'NOT_TESTED');
  }
});
