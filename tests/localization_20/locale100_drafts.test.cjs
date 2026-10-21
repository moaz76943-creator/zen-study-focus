'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const draft=require('../../tools/localization_100/drafts.cjs');
const guard=require('../../tools/localization_100/guard.cjs');
const source={
 'analytics.dictionary':{analyticsTitle:'Recorded analytics',sessions:'Sessions',avg:'Average session',dateRange:'From {from} to {to}',export:'Export CSV'},
 'core.navigation':{navTimer:'Timer',navTasks:'Tasks'}
};
const sample=()=>({
 schema_version:1,locale:'sw',status:'DRAFT_TRANSLATION_NEEDS_NATIVE_REVIEW',
 inventorySha256:guard.inventoryHash(source),
 strings:{'analytics.dictionary':{analyticsTitle:'Takwimu zilizorekodiwa',sessions:'Vipindi',dateRange:'Kuanzia {from} hadi {to}'},
 'core.navigation':{navTimer:'Kipima muda'}}
});
test('draft records real progress but can NEVER mean approved or selectable',()=>{
 const r=draft.validateDraft(sample(),source);
 assert.equal(r.valid,true);
 assert.equal(r.readyForRuntime,false);
 assert.equal(r.humanReview,'NOT_TESTED');
 assert.equal(r.translated,4);
 assert.equal(r.total,7);
 assert.equal(r.missing,3);
 assert.equal(r.byCatalog['analytics.dictionary'].translated,3);
 assert.equal(r.byCatalog['core.navigation'].missing,1);
});
test('draft rejects invented locale, forbidden language, stale English inventory, and bogus approval',()=>{
 const s=sample();
 for(const code of ['he','iw','xx','en']){s.locale=code;assert.equal(draft.validateDraft(s,source).valid,false,code);}
 s.locale='sw';s.inventorySha256='stale';assert.equal(draft.validateDraft(s,source).valid,false);
 s.inventorySha256=guard.inventoryHash(source);s.status='APPROVED';assert.equal(draft.validateDraft(s,source).valid,false);
});
test('draft rejects unverified copied English, lost interpolation, unsafe HTML, Eastern digits, bidi, and ghost keys',()=>{
 const s=sample();
 s.strings['core.navigation'].navTimer='Timer';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('IDENTICAL')));
 s.strings['core.navigation'].navTimer='Kipima muda';
 s.strings['analytics.dictionary'].dateRange='Kuanzia {from}';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('PLACEHOLDER')));
 s.strings['analytics.dictionary'].dateRange='Kuanzia {from} hadi {to}';
 s.strings['analytics.dictionary'].sessions='Vipindi ١٢';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('NON_WESTERN')));
 s.strings['analytics.dictionary'].sessions='Vipindi <script>';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('UNREVIEWED_HTML')));
 s.strings['analytics.dictionary'].sessions='Vipindi\u202e';assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('CONTROL_CHAR')));
 s.strings['analytics.dictionary'].sessions='Vipindi';s.strings['analytics.dictionary'].ghost='xxx';
 assert.ok(draft.validateDraft(s,source).errors.some(x=>x.includes('EXTRA_KEY')));
});
test('the checked-in Swahili UI draft is valid structurally, remains incomplete and unapproved',()=>{
 const real=require('../../tools/localization_100/drafts/sw.json');
 const actual=guard.sourceInventory(),r=draft.validateDraft(real,actual);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.ok(r.translated>=25,'material initial reviewed-language working draft');
 assert.ok(r.missing>0,'an incomplete pack cannot pass as a complete translation');
 assert.equal(r.readyForRuntime,false);
 assert.equal(r.humanReview,'NOT_TESTED');
 assert.equal(guard.resolve('sw').selectable,false);
});

test('UI label icons and exported file format markers must survive draft translation',()=>{
 const src={'core.sounds':{stop:'⏹ Stop'},'analytics.dictionary':{export:'Export CSV'}};
 const p={schema_version:1,locale:'sw',status:draft.DRAFT_STATUS,inventorySha256:guard.inventoryHash(src),
  strings:{'core.sounds':{stop:'Simamisha'},'analytics.dictionary':{export:'Hamisha faili'}}};
 let r=draft.validateDraft(p,src);
 assert.ok(r.errors.some(x=>x.includes('ICON_MISMATCH')));
 assert.ok(r.errors.some(x=>x.includes('FORMAT_MARKER_MISMATCH')));
 p.strings['core.sounds'].stop='⏹ Simamisha';
 p.strings['analytics.dictionary'].export='Hamisha CSV';
 assert.equal(draft.validateDraft(p,src).valid,true);
});

test('translator worksheet lists every key and every missing string without English filler or fake approval',()=>{
 const w=draft.reviewWorksheet(sample(),source);
 assert.equal(w.locale,'sw');
 assert.equal(w.total,7);
 assert.equal(w.translated,4);
 assert.equal(w.items.length,7);
 assert.equal(w.items.find(x=>x.key==='avg').candidate,null);
 assert.equal(w.items.find(x=>x.key==='dateRange').english,'From {from} to {to}');
 assert.equal(w.items.find(x=>x.key==='dateRange').candidate,'Kuanzia {from} hadi {to}');
 assert.ok(w.items.every(x=>x.humanReview==='NOT_TESTED'));
 assert.equal(w.approvedForRuntime,false);
});

test('admission CLI loads real partial drafts without a circular initialization failure',()=>{
 const {execFileSync}=require('node:child_process');
 const node=process.execPath;
 const stdout=execFileSync(node,['tools/localization_100/guard.cjs','--check'],{cwd:require('node:path').resolve(__dirname,'../..'),encoding:'utf8',timeout:12000});
 const report=JSON.parse(stdout);
 assert.equal(report.ok,true,JSON.stringify(report.errors));
 assert.equal(report.draftCandidates,2);
 assert.ok(report.candidateStrings>=25);
 assert.equal(report.releaseApproved,false);
});

test('Romanian draft is a second independent structurally safe but non-activated locale',()=>{
 const ro=require('../../tools/localization_100/drafts/ro.json');
 const real=guard.sourceInventory(),result=draft.validateDraft(ro,real);
 assert.equal(result.valid,true,JSON.stringify(result.errors));
 assert.equal(result.locale,'ro');
 assert.equal(result.readyForRuntime,false);
 assert.ok(result.translated>=70);
 assert.ok(result.missing>0);
 assert.equal(guard.resolve('ro-RO').selectable,false);
 const catalog=draft.reportDrafts(real);
 assert.equal(catalog.candidateCount,2);
 assert.deepEqual(catalog.languages.map(x=>x.locale).sort(),['ro','sw']);
 assert.equal(catalog.activationAllowed,false);
});

test('source-identical Romanian words need documented linguistic review, not an invented synonym',()=>{
 const p=sample();
 p.strings['core.navigation'].navTimer='Timer';
 p.identicalSourceCandidates={'core.navigation.navTimer':'Loanword candidate; native context review required'};
 const r=draft.validateDraft(p,source);
 assert.equal(r.valid,true,JSON.stringify(r.errors));
 assert.ok(r.warnings.some(x=>x.includes('IDENTICAL_SOURCE_NEEDS_REVIEW')));
 assert.equal(r.readyForRuntime,false);
 const unsafe=sample();unsafe.identicalSourceCandidates={'core.navigation.fake':'approved'};
 assert.equal(draft.validateDraft(unsafe,source).valid,false);
});
