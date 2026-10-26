'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {scan,parseLiteral,markdown,sourceFiles}=require('../../../tools/i18n/inventory/index.cjs');
const W='android/app/src/main/assets/web/';
const files={
 [W+'js/global_i18n_registry.js']:'var SUPPORTED_LOCALES=[{code:"en"},{code:"ar"},{code:"fr"}]; var MASTER_EN={nav_timer:"Timer"}; var MASTER_AR={nav_timer:"المؤقت"};',
 [W+'locale_premium_v22.js']:'const keys=Object.freeze(["start","pause"]); const rows={en:["Start","Pause"],fr:["Démarrer","Pause"]};',
 [W+'quick_training.js']:'const QUICK_KEYS=["work","rest"];const QUICK_TRANSLATIONS={en:["Work","Rest"]}; Object.assign(QUICK_TRANSLATIONS,{fr:["Travail","Repos"]});',
 [W+'index.html']:'<button data-df22-i18n="start">Start</button><button>Untranslated</button><input placeholder="Find notes">',
 'assets/i18n/df99_reviewed_packs.json':JSON.stringify({fr:{tasks:{add:'Nouvelle tâche'}}}),
 'android/app/src/main/java/com/zenstudy/focus/MainActivity.java':'label.setText("Focus now"); foo(R.string.app_name);'
};
test('literal parser never executes arbitrary expressions',()=>{assert.deepEqual([...parseLiteral('["a",2,{b:true,}]')],[ 'a',2,Object.assign(Object.create(null),{b:true})]);assert.throws(()=>parseLiteral('(function(){throw Error("executed")})()'));assert.throws(()=>parseLiteral('{__proto__:1}'));});
test('records missing locale vs native resource vs hardcoded with line anchors',()=>{const r=scan(files);
 assert.ok(r.KEYS.includes('premium:start'));assert.ok(r.KEYS.includes('quick:rest'));assert.ok(r.KEYS.includes('reviewed:tasks.add'));
 assert.ok(r.MISSING_KEYS_BY_LANGUAGE.ar.includes('premium:start'));
 assert.ok(r.HARDCODED_LABELS.some(x=>x.text==='Untranslated'&&x.file.endsWith('index.html')));
 assert.ok(r.HARDCODED_LABELS.some(x=>x.type==='native-java-literal'));
 assert.ok(r.NATIVE_ANDROID_GAPS.some(x=>x.key==='native:app_name'));
 assert.ok(!r.META.locales.includes('he'));assert.ok(r.FALLBACK_COUNT>0);
 assert.match(markdown(r),/not proof that the runtime selected English/);
});
test('deterministic inventory, no fallback counted as translated',()=>{
 const a=scan(files),b=scan(files);assert.deepEqual(a,b);
 assert.equal(a.COVERAGE_BY_SCREEN.ar.timer.translated,0);
 assert.equal(a.COVERAGE_BY_SCREEN.fr.quick_training.translated,2);
});
test('english fallback (including Latin digit strings) is flagged and excluded from translated',()=>{
 const mock={...files,
  [W+'quick_training.js']:'const QUICK_KEYS=["work","rest","timerTag"];const QUICK_TRANSLATIONS={en:["Work","Rest","Intervals 20/10"],fr:["Travail","Reste","Intervals 20/10"],de:["Arbeit","Pause","Intervalle 20/10"]};'
 };
 const r=scan(mock);
 assert.ok(r.ENGLISH_IDENTICAL_CANDIDATES.fr.includes('quick:timerTag'));
 assert.equal(r.COVERAGE_BY_SCREEN.fr.quick_training.translated,2,
   'english-identical Latin digit fallback must not count as a translation');
 assert.equal(r.COVERAGE_BY_SCREEN.fr.quick_training.english_identical,1);
 assert.equal(r.COVERAGE_BY_SCREEN.fr.quick_training.total,3);
 assert.ok(!r.MISSING_KEYS_BY_LANGUAGE.fr.includes('quick:timerTag'),
   'identical stays flagged as review candidate, not silently missing');
 assert.equal(r.COVERAGE_BY_SCREEN.fr.quick_training.missing,0);
});
test('checked-in baseline keys cannot silently disappear',()=>{
 const baseline=path.resolve(__dirname,'baseline_keys.json');if(!fs.existsSync(baseline))return;
 const repo=path.resolve(__dirname,'../../..');const current=new Set(scan(sourceFiles(repo)).KEYS);
 const lost=JSON.parse(fs.readFileSync(baseline,'utf8')).filter(k=>!current.has(k));
 assert.deepEqual(lost,[], 'removed localization keys: '+lost.join(', '));
});

test('official 99-language app catalog takes precedence over the legacy 100-language registry',()=>{
 const mock={...files,
  [W+'app.js']:'const LANG_CATALOG = [{code:"en"},{code:"ar"},{code:"de"}]; const DICT = {};',
  [W+'js/global_i18n_registry.js']:'var SUPPORTED_LOCALES=[{code:"en"},{code:"ar"},{code:"de"},{code:"ms"}]; var MASTER_EN={nav_timer:"Timer"}; var MASTER_AR={nav_timer:"المؤقت"};'
 };
 const scanned=scan(mock);
 assert.deepEqual(scanned.META.locales,['ar','de','en']);
 assert.equal(scanned.META.locales.includes('ms'),false);
});
