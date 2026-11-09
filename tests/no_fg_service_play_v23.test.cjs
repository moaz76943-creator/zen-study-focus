const fs = require('fs');
const path = require('path');
const assert = require('assert');
const mP = 'android/app/src/main/' +
'AndroidManifest.xml';
if (!fs.existsSync(mP)) process.exit(0);
let m = fs.readFileSync(mP, 'utf8');
const hasFg = m.includes(
'foregroundServiceType');
assert.ok(!hasFg);
const pat = /<service[^>]*ZenFocus' +
'TileService[\s\S]*?<\/service>/g;
const noTile = m.replace(pat, '');
assert.ok(!noTile.includes('<service'));
console.log('PASS: no foreground services');