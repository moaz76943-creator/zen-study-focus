'use strict';
// Read-only quality dashboard for Deep Focus. No network calls, writes to app, or CI dispatch.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const WEB = 'android/app/src/main/assets/web';
const REQUIRED = [
  `${WEB}/index.html`, `${WEB}/app.js`, `${WEB}/locale_rows.js`,
  `${WEB}/locale_extras.js`, `${WEB}/data_compat_v21.js`,
  'docs/contracts/DATA_COMPAT_V21.md', 'docs/MEDIA_LICENSES.md',
  'tests/validate_locales.cjs', 'tests/smoke_app.cjs'
];
const QUICK_TESTS = [
  'tests/data_contracts/data_compat_v21.test.cjs',
  'tests/master_recovery_qa/source_contracts.test.cjs',
  'tests/master_recovery_qa/workflow.test.cjs'
];
const SKIP_PROVENANCE = 'tests/master_recovery_qa/media_provenance_gate.test.cjs';
const STATUSES = ['PASS', 'FAIL', 'BLOCKED', 'NOT_TESTED'];
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function finding(id, title, status, detail) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status ${status}`);
  return {id, title, status, detail: String(detail)};
}
function runNode(args, cwd = root, timeout = 90000) {
  const res = spawnSync(process.execPath, args, {
    cwd, encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024,
    env: {...process.env, CI: '1'}
  });
  const output = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
  return {ok: !res.error && res.status === 0, details: (res.error ? `${res.error.message}\n` : '') + output.slice(-2500)};
}
function listTests(base = path.join(root, 'tests')) {
  const found = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs);
      else if (ent.isFile() && ent.name.endsWith('.test.cjs')) {
        const relative = path.relative(root, abs).split(path.sep).join('/');
        if (relative !== SKIP_PROVENANCE) found.push(relative);
      }
    }
  }
  walk(base);
  return found.sort();
}
function checkSources() {
  const missing = REQUIRED.filter(p => !fs.existsSync(path.join(root, p)));
  return finding('SOURCE', 'Critical source files', missing.length ? 'FAIL' : 'PASS',
    missing.length ? `Missing: ${missing.join(', ')}` : `${REQUIRED.length} essential paths found (existence only)`);
}
function checkSyntax() {
  const dir = path.join(root, WEB);
  if (!fs.existsSync(dir)) return finding('SYNTAX', 'JavaScript syntax', 'FAIL', 'Web sources unavailable');
  const files = fs.readdirSync(dir).filter(n => n.endsWith('.js')).sort();
  if (!files.length) return finding('SYNTAX', 'JavaScript syntax', 'FAIL', 'No JavaScript files found');
  const failed = [];
  for (const name of files) {
    const r = runNode(['--check', path.join(dir, name)], root, 12000);
    if (!r.ok) failed.push(`${name}: ${r.details.slice(-400)}`);
  }
  return finding('SYNTAX', 'JavaScript syntax', failed.length ? 'FAIL' : 'PASS',
    failed.length ? failed.join('\n') : `${files.length} source files syntax-checked; no Android execution implied`);
}
function checkTest(label, id, args, timeout = 90000) {
  const r = runNode(args, root, timeout);
  return finding(id, label, r.ok ? 'PASS' : 'FAIL', r.details || (r.ok ? 'Completed successfully' : 'Failed without output'));
}
function checkAudio() {
  const dir = path.join(root, WEB, 'sounds');
  if (!fs.existsSync(dir)) return finding('AUDIO', 'Offline audio container', 'FAIL', 'sounds/ missing');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ogg')).sort();
  const invalid = [];
  if (!files.length) invalid.push('No Ogg clips present');
  for (const name of files) {
    const filepath = path.join(dir, name);
    const stat = fs.statSync(filepath);
    if (!stat.isFile() || stat.size < 4) { invalid.push(`${name}: empty/truncated`); continue; }
    const fd = fs.openSync(filepath, 'r');
    let header;
    try { const buf = Buffer.alloc(4); fs.readSync(fd, buf, 0, 4, 0); header = buf.toString('ascii'); }
    finally { fs.closeSync(fd); }
    if (header !== 'OggS') invalid.push(`${name}: invalid Ogg header`);
  }
  return finding('AUDIO', 'Packaged Ogg signatures', invalid.length ? 'FAIL' : 'PASS',
    invalid.length ? invalid.join('; ') : `${files.length} Ogg headers present; does NOT prove decode, recording authenticity, or licences`);
}
function buildReport(checks, sha = 'UNKNOWN', createdAt = new Date().toISOString()) {
  const counts = Object.fromEntries(STATUSES.map(s => [s, checks.filter(c => c.status === s).length]));
  return {
    schemaVersion: 1, project: 'Deep Focus', sourceSha: sha, generatedAt: createdAt,
    checks, counts, releaseReady: false,
    releaseGate: 'BLOCKED: on-device Android/WebView QA, verified source rights, and human release review are outstanding. A static PASS is not release approval.'
  };
}
function html(report) {
  const rows = report.checks.map(c => `<tr><td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.title)}</td><td data-status="${escapeHtml(c.status)}">${escapeHtml(c.status)}</td><td><pre>${escapeHtml(c.detail)}</pre></td></tr>`).join('\n');
  const metrics = STATUSES.map(s => `<div class="metric"><strong>${report.counts[s]}</strong><span>${s}</span></div>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Deep Focus Quality Center</title><style>
