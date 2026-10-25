'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const packs=JSON.parse(fs.readFileSync('assets/i18n/df99_reviewed_packs.json','utf8'));
const langs=['gl','bs','sq','be','mt'];
const keys={
  tasks:'title subtitle add project today search all board matrix trash calendar undo redo empty task desc due time cat priority estimate repeat group notes proj none save cancel focus edit done resume archive remove restore addCheck check sub study sport review exam todo doing completed archived low medium high urgent daily weekly monthly never allCategories estimated actual overdue do schedule delegate eliminate invalid notConnected'.split(' '),
  goals:'kicker heading desc edit modal hint save invalid noGoal minute done today week weekTarget weekInvalid'.split(' '),
  analytics:'title activity period start end minutes sessions average streak noData goal noGoals tasks chart year export details'.split(' '),
  analyticsDomain:'study read work sport'.split(' ')
};
function translator() {
 const c={window:{},console};vm.createContext(c);
 vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_multiscreen_i18n.js','utf8'),c);
 vm.runInContext(fs.readFileSync('android/app/src/main/assets/web/js/df99_reviewed_packs.js','utf8'),c);
 return c.window.DF99Locale.t;
}
test('31: five languages have 64 tasks, 15 goals, 17 analytics and 4 activity labels',()=>{
 for(const code of langs) for(const [f,expected] of Object.entries(keys)){
  const dic=packs[code]?.[f];assert.ok(dic,code+'/'+f+' missing');
  assert.deepEqual(Object.keys(dic).sort(),expected.slice().sort(),code+'/'+f);
  assert.ok(Object.values(dic).every(v=>typeof v==='string'&&v.trim()),code+'/'+f+' blank');
 }
});
test('31: all 500 translated strings are available through the offline runtime',()=>{
 const t=translator();let count=0;
 for(const code of langs)for(const f of Object.keys(keys))
 for(const [k,v] of Object.entries(packs[code][f])){assert.equal(t(code,f,k,'fallback'),v);count++;}
 assert.equal(count,500);
});
test('31: previous 5360 strings persist; unknown languages never appear native',()=>{
 const n=Object.values(packs).reduce((a,p)=>a+Object.values(p).reduce((b,d)=>b+Object.keys(d).length,0),0);
 assert.ok(n>=5860,'Expected >=5860 translations; found '+n);
 for(const code of langs)assert.equal(Object.keys(packs[code].notes).length,36,'Notes lost for '+code);
 for(const code of ['he','iw'])assert.equal(packs[code],undefined);
});
test('31: untranslated labels retain their safe fallback',()=>{
 const t=translator();
 for(const code of langs)assert.equal(t(code,'tasks','not_a_real_key','fallback'),'fallback');
 for(const code of ['he','iw','zz'])assert.equal(t(code,'analytics','title','fallback'),'fallback');
});
test('31: selected translated actions preserve their meaning',()=>{
 assert.equal(packs.gl.tasks.save,'Gardar');
 assert.equal(packs.bs.tasks.cancel,'Otkaži');
 assert.equal(packs.sq.tasks.restore,'Rikthe');
 assert.equal(packs.be.tasks.save,'Захаваць');
 assert.equal(packs.mt.analytics.export,'Esporta CSV');
});
