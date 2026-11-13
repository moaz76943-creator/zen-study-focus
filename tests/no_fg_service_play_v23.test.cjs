const fs = require('fs');
const path = require('path');
const assert = require('assert');
const mP = 'android/app/src/main/' +
'AndroidManifest.xml';
assert.ok(fs.existsSync(mP),
'Manifest required');
let m = fs.readFileSync(mP, 'utf8');
const hasFg = m.includes(
'foregroundServiceType');
assert.ok(!hasFg, 'No foreground service');
const pStr = '<service[^>]*ZenFocus' +
'TileService[\\s\\S]*?</service>';
const pat = new RegExp(pStr, 'g');
const noTile = m.replace(pat, '');
assert.ok(!noTile.includes('<service'),
'No unauthorized services');
console.log('PASS: service contract');