:root{color-scheme:light;font-family:system-ui,-apple-system,sans-serif}body{max-width:1100px;margin:auto;padding:18px;background:#f7f9fd;color:#172033}h1{font-size:1.7rem}.subtitle{color:#46526b}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.metric{background:white;padding:16px;border-radius:12px}.metric strong{font-size:1.8rem;display:block}.metric span{font-size:.75rem}section{background:white;padding:14px;border-radius:12px;margin:16px 0;overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}td,th{padding:10px;border-bottom:1px solid #e6e9f1;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:0;font-size:.83rem;max-height:140px;overflow:auto}td[data-status=FAIL],td[data-status=BLOCKED]{font-weight:700;color:#a22828}td[data-status=PASS]{font-weight:700;color:#176b3f}td[data-status=NOT_TESTED]{font-weight:700;color:#775500}.gate{border-left:5px solid #a22828}@media(max-width:650px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}td,th{padding:6px;font-size:.84rem}}
</style></head><body><h1>Deep Focus · Quality Center</h1><p class="subtitle">Source: ${escapeHtml(report.sourceSha)} · Generated: ${escapeHtml(report.generatedAt)}</p><div class="metrics">${metrics}</div><section class="gate"><strong>RELEASE: BLOCKED</strong><p>${escapeHtml(report.releaseGate)}</p></section><section><h2>Verification results</h2><table><thead><tr><th>ID</th><th>Check</th><th>Status</th><th>Evidence / limitation</th></tr></thead><tbody>${rows}</tbody></table></section><p class="subtitle">This is a local, read-only source-quality snapshot. No APK build, GitHub API modification, licence approval, or device test is performed.</p></body></html>`;
}
function main(argv = process.argv.slice(2)) {
  const outArg = argv.indexOf('--out');
  const out = outArg >= 0 ? argv[outArg + 1] : path.join(root, 'reports', 'quality-center');
  if (!out || out.startsWith('--')) throw new Error('--out requires a path');
  const unknown = argv.filter((v, i) => !(v === '--full' || v === '--out' || (i > 0 && argv[i - 1] === '--out')));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(' ')}`);
  const full = argv.includes('--full');
  const checks = [checkSources(), checkSyntax(), checkAudio()];
  checks.push(checkTest('20-language structural dictionaries', 'LOCALES', ['tests/validate_locales.cjs']));
  checks.push(checkTest('Source smoke validation', 'SMOKE', ['tests/smoke_app.cjs']));
  const files = full ? listTests() : QUICK_TESTS;
  if (files.some(p => !fs.existsSync(path.join(root,p)))) {
    checks.push(finding('NODE_TESTS', 'Node regression suite', 'FAIL', 'One or more test files are missing'));
  } else {
    checks.push(checkTest(full ? 'All Node regressions except isolated provenance gate' : 'Focused Node regression suite', 'NODE_TESTS', ['--test', ...files], full ? 180000 : 90000));
  }
  checks.push(checkTest('Intentional release-blocking media provenance gate', 'MEDIA_RIGHTS', ['--test', SKIP_PROVENANCE]));
  checks.push(finding('ANDROID_E2E', 'Real Android/WebView interaction and audio', 'NOT_TESTED', 'Requires APK SHA and real emulator or phone, isolated test profile, microphone/notification/audio-focus and backup checks. PR #30 contains the separate E2E suite.'));
  checks.push(finding('HUMAN_REVIEW', 'Licensing, UI, native speaker and release review', 'BLOCKED', 'Individual origin and rights, phone listening, 20-language visual checks, and owner approval required. Not bypassed by Node tests.'));
  const shaResult = spawnSync('git', ['rev-parse', 'HEAD'], {cwd:root,encoding:'utf8',timeout:3000});
  const report = buildReport(checks, shaResult.status === 0 ? shaResult.stdout.trim() : 'UNKNOWN');
  fs.mkdirSync(out, {recursive:true});
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'index.html'), html(report));
  console.log(`Quality center generated at ${out}; PASS ${report.counts.PASS}, FAIL ${report.counts.FAIL}, BLOCKED ${report.counts.BLOCKED}, NOT_TESTED ${report.counts.NOT_TESTED}. RELEASE BLOCKED.`);
  if (report.counts.FAIL) process.exitCode = 1;
  return report;
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {escapeHtml, finding, buildReport, html, listTests, main};
