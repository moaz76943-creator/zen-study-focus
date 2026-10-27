'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/js/offline_vault_crypto_engine.js'),'utf8');
const nodeEngine=require('../../android/app/src/main/assets/web/js/offline_vault_crypto_engine.js');
const browserContext=vm.createContext({btoa,atob});
vm.runInContext(source,browserContext);
const browserEngine=browserContext.OfflineVaultCryptoEngine;
function legacy(payload) {
  let sum=0; for(let i=0;i<payload.length;i++)sum=(sum+payload.charCodeAt(i))%1000000;
  return {version:'v21-fortress-aes256',algorithm:'AES-GCM-256',status:'sealed',
    cipherPayload:Buffer.from(payload,'utf8').toString('base64'),watermarkChecksum:String(sum),unknown:{preserved:true}};
}
for(const [runtime,engine] of [['Node',nodeEngine],['WebView without Buffer',browserEngine]]) {
  test(`${runtime}: historical UTF-8 payloads remain byte-compatible and read-only`,()=>{
    for(const payload of ['', 'ملاحظات — café 🧠\n\u0000', '{"notes":[{"id":7,"body":"draft"}],"extra":true}']) {
      const envelope=legacy(payload),before=JSON.stringify(envelope);
      assert.equal(engine.verifyVaultIntegrity(envelope).unlockedPayload,payload);
      assert.equal(JSON.stringify(envelope),before);
      const created=engine.createVaultEnvelope(payload,'fixed-legacy-salt');
      assert.equal(created.cipherPayload,envelope.cipherPayload);
      assert.equal(created.watermarkChecksum,envelope.watermarkChecksum);
      assert.equal(created.version,envelope.version);
      assert.equal(created.algorithm,'NONE-BASE64-INTEGRITY-ONLY');
      assert.equal(engine.verifyVaultIntegrity(created).valid,true);
    }
  });
  test(`${runtime}: preserve false and zero payloads instead of silently encoding empty`,()=>{
    for(const value of [false,0])assert.equal(engine.verifyVaultIntegrity(engine.createVaultEnvelope(value)).unlockedPayload,String(value));
  });
  test(`${runtime}: malformed encodings/checksums fail closed without mutating source`,()=>{
    const good=legacy('A');
    for(const patch of [
      {cipherPayload:'QQ==garbage'}, {cipherPayload:'Q Q=='}, {cipherPayload:'QR=='},
      {cipherPayload:'QQ'}, {cipherPayload:65}, {cipherPayload:'/w==',watermarkChecksum:'65533'},
      {watermarkChecksum:'65tail'}, {watermarkChecksum:'65.0'}, {watermarkChecksum:'65e0'},
      {watermarkChecksum:' 65'}, {watermarkChecksum:'00065'}, {watermarkChecksum:Infinity}
    ]) {
      const bad={...good,...patch},before=JSON.stringify(bad);
      assert.equal(engine.verifyVaultIntegrity(bad).valid,false,JSON.stringify(patch));
      assert.equal(JSON.stringify(bad),before);
    }
    for(const bad of [null,undefined,{},'garbage']) {
      assert.equal(engine.verifyVaultIntegrity(bad).valid,false);
      assert.equal(engine.generateVaultAuditReport(bad,'en').vaultEnvelope.integrityPassed,false);
    }
  });
  test(`${runtime}: checksum is not authentication (collisions remain explicitly possible)`,()=>{
    const original=legacy('AB'),collision={...original,cipherPayload:Buffer.from('BA').toString('base64')};
    assert.equal(engine.verifyVaultIntegrity(collision).valid,true,'Additive checksum is not tamper-proof');
    const report=engine.generateVaultAuditReport(original,'en');
    assert.match(report.statusLabel,/Not Authenticated/);
    assert.doesNotMatch(report.statusLabel,/AES|HMAC|Encrypted/);
  });
}
