#!/usr/bin/env node
// Regression gate: runs every node test in test/ and tests/ and fails only on
// tests that are NOT listed in tests/KNOWN_FAILING.txt (legacy, being repaired).
//   node tools/run_tests.mjs            # gate (exit 1 on a new failure)
//   node tools/run_tests.mjs --update   # rewrite KNOWN_FAILING.txt from current results
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const knownFile = join(root, 'tests', 'KNOWN_FAILING.txt');
const TEST = /\.test\.(js|cjs|mjs)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (TEST.test(name)) out.push(relative(root, p).split('\\').join('/'));
  }
  return out;
}

function run(file) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [file], { cwd: root, stdio: 'ignore' });
    const timer = setTimeout(() => child.kill('SIGKILL'), 120000);
    child.on('exit', (code) => { clearTimeout(timer); done(code === 0); });
    child.on('error', () => { clearTimeout(timer); done(false); });
  });
}

const files = ['test', 'tests'].filter((d) => existsSync(join(root, d)))
  .flatMap((d) => walk(join(root, d))).sort();
const known = new Set(existsSync(knownFile)
  ? readFileSync(knownFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : []);

const results = new Map();
let next = 0;
async function worker() {
  while (next < files.length) {
    const f = files[next++];
    results.set(f, await run(f));
  }
}
await Promise.all(Array.from({ length: Math.max(2, os.cpus().length) }, worker));

const failing = files.filter((f) => !results.get(f));
const newFailures = failing.filter((f) => !known.has(f));
const nowPassing = [...known].filter((f) => results.has(f) && results.get(f));
console.log(`tests: ${files.length}  passed: ${files.length - failing.length}  failed: ${failing.length}  known-failing: ${known.size}`);

if (process.argv.includes('--update')) {
  const body = '# Legacy tests that currently fail (stale harnesses / retired features).\n' +
    '# Do not add new entries: fix the regression instead. Regenerate with --update after repairing some.\n' +
    failing.join('\n') + '\n';
  writeFileSync(knownFile, body);
  console.log(`wrote ${failing.length} entries to tests/KNOWN_FAILING.txt`);
  process.exit(0);
}
if (nowPassing.length) console.log(`fixed since baseline (remove from KNOWN_FAILING.txt):\n  ${nowPassing.join('\n  ')}`);
if (newFailures.length) {
  console.error(`NEW FAILURES (${newFailures.length}):\n  ${newFailures.join('\n  ')}`);
  process.exit(1);
}
console.log('OK: no new failures');
