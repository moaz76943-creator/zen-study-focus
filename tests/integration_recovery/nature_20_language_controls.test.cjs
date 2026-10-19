'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const locales=['en','ar','es','zh','hi','fr','de','ru','pt','ja','id','tr','ko','vi','it','bn','ur','fa','pl','nl'];
function volumeDictionary(){
 const match=source.match(/const NATURE_VOLUME_LABELS = Object\.freeze\((\{[\s\S]*?\})\);/);
 assert.ok(match,'dedicated nature volume locale table must exist');
 return vm.runInNewContext('('+match[1]+')');
}
test('all 20 languages have explicit non-empty volume and slider labels',()=>{
 const rows=volumeDictionary();
 assert.deepEqual(Object.keys(rows).sort(),locales.slice().sort());
 for(const lang of locales)assert.ok(typeof rows[lang]==='string'&&rows[lang].trim().length>=2,lang);
});
test('nature tiles use their current language and avoid English-only accessibility text',()=>{
 assert.match(source,/const volumeLabel = NATURE_VOLUME_LABELS\[cfg\.lang\] \|\| NATURE_VOLUME_LABELS\.en/);
 assert.match(source,/escapeHtmlText\(volumeLabel\)/);
 assert.match(source,/escapeHtmlText\(volumeLabel \+ ': ' \+ sName\)/);
 assert.doesNotMatch(source,/cfg\.lang === 'ar' \? 'مستوى الصوت' : 'Volume'/);
 assert.doesNotMatch(source,/cfg\.lang === 'ar' \? 'مستوى صوت ' : 'Volume for '/);
});
