'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const start=src.indexOf('const LANG_CATALOG = [');
const end=src.indexOf('const DICT = {',start);
assert.ok(start>=0&&end>start,'Runtime language catalog found');
const catalog=vm.runInNewContext(src.slice(start,end)+';LANG_CATALOG',Object.create(null));
test('runtime language catalog preserves 99 languages without he/iw',()=>{
 assert.equal(catalog.length,99);
 assert.equal(new Set(catalog.map(x=>x.code)).size,99);
 assert.ok(!catalog.some(x=>['he','iw'].includes(x.code)));
});
test('Kurmanji written in Latin letters is LTR and does not affect RTL scripts',()=>{
 assert.equal(catalog.find(x=>x.code==='ku').nativeName,'Kurdî');
 assert.equal(catalog.find(x=>x.code==='ku').dir,'ltr');
 for(const code of ['ar','fa','ur','ps','yi'])assert.equal(catalog.find(x=>x.code===code).dir,'rtl',code);
});
