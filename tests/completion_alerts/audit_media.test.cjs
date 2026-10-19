'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../../android/app/src/main/assets/web/completion_alerts'),manifest=require(path.join(dir,'manifest.json'));
test('exactly five uniquely licensed local PCM16 sound effects',()=>{
 assert.equal(manifest.assets.length,5);assert.equal(new Set(manifest.assets.map(x=>x.id)).size,5);
 for(const a of manifest.assets){assert.match(a.source,/^(sgossner\/VCSL|Lelio88\/dewdrop)\//);assert.match(a.source_sha256,/^[0-9a-f]{64}$/);const b=fs.readFileSync(path.join(dir,a.path));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);assert.ok(b.length>2000&&b.length<500000);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);assert.ok(b.readUInt32LE(40)>1000);}
});
