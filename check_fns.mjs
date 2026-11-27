import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const web = 'android/app/src/main/assets/web';
const jsFiles = [];

function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith('.js')) jsFiles.push(p);
  }
}
walk(web);
const allJs = jsFiles.map(f => readFileSync(f, 'utf8')).join(' ');

const html = readFileSync(join(web, 'index.html'), 'utf8');
const refFns = new Set();
const onclicks = html.match(/onclick="([^"]+)"/g) || [];
for (const onclick of onclicks) {
  const content = onclick.match(/onclick="([^"]+)"/)[1];
  for (const m of content.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g)) {
    refFns.add(m[1]);
  }
}

const knownProperties = new Set(['if', 'click', 'getElementById', 'toggle', 'toggleDrawer', 'toggleDeskClock', 'importBackupFromFile']);
const missing = [];
for (const fn of refFns) {
  if (knownProperties.has(fn)) continue;
  // Check for function declaration
  const patterns = [
    new RegExp('function\\s+' + fn + '\\s*\\('),
    new RegExp('\\b' + fn + '\\s*=\\s*function'),
    new RegExp('\\b' + fn + '\\s*=\\s*\\('),
    new RegExp('window\\.' + fn),
  ];
  const found = patterns.some(p => p.test(allJs));
  if (!found) missing.push(fn);
}

console.log('Total functions:', refFns.size);
console.log('Missing from JS:', missing.length);
if (missing.length) console.log('Missing:', missing.join(', '));