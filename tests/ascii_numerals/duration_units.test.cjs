'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../android/app/src/main/assets/web/app.js'),'utf8');
const code=app.slice(app.indexOf('function formatDurationUnit('),app.indexOf('// Only explicitly marked numeric inputs'));
function load(intl=Intl){return vm.runInNewContext(code+';formatDurationUnit;',{Intl:intl,cfg:{lang:'ar'},toWest:s=>String(s).replace(/[\u0660-\u0669]/g,c=>c.charCodeAt(0)-0x660).replace(/[\u06f0-\u06f9]/g,c=>c.charCodeAt(0)-0x6f0)});}
const languages='en ar es zh hi fr de ru pt ja id tr ko vi it bn ur fa pl nl'.split(' ');
test('DF-008/060 generated duration units use selected locale and ASCII numerals',()=>{
 const format=load();
 for(const lang of languages)for(const unit of ['minute','second']){
  const text=format(45,unit,lang);assert.ok(text.includes('45'),lang);assert.doesNotMatch(text,/[\u0660-\u0669\u06f0-\u06f9]/u);
 }
 assert.equal(format(1,'minute','en'),'1 minute');assert.equal(format(2,'minute','en'),'2 minutes');
 assert.match(format(45,'second','ar'),/ثانية/);assert.match(format(5,'minute','ar'),/دقائق/);
 assert.equal(format(NaN,'minute','ar'),'');
});
test('DF-062 older WebView unit-format failure keeps localized duration fallback and digits',()=>{
 const format=load({NumberFormat:class{constructor(){throw Error('Unsupported unit format');}}});
 for(const lang of languages){const text=format(45,'second',lang);assert.ok(text.includes('45'));if(lang!=='en')assert.doesNotMatch(text,/seconds/);}
 assert.equal(format(3,'second','ar'),'3 ثوانٍ');
});
