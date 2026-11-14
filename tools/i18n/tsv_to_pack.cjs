'use strict';
// node tools/i18n/tsv_to_pack.cjs <code> <file.tsv> [status]
// TSV lines: "<index>\t<translation>" where index is the position in i18n/source_en.json (sorted key order).
// Merges into i18n/packs/<code>.json (existing entries are replaced only for the indices given).
const fs = require('fs'), path = require('path');
const repo = path.resolve(__dirname, '../..');
const [code, file, status] = process.argv.slice(2);\nif (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code || '')) throw new Error('invalid language code');
const keys = Object.keys(JSON.parse(fs.readFileSync(path.join(repo, 'i18n/source_en.json'), 'utf8')));
const pf = path.join(repo, 'i18n/packs', code + '.json');
function readRegularFileNoFollow(filePath) {
  const fd = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    if (!fs.fstatSync(fd).isFile()) throw new Error('Expected regular pack file');
    return fs.readFileSync(fd, 'utf8');
  } finally { fs.closeSync(fd); }
}
const pack = fs.existsSync(pf) ? JSON.parse(readRegularFileNoFollow(pf)) : { status: status || 'ai-pending-review', translator: 'Claude (AI), not reviewed by a person', t: {} };
if (status) pack.status = status;
let n = 0;
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  const m = line.match(/^(\d+)[\t|](.*)$/); if (!m) continue;
  const i = +m[1]; if (!keys[i]) throw new Error('bad index ' + i);
  pack.t[keys[i]] = m[2].trim(); n++;
}
const ordered = {}; keys.forEach((k) => { if (k in pack.t) ordered[k] = pack.t[k]; }); pack.t = ordered;
fs.mkdirSync(path.dirname(pf), { recursive: true });
fs.writeFileSync(pf, JSON.stringify(pack, null, 1) + '\n');
console.log(code, 'entries written', n, 'total', Object.keys(pack.t).length, '/', keys.length);
