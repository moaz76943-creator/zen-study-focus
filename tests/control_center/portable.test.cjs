'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const {buildPortable}=require('../../tools/control_center/build_portable.cjs');
const design=require('../../docs/control-center/design-config.json');
test('builds one self-contained dashboard with exactly nine hash-pinned scripts and two styles',()=>{
  const html=buildPortable(root);
  assert.match(html,/id="control-center-embedded-design"/);
  assert.equal((html.match(/<script data-bundle=/g)||[]).length,9);
  assert.equal((html.match(/<style data-bundle=/g)||[]).length,2);
  assert.doesNotMatch(html,/<script[^>]*\bsrc=|<link[^>]*rel="stylesheet"/i);
  const hashes=[...html.matchAll(/<script data-bundle="[^"]+">([\s\S]*?)<\/script>/g)]
    .map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1]).digest('base64')+"'");
  for(const token of hashes)assert.ok(html.includes(token),'Missing matching CSP script hash');
  assert.equal(hashes.length,9);
  assert.doesNotMatch(html,/unsafe-inline|unsafe-eval|https:\/\/fonts\./);
  assert.ok(Buffer.byteLength(html,'utf8')<300000);
});
test('embeds allowlisted JSON design baseline, enabling file:// operation',()=>{
  const html=buildPortable(root);
  const found=html.match(/<script id="control-center-embedded-design" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(found,'embedded JSON is missing');
  assert.deepEqual(JSON.parse(found[1]),design);
  assert.ok(fs.readFileSync(path.join(root,'docs/control-center/studio.js'),'utf8').includes('control-center-embedded-design'));
});
test('portable builder refuses unknown remote or extra executable script tags',()=>{
  const main=fs.readFileSync(path.join(root,'docs/control-center/index.html'),'utf8');
  assert.throws(()=>buildPortable(root,main.replace('</head>','<script src="https://evil.example/runner.js"></script></head>')));
  assert.throws(()=>buildPortable(root,main.replace('</head>','<script>alert(1)</script></head>')));
});
test('portable CSP independently pins inline styles and permits GitHub API only',()=>{
 const html=buildPortable(root);
 const css=[...html.matchAll(/<style data-bundle="[^"]+">([\s\S]*?)<\/style>/g)].map(x=>x[1]);
 for(const style of css){
  const sha="'sha256-"+crypto.createHash('sha256').update(style).digest('base64')+"'";
  assert.ok(html.includes(sha));
 }
 assert.match(html,/connect-src https:\/\/api\.github\.com https:\/\/raw\.githubusercontent\.com/);
 assert.doesNotMatch(html,/script-src[^;]+self/);
});

test('portable review file includes actual 161-item recovery ledger with explicit static provenance',()=>{
 const html=buildPortable(root);
 const m=html.match(/<script id="control-center-embedded-ledger" type="application\/json">([\s\S]*?)<\/script>/);
 assert.ok(m,'missing source-ledger snapshot');
 const ledger=JSON.parse(m[1]);
 assert.equal(ledger.schema_version,1);
 assert.equal(ledger.provenance,'CHECKOUT_STATIC_SOURCE');
 assert.equal(ledger.tasks.length,161);
 assert.equal(new Set(ledger.tasks.map(x=>x.id)).size,161);
 assert.ok(ledger.tasks.some(x=>x.status==='BLOCKED'));
 assert.ok(fs.readFileSync(path.join(root,'docs/control-center/control-center.js'),'utf8').includes('control-center-embedded-ledger'));
});

test('static 161-item fallback rejects altered status, duplicates, and untrusted HTML',()=>{
 const html=buildPortable(root);
 const m=html.match(/<script id="control-center-embedded-ledger" type="application\/json">([\s\S]*?)<\/script>/);
 const source=JSON.parse(m[1]);
 const client=require('../../docs/control-center/control-center.js');
 const valid=client.parseStaticLedger(JSON.stringify(source));
 assert.equal(valid.length,161);
 const duplicate=JSON.parse(JSON.stringify(source));
 duplicate.tasks[1].id=duplicate.tasks[0].id;
 assert.throws(()=>client.parseStaticLedger(JSON.stringify(duplicate)),/Invalid embedded ledger task/);
 const altered=JSON.parse(JSON.stringify(source));
 altered.tasks[0].status='RELEASE_APPROVED';
 assert.throws(()=>client.parseStaticLedger(JSON.stringify(altered)),/Invalid embedded ledger task/);
 const escaped=JSON.parse(JSON.stringify(source));
 escaped.tasks[0].title='<img src=x onerror=alert(1)>Safe title';
 assert.equal(client.parseStaticLedger(JSON.stringify(escaped))[0].title,'Safe title');
});
