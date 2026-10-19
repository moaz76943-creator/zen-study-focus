'use strict';
/* Intentional RED gate, not silently skipped. DF-150 requires EACH shipped Ogg
 * to have genuine individually verified rights + provenance. A string in this
 * register is not itself proof of the upstream licence or Android decoding.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const sounds=path.join(root,'android/app/src/main/assets/web/sounds');
const licenses=fs.readFileSync(path.join(root,'docs/MEDIA_LICENSES.md'),'utf8');
test('DF-150 P0 release block: individual source and licence records for EVERY bundled .ogg',()=>{
  const files=fs.readdirSync(sounds).filter(x=>x.endsWith('.ogg')).sort();
  assert.ok(files.length>0,'No offline sounds available');
  const missing=files.filter(f=>!licenses.includes('sounds/'+f));
  assert.deepEqual(missing,[], 'BLOCKED: missing individual licence/source entries: '+missing.join(', '));
  assert.doesNotMatch(licenses,/the rest of the pre-existing recordings have not undergone|locally synthesized/i,
    'BLOCKED: remaining unlicensed/placeholder recordings or missing approvals');
});

const crypto=require('node:crypto');
test('DF-150 P0 release block: distinct audio tiles may not silently share identical sound bytes',()=>{
  const audio=fs.readdirSync(sounds).filter(x=>x.endsWith('.ogg')).sort();
  const seen=new Map(),aliases=[];
  for(const file of audio) {
    const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(sounds,file))).digest('hex');
    if(seen.has(digest))aliases.push([seen.get(digest),file]);
    else seen.set(digest,file);
  }
  assert.deepEqual(aliases,[], 'BLOCKED: duplicate binary recordings, investigate intentional aliases first: '+JSON.stringify(aliases));
});
test('DF-150 P0 release block: all bundled audio must at least possess the Ogg container signature',()=>{
  const assets=fs.readdirSync(sounds).filter(x=>x.endsWith('.ogg'));
  for(const file of assets) {
    const head=fs.readFileSync(path.join(sounds,file)).subarray(0,4).toString('ascii');
    assert.equal(head,'OggS','Unplayable/mislabeled Ogg asset '+file);
  }
  // Correct header is necessary but never sufficient to prove codec, quality or Android playback.
});
